const { successResponse, errorResponse } = require('../utils/response');
const Farmer = require('../models/Farmer');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const bcrypt = require('bcrypt');

const requestOtp = async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return errorResponse(res, 'Phone number is required', 'VALIDATION_ERROR', 400);
  }

  const farmer = await Farmer.findOne({ phoneNumber });
  if (!farmer) {
    return errorResponse(res, 'Farmer not registered', 'FARMER_NOT_REGISTERED', 404);
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Log for demo purposes
  console.log(`[DEMO] Generated OTP for ${phoneNumber}: ${otp}`);

  // Hash OTP and store
  const hashedOtp = await bcrypt.hash(otp, 10);

  // Remove existing OTPs for this number
  await OTP.deleteMany({ phoneNumber });

  await OTP.create({
    phoneNumber,
    otp: hashedOtp,
  });

  return successResponse(res, 'OTP sent successfully'); // Do NOT return OTP
};

const verifyOtp = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    return errorResponse(res, 'Phone number and OTP are required', 'VALIDATION_ERROR', 400);
  }

  const otpRecord = await OTP.findOne({ phoneNumber });
  if (!otpRecord) {
    return errorResponse(res, 'Invalid or expired OTP', 'INVALID_OTP', 400);
  }

  const isMatch = await bcrypt.compare(otp.toString(), otpRecord.otp);
  if (!isMatch) {
    return errorResponse(res, 'Invalid OTP', 'INVALID_OTP', 400);
  }

  const farmer = await Farmer.findOne({ phoneNumber });
  if (!farmer) {
    return errorResponse(res, 'Farmer not registered', 'FARMER_NOT_REGISTERED', 404);
  }

  // Generate JWT
  const token = jwt.sign(
    { farmerId: farmer._id, role: 'farmer' },
    env.jwtSecret,
    { expiresIn: '24h' }
  );

  // Delete OTP after single use
  await OTP.deleteOne({ _id: otpRecord._id });

  return successResponse(res, 'Authentication successful', { token });
};

module.exports = {
  requestOtp,
  verifyOtp,
};
