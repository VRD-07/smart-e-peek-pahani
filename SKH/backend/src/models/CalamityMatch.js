const mongoose = require('mongoose');

/**
 * A VALID submission whose Gat intersects a declared calamity zone.
 *
 * Kept as its own collection rather than a flag on Submission: one field can be
 * covered by more than one declaration (a flood and a later hailstorm), and each
 * match needs its own provenance — which zone, when it was matched, and whether
 * the farmer was told.
 *
 * A match records eligibility to be *assessed*, not an approved payout. The
 * final decision stays with the revenue officer.
 */
const calamityMatchSchema = new mongoose.Schema({
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true,
    index: true,
  },
  calamityZoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CalamityZone',
    required: true,
    index: true,
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true,
    index: true,
  },
  gatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gat',
    required: true,
  },
  // Snapshotted so the officer view stays readable even if the zone is edited
  // or the submission's crop text is later corrected.
  declaredCrop: {
    type: String,
  },
  matchedAt: {
    type: Date,
    default: Date.now,
  },
  // Whether the farmer has been told. Kept alongside NotificationLog because
  // that collection is keyed by phone number and message type, while the officer
  // dashboard needs the answer per match.
  farmerNotified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// One row per (submission, zone) so re-running the matcher is idempotent.
calamityMatchSchema.index({ submissionId: 1, calamityZoneId: 1 }, { unique: true });

const CalamityMatch = mongoose.model('CalamityMatch', calamityMatchSchema);
module.exports = CalamityMatch;
