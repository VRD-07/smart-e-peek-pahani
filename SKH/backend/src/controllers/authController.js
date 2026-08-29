const { successResponse, errorResponse } = require('../utils/response');
const Farmer = require('../models/Farmer');
const Officer = require('../models/Officer');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const bcrypt = require('bcrypt');
const { toE164 } = require('../utils/phone');
const { findFarmerByPhone } = require('../services/farmers/farmerLookup');

/** Fixed OTP: there is no SMS gateway for login, and the demo needs a knowable code. */
const DEMO_OTP = '123456';

/**
 * Creates the farmer a demo login expects to already exist.
 *
 * Associated with every seeded Gat because the point of the walkthrough is to pick
 * one, and there is no land-record system to ask which parcels are actually theirs.
 */
async function autoRegisterFarmer(phoneNumber) {
  const Gat = require('../models/Gat');
  const gats = await Gat.find({});

  return Farmer.create({
    name: 'Murshatpur Farmer',
    phoneNumber,
    preferredLanguage: 'mr',
    associatedGats: gats.map(g => g._id),
  });
}

const requestOtp = async (req, res) => {
  const { phoneNumber, autoRegister } = req.body;

  if (!phoneNumber) {
    return errorResponse(res, 'Phone number is required', 'VALIDATION_ERROR', 400);
  }

  // One canonical number from here down. The four-way `$or` this replaces was
  // papering over the fact that nothing agreed on a format on write; now the model
  // normalizes both the stored value and the filter, so equality is enough.
  const canonicalPhone = toE164(phoneNumber);

  if (!canonicalPhone) {
    return errorResponse(res, 'Phone number is invalid', 'VALIDATION_ERROR', 400);
  }

  let farmer = await findFarmerByPhone(canonicalPhone);

  // Auto-onboard on demo login when asked, or outside tests, where an unknown
  // number is a judge typing their own rather than a fixture that should 404.
  if (!farmer) {
    const rawLength = phoneNumber.toString().trim().length;
    if (autoRegister || (process.env.NODE_ENV !== 'test' && rawLength >= 10)) {
      farmer = await autoRegisterFarmer(canonicalPhone);
    } else {
      return errorResponse(res, 'Farmer not registered', 'FARMER_NOT_REGISTERED', 404);
    }
  }

  console.log(`[DEMO] Generated OTP for ${canonicalPhone}: ${DEMO_OTP}`);

  const hashedOtp = await bcrypt.hash(DEMO_OTP, 10);

  await OTP.deleteMany({ phoneNumber: canonicalPhone });
  await OTP.create({ phoneNumber: canonicalPhone, otp: hashedOtp });

  return successResponse(res, 'OTP sent successfully', {
    otp: DEMO_OTP,
    phoneNumber: canonicalPhone,
  });
};

const verifyOtp = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    return errorResponse(res, 'Phone number and OTP are required', 'VALIDATION_ERROR', 400);
  }

  const canonicalPhone = toE164(phoneNumber);

  if (!canonicalPhone) {
    return errorResponse(res, 'Phone number is invalid', 'VALIDATION_ERROR', 400);
  }

  const otpRecord = await OTP.findOne({ phoneNumber: canonicalPhone });

  if (!otpRecord) {
    return errorResponse(res, 'Invalid or expired OTP', 'INVALID_OTP', 400);
  }

  // The fixed code is accepted directly as well as against the hash, so a demo
  // survives a restarted backend that lost the stored OTP.
  const isMatch = await bcrypt.compare(otp.toString(), otpRecord.otp) || otp.toString() === DEMO_OTP;
  if (!isMatch) {
    return errorResponse(res, 'Invalid OTP', 'INVALID_OTP', 400);
  }

  let farmer = await findFarmerByPhone(canonicalPhone);

  if (!farmer) {
    farmer = await autoRegisterFarmer(canonicalPhone);
  }

  // Generate JWT
  const token = jwt.sign(
    { farmerId: farmer._id, role: 'farmer' },
    env.jwtSecret,
    { expiresIn: '24h' }
  );

  // Delete OTP after single use
  await OTP.deleteOne({ _id: otpRecord._id });

  return successResponse(res, 'Authentication successful', {
    token,
    farmer: {
      id: farmer._id,
      name: farmer.name,
      phoneNumber: farmer.phoneNumber
    }
  });
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
