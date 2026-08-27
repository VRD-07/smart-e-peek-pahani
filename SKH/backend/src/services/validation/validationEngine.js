const { validateIdentity, validateRequiredFields, validateTimestamp } = require('./ruleValidator');
const { validateLocation } = require('./locationValidator');
const { validateImage } = require('./imageValidator');
const { validateCrop } = require('./cropValidator');
const { validateArea } = require('./areaValidator');
const { sumOtherActiveArea } = require('./areaAllocation');
const { getVisionProvider } = require('../ai/visionFactory');
const ValidationResult = require('../../models/ValidationResult');
const Submission = require('../../models/Submission');

const runValidationEngine = async (submission, farmer, gat) => {
  // 1. Identity
  const identityCheck = validateIdentity(farmer, null);

  // 2. Required fields
  const requiredFieldsCheck = validateRequiredFields(submission);

  // 3. Gat existence
  const gatCheck = gat ? { status: 'PASS' } : { status: 'FAIL', reason: 'Gat not found' };

  // 4. & 5. Location and Gat geofence
  let locationCheck = { status: 'FAIL', insideGat: false };
  if (gat) {
    locationCheck = validateLocation(submission.location, gat.boundary);
  }

  // 6. & 7. Image validation and quality
  const imageCheck = validateImage(submission.image);

  // 8. Crop verification
  let cropCheck = { status: 'REVIEW', declaredCrop: submission.crop?.declaredCrop };
  if (imageCheck.status === 'PASS') {
    try {
      const aiResult = await getVisionProvider().classify(submission.image);

      if (process.env.NODE_ENV !== 'production') {
        console.log('=== GEMINI VISION EVIDENCE ===');
        console.log('detectedCrop:', aiResult ? aiResult.detectedCrop : null);
        console.log('confidence:', aiResult ? aiResult.confidence : null);
        console.log('error:', aiResult ? (aiResult.error || null) : null);
        console.log('==============================');
      }

      cropCheck = validateCrop(submission.crop?.declaredCrop, aiResult);
    } catch (error) {
      console.error('AI provider failed:', error);
      cropCheck = {
        status: 'REVIEW',
        declaredCrop: submission.crop?.declaredCrop,
        detectedCrop: null,
        confidence: 0,
        reason: 'AI service unavailable or failed'
      };
    }
  }

  // 9. Timestamp consistency
  const timestampCheck = validateTimestamp(submission.location?.receivedAt);

  // 10. Area allocation.
  //
  // Its own check, deliberately — not folded into the Gat or required-fields
  // check. "The area you claimed does not fit in your parcel" is a different
  // finding from "we cannot place you inside your parcel", it has its own reason
  // code, and an officer needs to be able to tell them apart in the dashboard.
  //
  // A database failure here must not take the whole validation down: without this
  // guard a slow query would turn every submission INVALID for a reason that has
  // nothing to do with the filing.
  let areaCheck = { status: 'SKIPPED', reason: 'Area check was not run' };
  try {
    const otherActiveArea = await sumOtherActiveArea({
      gatId: submission.gatId,
      season: submission.season,
      cropYear: submission.cropYear,
      excludeSubmissionId: submission._id,
    });

    areaCheck = validateArea({
      entryArea: submission.registeredArea,
      otherActiveArea,
      registeredArea: gat?.registeredArea,
    });
  } catch (error) {
    console.error('Area allocation lookup failed:', error);
    areaCheck = {
      status: 'REVIEW',
      reasonCode: null,
      reason: 'Could not total the existing crop entries for this Gat',
    };
  }

  // 11. Final rule evaluation
  const mandatoryChecks = [
    identityCheck,
    requiredFieldsCheck,
    gatCheck,
    locationCheck,
    imageCheck,
    timestampCheck,
    // Included so an area REVIEW routes the submission to review. It can never
    // FAIL, so it cannot reject a filing on arithmetic alone.
    areaCheck
  ];

  const failed = mandatoryChecks.some(check => check.status === 'FAIL') || cropCheck.status === 'FAIL';
  let overallStatus = 'PASS';

  if (failed) {
    overallStatus = 'FAIL';
  } else if (cropCheck.status === 'REVIEW' || mandatoryChecks.some(check => check.status === 'REVIEW')) {
    overallStatus = 'REVIEW';
  }

  // Collect reasons
  const reasons = [];
  [identityCheck, requiredFieldsCheck, gatCheck, locationCheck, imageCheck, cropCheck, timestampCheck, areaCheck].forEach(check => {
    // A skipped check explains why it did not run. That is worth storing on the
    // check itself, but it is not a reason for the outcome, so it stays out of
    // the list an officer reads as "why this filing was flagged".
    if (check.reason && check.status !== 'SKIPPED') reasons.push(check.reason);
  });

  const resultData = {
    submissionId: submission._id,
    overallStatus,
    checks: {
      identity: identityCheck,
      requiredFields: requiredFieldsCheck,
      location: locationCheck,
      gat: gatCheck,
      image: imageCheck,
      crop: cropCheck,
      timestamp: timestampCheck,
      area: areaCheck
    },
    reasons
  };

  const validationResult = await ValidationResult.create(resultData);

  // Map overallStatus to Submission status
  let submissionStatus = 'PENDING_VALIDATION';
  if (overallStatus === 'PASS') submissionStatus = 'VALID';
  if (overallStatus === 'FAIL') submissionStatus = 'INVALID';
  if (overallStatus === 'REVIEW') submissionStatus = 'REVIEW';

  submission.status = submissionStatus;
  submission.validationResultId = validationResult._id;
  await submission.save();

  return validationResult;
};

module.exports = { runValidationEngine };
