const mongoose = require('mongoose');
const { CALAMITY_TYPES } = require('../services/relief/constants');

// Administrative calamity declarations, not forecasts. A zone is only ever
// created from a declaration that has already been made by the revenue or
// disaster-management authority — nothing here predicts weather, crop loss or
// risk. In production these records would arrive from the state's declaration
// feed, which requires a state MoU; the demo seeds clearly-labelled samples.
const calamityZoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  calamityType: {
    type: String,
    enum: Object.values(CALAMITY_TYPES),
    required: true,
  },
  // The date the authority declared the calamity. Submissions filed after this
  // date are not matched — relief is assessed against the record that already
  // existed when the calamity struck.
  declaredDate: {
    type: Date,
    required: true,
  },
  boundary: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true,
    },
    coordinates: {
      type: [[[Number]]],
      required: true,
    },
  },
  // Empty means every crop inside the zone is in scope. A non-empty list narrows
  // matching to the crops named in the declaration.
  affectedCropTypes: [{
    type: String,
  }],
  district: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Provenance. Used by the demo seed to mark itself as sample data.
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

calamityZoneSchema.index({ boundary: '2dsphere' });
calamityZoneSchema.index({ isActive: 1, declaredDate: -1 });

const CalamityZone = mongoose.model('CalamityZone', calamityZoneSchema);
module.exports = CalamityZone;
