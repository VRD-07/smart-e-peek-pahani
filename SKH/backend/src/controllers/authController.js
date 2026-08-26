const { successResponse, errorResponse } = require('../utils/response');
const Farmer = require('../models/Farmer');
const Officer = require('../models/Officer');
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

/**
 * Officer login for the global dashboard.
 * Officers authenticate with an employee ID + password rather than the farmer
 * OTP flow, but receive the same JWT shape so `protect` is reused unchanged.
 */
const officerLogin = async (req, res) => {
  const { employeeId, password } = req.body;

  if (!employeeId || !password) {
    return errorResponse(res, 'Employee ID and password are required', 'VALIDATION_ERROR', 400);
  }

  const officer = await Officer.findOne({ employeeId });

  // Same message for unknown officer and wrong password so the endpoint does
  // not confirm which employee IDs exist.
  if (!officer || !(await officer.verifyPassword(password))) {
    return errorResponse(res, 'Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  const token = jwt.sign(
    { officerId: officer._id, role: officer.role },
    env.jwtSecret,
    { expiresIn: '12h' }
  );

  return successResponse(res, 'Authentication successful', {
    token,
    officer: {
      name: officer.name,
      employeeId: officer.employeeId,
      jurisdiction: officer.jurisdiction,
    },
  });
};

module.exports = {
  requestOtp,
  verifyOtp,
  officerLogin,
};
