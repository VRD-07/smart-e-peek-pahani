const Submission = require('../../models/Submission');
const Farmer = require('../../models/Farmer');
const Gat = require('../../models/Gat');
const { runValidationEngine } = require('./validationEngine');

/**
 * Internal service wrapper for the Validation Engine.
 *
 * @param {string} submissionId - The ObjectId of the submission to validate
 * @returns {Promise<Object>} The updated submission document
 */
async function validateSubmission(submissionId) {
  const submission = await Submission.findById(submissionId);
  if (!submission) {
    throw new Error('Submission not found');
  }

  // Step 9 - Idempotency: Protect against duplicate runs
  if (submission.validationResultId && submission.status !== 'PENDING_VALIDATION') {
    return submission; // Already validated
  }

  const farmer = await Farmer.findById(submission.farmerId);
  if (!farmer) {
    throw new Error('Farmer not found');
  }

  let gat = null;
  if (submission.gatId) {
    gat = await Gat.findById(submission.gatId);
  }

  try {
    await runValidationEngine(submission, farmer, gat);
  } catch (error) {
    console.error('Validation Engine failed unexpectedly:', error);
    // Do not bubble up exceptions to prevent crashing the webhook
  }

  // Return the updated submission with the result
  return await Submission.findById(submissionId).populate('validationResultId');
}

module.exports = { validateSubmission };
