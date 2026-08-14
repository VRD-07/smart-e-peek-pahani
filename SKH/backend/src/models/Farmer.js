const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  preferredLanguage: {
    type: String,
    enum: ['mr', 'hi', 'en'],
    default: 'mr',
  },
  associatedGats: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gat',
  }],
}, {
  timestamps: true,
});

const Farmer = mongoose.model('Farmer', farmerSchema);
module.exports = Farmer;
