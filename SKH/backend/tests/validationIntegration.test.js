const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const { handleWebhook } = require('../src/controllers/whatsappController');

const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');
const Submission = require('../src/models/Submission');
const ValidationResult = require('../src/models/ValidationResult');
const WhatsAppSession = require('../src/models/WhatsAppSession');
const { STATES } = require('../src/services/whatsapp/constants');

// Mocks
jest.mock('../src/config/env', () => ({
  twilioAuthToken: 'mock_twilio_token',
  storageProvider: 'mock'
}));

jest.mock('../src/services/whatsapp/mediaService', () => ({
  processMedia: jest.fn().mockResolvedValue({ url: 'file:///temp/mock.jpg', mimeType: 'image/jpeg', size: 5000 })
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  unlink: jest.fn((path, cb) => cb(null))
}));

jest.mock('../src/services/ai/visionFactory', () => ({
  getVisionProvider: () => ({
    classify: jest.fn().mockImplementation(async () => {
      const { currentAiMock } = require('./aiMockState');
      if (currentAiMock.throwError) {
        throw new Error('Network error');
      }
      return {
        detectedCrop: currentAiMock.detectedCrop || 'soybean',
        confidence: currentAiMock.confidence || 0.95
      };
    })
  })
}));

const app = express();
app.use(express.urlencoded({ extended: true }));
// Bypass twilio sig validation for tests
app.post('/webhook', (req, res, next) => {
  req.body = req.body || {};
  next();
}, handleWebhook);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Farmer.deleteMany({});
  await Gat.deleteMany({});
  await Submission.deleteMany({});
  await ValidationResult.deleteMany({});
  await WhatsAppSession.deleteMany({});
});

const defaultBoundary = {
  type: 'Polygon',
  coordinates: [[
    [74.120, 19.120],
    [74.130, 19.120],
    [74.130, 19.130],
    [74.120, 19.130],
    [74.120, 19.120]
  ]]
};

// We will use this module to inject mock AI responses
jest.mock('./aiMockState', () => ({
  currentAiMock: {
    detectedCrop: 'soybean',
    confidence: 0.95,
    throwError: false
  }
}), { virtual: true });

async function setupFarmer(phoneNumber) {
  const gat = await Gat.create({
    gatNumber: '123',
    village: 'Demo Village',
    district: 'Ahilyanagar',
    cropTypes: ['soybean', 'cotton'],
    boundary: defaultBoundary,
    center: { latitude: 19.125, longitude: 74.125 }
  });

  const farmer = await Farmer.create({
    name: 'Test Farmer',
    phoneNumber,
    preferredLanguage: 'en',
    associatedGats: [gat._id]
  });

  return { farmer, gat };
}

async function simulateImageUpload(phoneNumber, sid, lat, lng) {
  const farmer = await Farmer.findOne({ phoneNumber });
  const selectedGatId = farmer ? farmer.associatedGats[0] : null;

  // Setup session at WAITING_FOR_IMAGE
  await WhatsAppSession.create({
    phoneNumber,
    state: STATES.WAITING_FOR_IMAGE,
    language: 'en',
    selectedGatId,
    declaredCrop: 'soybean',
    location: {
      latitude: lat || 19.125, // Inside Gat by default
      longitude: lng || 74.125
    }
  });

  return request(app)
    .post('/webhook')
    .type('form')
    .send({
      From: phoneNumber,
      MessageSid: sid,
      NumMedia: '1',
      MediaUrl0: 'https://api.twilio.com/mock-image',
      MediaContentType0: 'image/jpeg'
    });
}

