const mongoose = require('mongoose');

const gatSchema = new mongoose.Schema({
  gatNumber: {
    type: String,
    required: true,
    index: true,
  },
  village: {
    type: String,
    required: true,
  },
  taluka: {
    type: String,
  },
  district: {
    type: String,
    required: true,
  },
  division: {
    type: String,
  },
  cropTypes: [{
    type: String,
  }],
  // Total area of the parcel on the 7/12 record, in hectares.
  //
  // This is the figure the area overallocation check in
  // services/validation/areaValidator.js sums crop entries against, so it is the
  // registered area from the land record rather than anything measured off the
  // boundary polygon — the polygon is a demo trace, and computing an area from it
  // would quietly turn a survey document into a geometry estimate.
  //
  // Optional, because Gats seeded before Phase 7 do not carry it. Where it is
  // absent the area check reports SKIPPED rather than PASS, so a Gat with no
  // registered area never looks like one that passed the check.
  registeredArea: {
    type: Number,
    min: 0,
  },
  boundary: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true
    },
    coordinates: {
      type: [[[Number]]],
      required: true
    }
  },
  center: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
}, {
  timestamps: true,
});

gatSchema.index({ boundary: '2dsphere' });

const Gat = mongoose.model('Gat', gatSchema);
module.exports = Gat;
