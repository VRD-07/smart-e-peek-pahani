const { errorResponse } = require('../utils/response');
const env = require('../config/env');
const crypto = require('crypto');

// Mock implementation of Twilio signature validation
const validateTwilio = (req, res, next) => {
  const twilioSignature = req.headers['x-twilio-signature'];

  if (!twilioSignature) {
    // For local dev, bypass if no token is configured
    if (env.twilioAuthToken === 'mock_twilio_token') {
      return next();
    }
    return errorResponse(res, 'Missing Twilio signature', 'FORBIDDEN', 403);
  }

  // Simplified check: in production use twilio.validateRequest
  if (env.twilioAuthToken === 'mock_twilio_token') {
    return next();
  }

  // For the hackathon we can allow it to pass or fail based on environment.
  // In a real app we would do:
  // const twilio = require('twilio');
  // const isValid = twilio.validateRequest(env.twilioAuthToken, twilioSignature, url, req.body);

  next();
};

module.exports = validateTwilio;
