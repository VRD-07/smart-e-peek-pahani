const mongoose = require('mongoose');
const { SEASONS, PEEK_TYPES, WATER_SOURCES } = require('../services/survey/constants');

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
  // ---- Survey fields (Phase 7) ----
  //
  // These mirror the E-Peek Pahani form and are collected before the photo and
  // GPS step. All optional: submissions created before Phase 7 do not carry them,
  // and the area check reports SKIPPED rather than PASS when the figures it needs
  // are missing, so an absent field never reads as a satisfied one.
  season: {
    type: String,
    enum: Object.values(SEASONS),
  },
  // The agricultural year (July-June) this entry belongs to. Stored rather than
  // derived at query time because the overallocation sum groups on it, and a
  // filing made either side of the July boundary must stay in the bucket it was
  // filed into. See services/survey/constants.cropYear.
  cropYear: {
    type: Number,
  },
  peekType: {
    type: String,
    enum: Object.values(PEEK_TYPES),
  },
  // Area under this one crop entry, in hectares — not the parcel total, which
  // lives on the Gat. Several entries can share a Gat in the same season, and
  // their sum is what the area check measures against the Gat's registered area.
  registeredArea: {
    type: Number,
    min: 0,
  },
  waterSource: {
    type: String,
    enum: Object.values(WATER_SOURCES),
  },
  // Free text, only meaningful when waterSource is OTHER. Kept unconstrained: the
  // point of an "other" branch is to record something the enum did not anticipate.
  waterSourceOther: {
    type: String,
  },
  sowingDate: {
    type: Date,
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
    // "पिकाचा वर्ग" — the class from services/crops/cropCatalogue.js. Derived from
    // the crop name rather than asked for separately, so the two cannot disagree.
    cropCategory: {
      type: String,
    },
    // How the free text or transcript resolved to the canonical crop name.
    // Recorded because a crop matched at 0.86 by edit distance and one typed
    // exactly are not equally certain, and an officer reviewing a mismatch is
    // entitled to know which happened.
    matchConfidence: {
      type: Number,
    },
    matchMethod: {
      type: String,
    },
    // What the farmer actually typed or said, before normalisation.
    declaredText: {
      type: String,
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

// Serves the area overallocation sum, which asks for every active crop entry on
// one Gat in one season. Without it that query is a collection scan on every
// single submission a farmer makes.
submissionSchema.index({ gatId: 1, season: 1, cropYear: 1, status: 1 });

const Submission = mongoose.model('Submission', submissionSchema);
module.exports = Submission;
