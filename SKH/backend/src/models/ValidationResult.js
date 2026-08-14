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
