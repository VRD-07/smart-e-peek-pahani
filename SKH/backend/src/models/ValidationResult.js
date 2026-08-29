const mongoose = require('mongoose');

const validationResultSchema = new mongoose.Schema({
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true,
    index: true,
  },
  overallStatus: {
    type: String,
    enum: ['PASS', 'FAIL', 'REVIEW'],
    required: true,
  },
  checks: {
    identity: {
      status: { type: String, enum: ['PASS', 'FAIL', 'REVIEW'] },
    },
    requiredFields: {
      status: { type: String, enum: ['PASS', 'FAIL', 'REVIEW'] },
    },
    location: {
      status: { type: String, enum: ['PASS', 'FAIL', 'REVIEW'] },
      insideGat: Boolean,
      distanceFromBoundary: Number,
      // 'NEAR_BOUNDARY' when the point is inside the Gat but close enough to its
      // edge that GPS error could account for the difference. Deliberately not an
      // enum: a future code that outran the schema would throw here and take the
      // whole validation down with it.
      reasonCode: String,
      // The review band actually applied, in metres. Recorded because it is
      // capped by parcel size — without it, two near-boundary reviews on
      // differently-sized Gats are not comparable.
      reviewBufferMeters: Number,
      reason: String,
    },
    gat: {
      status: { type: String, enum: ['PASS', 'FAIL', 'REVIEW'] },
    },
    image: {
      status: { type: String, enum: ['PASS', 'FAIL', 'REVIEW'] },
      quality: String,
      validFormat: Boolean,
      sizeValid: Boolean,
    },
    crop: {
      status: { type: String, enum: ['PASS', 'FAIL', 'REVIEW'] },
      declaredCrop: String,
      detectedCrop: String,
      confidence: Number,
    },
    timestamp: {
      status: { type: String, enum: ['PASS', 'FAIL', 'REVIEW'] },
    },
    // Do the crop entries on this Gat still fit inside its registered area?
    //
    // SKIPPED is a real outcome here and not on the other checks: a submission
    // filed before Phase 7, or one against a Gat with no registered area on
    // record, has nothing to total. Recording that as SKIPPED rather than PASS
    // keeps "we checked and it fits" distinguishable from "we never checked".
    //
    // There is no FAIL: an over-sum routes to review, never to rejection.
    area: {
      status: { type: String, enum: ['PASS', 'REVIEW', 'SKIPPED'] },
      // Hectares claimed by this entry alone.
      entryArea: Number,
      // Hectares already claimed by other active entries on the same Gat, same
      // season, same crop year.
      otherActiveArea: Number,
      // The Gat's total registered area, as it stood when the check ran. Stored
      // because a later correction to the land record must not silently rewrite
      // the basis of a decision already taken.
      registeredArea: Number,
      claimedTotal: Number,
      remainingArea: Number,
      // 'AREA_OVERALLOCATION'. A bare String for the same reason the location
      // check's is: a code that outran the schema should not throw.
      reasonCode: String,
    },
  },
  reasons: [{
    type: String,
  }],
}, {
  timestamps: true,
});

const ValidationResult = mongoose.model('ValidationResult', validationResultSchema);
module.exports = ValidationResult;
