const mongoose = require('mongoose');
const { phoneField } = require('../utils/phone');

const farmerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  // Always stored in E.164 ('+919876543210'), whichever channel the farmer
  // arrived through. `unique` only means anything if the format is settled: the
  // same handset written once as '9876543210' by the website and once as
  // 'whatsapp:+919876543210' by the bot would otherwise be two farmers.
  phoneNumber: phoneField({
    required: true,
    unique: true,
    index: true,
  }),
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
