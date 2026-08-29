const mongoose = require('mongoose');
const { phoneField } = require('../utils/phone');

const otpSchema = new mongoose.Schema({
  // E.164, matching Farmer — an OTP requested from the website must be findable
  // when verified, and the two requests need not spell the number the same way.
  phoneNumber: phoneField({
    required: true,
  }),
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // Expires after 5 minutes
  },
});

const OTP = mongoose.model('OTP', otpSchema);
module.exports = OTP;
