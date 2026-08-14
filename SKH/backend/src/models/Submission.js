const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  clientSubmissionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true,
  },
  source: {
    type: String,
    enum: ['WEB', 'WHATSAPP'],
    required: true,
  },
  gatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gat',
    required: true,
  },
  crop: {
    declaredCrop: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      default: 'en',
    },
  },
  location: {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    source: {
      type: String,
      enum: ['WHATSAPP', 'WEB_GPS', 'MANUAL'],
      required: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    accuracy: {
      type: Number,
    },
  },
  image: {
    url: String,
    mimeType: String,
    size: Number,
    capturedAt: Date,
    metadata: {
      exifPresent: Boolean,
      gpsPresent: Boolean,
      source: String,
    },
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_VALIDATION', 'VALID', 'INVALID', 'REVIEW', 'SYNC_PENDING', 'SYNCED'],
    default: 'PENDING_VALIDATION',
  },
  validationResultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ValidationResult',
  },
}, {
  timestamps: true,
});

const Submission = mongoose.model('Submission', submissionSchema);
module.exports = Submission;
