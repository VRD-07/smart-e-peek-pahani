const mongoose = require('mongoose');
const { STATES, LANGUAGES } = require('../services/whatsapp/constants');
const { SEASONS, PEEK_TYPES, WATER_SOURCES } = require('../services/survey/constants');
const { phoneField } = require('../utils/phone');

const whatsappSessionSchema = new mongoose.Schema({
  // E.164, not the raw 'whatsapp:+91...' Twilio sends, so a session can be
  // matched to its Farmer record by equality.
  phoneNumber: phoneField({
    required: true,
    index: true,
  }),
  // Derived from the flow's own state list rather than repeated here. The two
  // copies had already drifted once; adding the Phase 7 survey states by hand
  // would have been a second chance to.
  state: {
    type: String,
    enum: Object.values(STATES),
    default: STATES.START,
  },
  language: {
    type: String,
    enum: Object.values(LANGUAGES),
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
  },
  selectedGatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gat',
  },
  // Set only on the two-tier farm picker, when a farmer has more Gats than a
  // WhatsApp list can hold and chooses a village before a parcel.
  selectedVillage: {
    type: String,
  },
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
  },
  // ---- Survey answers in progress (Phase 7) ----
  //
  // The session is scratch space: these are copied onto the Submission when the
  // photo arrives and the filing is created. They live for 24 hours like the rest
  // of the session, so an abandoned half-answered form expires rather than
  // becoming a record.
  season: {
    type: String,
    enum: Object.values(SEASONS),
  },
  cropYear: {
    type: Number,
  },
  peekType: {
    type: String,
    enum: Object.values(PEEK_TYPES),
  },
  // Hectares, already converted from whatever unit the farmer typed.
  registeredArea: {
    type: Number,
    min: 0,
  },
  waterSource: {
    type: String,
    enum: Object.values(WATER_SOURCES),
  },
  waterSourceOther: {
    type: String,
  },
  sowingDate: {
    type: Date,
  },
  declaredCrop: {
    type: String,
  },
  cropCategory: {
    type: String,
  },
  // What the farmer typed or said before the matcher normalised it, and how
  // confidently it resolved. Carried onto the Submission so a review can see the
  // original words rather than only the canonical crop they became.
  declaredCropText: {
    type: String,
  },
  matchConfidence: {
    type: Number,
  },
  matchMethod: {
    type: String,
  },
  // Canonical crop names offered as a confirmation prompt when the free text was
  // ambiguous or matched several crops. Cleared once one is chosen.
  pendingCropCandidates: [{
    type: String,
  }],
  // ---- Boundary planting in progress ----
  plantingType: {
    type: String,
  },
  plantingLocationText: {
    type: String,
  },
  location: {
    latitude: Number,
    longitude: Number,
  },
  image: {
    url: String,
    mimeType: String,
    size: Number,
  },
  expiresAt: {
    type: Date,
    default: () => Date.now() + 24 * 60 * 60 * 1000, // Expires in 24 hours
  },
}, {
  timestamps: true,
});

whatsappSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const WhatsAppSession = mongoose.model('WhatsAppSession', whatsappSessionSchema);
module.exports = WhatsAppSession;
