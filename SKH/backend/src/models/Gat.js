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
  district: {
    type: String,
    required: true,
  },
  cropTypes: [{
    type: String,
  }],
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
