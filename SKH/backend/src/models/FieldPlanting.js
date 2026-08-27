const mongoose = require('mongoose');

/**
 * A tree or hedge planted on a field boundary.
 *
 * E-Peek Pahani records these alongside crops, and Phase 7 adds them because a
 * farmer who has planted along their बांध has done something worth having on
 * record — for horticulture schemes, for boundary disputes, for their own history.
 *
 * ---------------------------------------------------------------------------
 * This record is NOT validated, and that is deliberate.
 *
 * Crop filings go through the Deterministic Validation Gate: GPS inside the Gat
 * polygon by Turf.js, a photo, a Gemini crop match, a timestamp check. A boundary
 * planting goes through none of it. It carries no photo requirement, no polygon
 * containment check and no status field, because there is no entitlement attached
 * to it — nothing is approved, rejected or paid out on the strength of this row.
 * It is informational.
 *
 * The absence of a `status` field is the point. Adding one would invite a reader
 * to assume some check produced it, and every consumer of this collection should
 * be able to tell at a glance that nothing here has been verified. The location is
 * stored as "approximate" for the same reason: it is where the farmer says the
 * trees are.
 */
const fieldPlantingSchema = new mongoose.Schema({
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
    index: true,
  },
  // Free text, not an enum. There is no authoritative list of what a farmer may
  // plant on a boundary, and inventing one would mean rejecting आंबा because we
  // forgot to add it.
  plantingType: {
    type: String,
    required: true,
    trim: true,
  },
  count: {
    type: Number,
    min: 0,
  },
  // Where the farmer says the planting is — "उत्तरेकडील बांध", "along the east
  // edge", or a shared pin. Never checked against the Gat polygon.
  approximateLocation: {
    text: {
      type: String,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  source: {
    type: String,
    enum: ['WEB', 'WHATSAPP'],
    required: true,
  },
  language: {
    type: String,
  },
}, {
  timestamps: true,
});

// The only query this collection serves: one farmer's plantings on one parcel,
// newest first, for the farm action hub.
fieldPlantingSchema.index({ gatId: 1, createdAt: -1 });

const FieldPlanting = mongoose.model('FieldPlanting', fieldPlantingSchema);
module.exports = FieldPlanting;
