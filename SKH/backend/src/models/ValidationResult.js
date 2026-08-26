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
  },
  reasons: [{
    type: String,
  }],
}, {
  timestamps: true,
});

const ValidationResult = mongoose.model('ValidationResult', validationResultSchema);
module.exports = ValidationResult;