describe('Validation Engine Integration (Phase 4)', () => {

  it('Test 1 - Successful validation', async () => {
    const { currentAiMock } = require('./aiMockState');
    currentAiMock.detectedCrop = 'soybean';
    currentAiMock.confidence = 0.95;
    currentAiMock.throwError = false;

    await setupFarmer('+1234567890');
    await simulateImageUpload('+1234567890', 'sid_pass', 19.125, 74.125);

    const submission = await Submission.findOne({ clientSubmissionId: 'wa_sid_pass' });
    expect(submission.status).toBe('VALID');

    const result = await ValidationResult.findById(submission.validationResultId);
    expect(result.overallStatus).toBe('PASS');
    expect(result.checks.crop.status).toBe('PASS');
    expect(result.checks.location.status).toBe('PASS');
  });

  it('Test 2 - Crop mismatch (FAIL)', async () => {
    const { currentAiMock } = require('./aiMockState');
    currentAiMock.detectedCrop = 'cotton'; // Mismatch! Farmer declared soybean
    currentAiMock.confidence = 0.95;

    await setupFarmer('+1234567891');
    await simulateImageUpload('+1234567891', 'sid_fail_crop', 19.125, 74.125);

    const submission = await Submission.findOne({ clientSubmissionId: 'wa_sid_fail_crop' });
    expect(submission.status).toBe('INVALID');

    const result = await ValidationResult.findById(submission.validationResultId);
    expect(result.overallStatus).toBe('FAIL');
    expect(result.checks.crop.status).toBe('FAIL');
  });

  it('Test 3 - Low confidence (REVIEW)', async () => {
    const { currentAiMock } = require('./aiMockState');
    currentAiMock.detectedCrop = 'soybean';
    currentAiMock.confidence = 0.50; // Below threshold (usually 0.7 or 0.8)

    await setupFarmer('+1234567892');
    await simulateImageUpload('+1234567892', 'sid_review_conf', 19.125, 74.125);

    const submission = await Submission.findOne({ clientSubmissionId: 'wa_sid_review_conf' });
    expect(submission.status).toBe('REVIEW');

    const result = await ValidationResult.findById(submission.validationResultId);
    expect(result.overallStatus).toBe('REVIEW');
    expect(result.checks.crop.status).toBe('REVIEW');
  });

  it('Test 4 - AI provider failure (REVIEW, no crash)', async () => {
    const { currentAiMock } = require('./aiMockState');
    currentAiMock.throwError = true;

    await setupFarmer('+1234567893');
    const res = await simulateImageUpload('+1234567893', 'sid_review_err', 19.125, 74.125);
    expect(res.status).toBe(200); // No webhook crash

    const submission = await Submission.findOne({ clientSubmissionId: 'wa_sid_review_err' });
    expect(submission.status).toBe('REVIEW');

    const result = await ValidationResult.findById(submission.validationResultId);
    expect(result.overallStatus).toBe('REVIEW');
    expect(result.checks.crop.status).toBe('REVIEW');
    expect(result.reasons).toContain('AI service unavailable or failed');
  });

  it('Test 5 - Invalid location (FAIL)', async () => {
    await setupFarmer('+1234567894');

    // Simulate WAITING_FOR_IMAGE but with missing coords
    await WhatsAppSession.create({
      phoneNumber: '+1234567894',
      state: STATES.WAITING_FOR_IMAGE,
      language: 'en',
      selectedGatId: (await Farmer.findOne({ phoneNumber: '+1234567894' })).associatedGats[0],
      declaredCrop: 'soybean',
      location: {} // Invalid!
    });

    await request(app)
      .post('/webhook')
      .type('form')
      .send({
        From: '+1234567894',
        MessageSid: 'sid_fail_loc',
        NumMedia: '1',
        MediaUrl0: 'https://api.twilio.com/mock-image',
        MediaContentType0: 'image/jpeg'
      });

    const submission = await Submission.findOne({ clientSubmissionId: 'wa_sid_fail_loc' });
    // Webhook should catch mongoose validation error and not create submission
    expect(submission).toBeNull();
  });

  it('Test 6 - Outside Gat (FAIL)', async () => {
    await setupFarmer('+1234567895');
    // Provide coordinates clearly outside Gat (19.125, 74.125 is inside, so use 80.0, 80.0)
    await simulateImageUpload('+1234567895', 'sid_fail_gat', 80.0, 80.0);

    const submission = await Submission.findOne({ clientSubmissionId: 'wa_sid_fail_gat' });
    expect(submission.status).toBe('INVALID');

    const result = await ValidationResult.findById(submission.validationResultId);
    expect(result.checks.location.insideGat).toBe(false);
    expect(result.checks.location.status).toBe('FAIL');
  });

  it('Test 7 - Missing image (FAIL)', async () => {
    await setupFarmer('+1234567896');
    await WhatsAppSession.create({
      phoneNumber: '+1234567896',
      state: STATES.WAITING_FOR_IMAGE,
      language: 'en',
      selectedGatId: (await Farmer.findOne({ phoneNumber: '+1234567896' })).associatedGats[0],
      declaredCrop: 'soybean',
      location: { latitude: 19.125, longitude: 74.125 }
    });

    // Send TEXT instead of IMAGE to WAITING_FOR_IMAGE
    await request(app)
      .post('/webhook')
      .type('form')
      .send({
        From: '+1234567896',
        MessageSid: 'sid_no_image',
        Body: 'hello'
      });

    const submission = await Submission.findOne({ clientSubmissionId: 'wa_sid_no_image' });
    // Text doesn't create submission in this state, it replies with error!
    expect(submission).toBeNull();
  });

  it('Test 8 - Persistent Cloudinary URL', async () => {
    await setupFarmer('+1234567897');
    await simulateImageUpload('+1234567897', 'sid_pers_url', 19.125, 74.125);

    const submission = await Submission.findOne({ clientSubmissionId: 'wa_sid_pers_url' });
    expect(submission.image.url).toMatch(/^https:\/\//);
    expect(submission.image.url).toContain('res.cloudinary.com');
  });

  it('Test 9 - Duplicate MessageSid idempotency', async () => {
    await setupFarmer('+1234567898');
    await simulateImageUpload('+1234567898', 'sid_dup', 19.125, 74.125);

    let submissions = await Submission.find({ clientSubmissionId: 'wa_sid_dup' });
    expect(submissions.length).toBe(1);
    const initialResultId = submissions[0].validationResultId;

    // Simulate Twilio Retry! Same exact payload!
    await simulateImageUpload('+1234567898', 'sid_dup', 19.125, 74.125);

    submissions = await Submission.find({ clientSubmissionId: 'wa_sid_dup' });
    expect(submissions.length).toBe(1); // Still exactly one submission
    expect(submissions[0].validationResultId.toString()).toBe(initialResultId.toString()); // Same exact ValidationResult!
  });

});
