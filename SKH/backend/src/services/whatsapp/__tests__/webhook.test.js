const request = require('supertest');
const express = require('express');
const twilio = require('twilio');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const WhatsAppSession = require('../../../models/WhatsAppSession');
const whatsappRoutes = require('../../../routes/whatsappRoutes');
const { STATES, MESSAGE_TYPES, LANGUAGES } = require('../constants');
const { DICTIONARY } = require('../messages');

// Mock mediaService to avoid real HTTP downloads during webhook integration testing
jest.mock('../mediaService', () => ({
  processMedia: jest.fn().mockImplementation((url, mimeType) => {
    return Promise.resolve({
      url, // Preserve the original URL so STT can route based on it
      mimeType,
      size: 5000
    });
  })
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  unlink: jest.fn((path, cb) => cb(null))
}));

const env = require('../../../config/env');
jest.mock('../../../config/env', () => ({
  twilioAuthToken: 'mock_twilio_token',
  storageProvider: 'mock'
}));

// Setup minimal express app specifically for testing the webhook
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/api/whatsapp', whatsappRoutes);

jest.setTimeout(60000);

describe('WhatsApp Webhook Integration', () => {

  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  });

  describe('Signature Validation Middleware', () => {
    it('should return 403 if signature is missing entirely', async () => {
      // Unset token to simulate production validation scenario where header is missing
      env.twilioAuthToken = 'real-token-for-test';

      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .send({ From: 'whatsapp:+12345' });

      expect(res.status).toBe(403);
      expect(res.text).toContain('Missing Twilio signature');
    });



    it('should process request if signature validation is correctly bypassed for test', async () => {
      // Using our test bypass mechanism
      env.twilioAuthToken = 'mock_twilio_token';

      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .send({ From: 'whatsapp:+12345', Body: 'hi' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/xml');
    });
  });

  describe('Controller Logic & Flow Integration', () => {

    beforeAll(() => {
      // Bypass signature validation for controller flow testing
      env.twilioAuthToken = 'mock_twilio_token';
    });

    it('should return 400 for malformed payload without "From" field', async () => {
      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .send({ Body: 'hello' }); // missing From

      expect(res.status).toBe(400);
    });

    it('should transition START -> LANGUAGE_SELECTION on first text message', async () => {
      const sender = 'whatsapp:+1111111111';
      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .send({ From: sender, Body: 'hello' });

      expect(res.status).toBe(200);

      // TwiML response should contain welcome message
      expect(res.text).toContain('<Message>');
      expect(res.text).toContain('नमस्कार');

      // Verify DB state
      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session).toBeDefined();
    });

    it('should preserve session state across multiple requests (Start -> Action -> Season)', async () => {
      const sender = 'whatsapp:+2222222222';

      const Farmer = require('../../../models/Farmer');
      const Gat = require('../../../models/Gat');
      const gat = await Gat.create({
        gatNumber: '111',
        village: 'V',
        district: 'D',
        boundary: { type: 'Polygon', coordinates: [[[0,0],[0,10],[10,10],[10,0],[0,0]]] },
        center: { latitude: 5, longitude: 5 }
      });
      await Farmer.create({ name: 'Test', phoneNumber: sender, associatedGats: [gat._id] });

      // Request 1: Start -> advances single Gat farmer to WAITING_FOR_ACTION
      await request(app)
        .post('/api/whatsapp/webhook')
        .send({ From: sender, Body: 'hi' });

      // Request 2: Select "1" (Register Crop) -> advances to WAITING_FOR_SEASON
      const res2 = await request(app)
        .post('/api/whatsapp/webhook')
        .send({ From: sender, Body: '1' });

      expect(res2.status).toBe(200);
      expect(res2.text).toContain(DICTIONARY[LANGUAGES.MR].ASK_SEASON);

      // Verify DB state
      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.state).toBe(STATES.WAITING_FOR_SEASON);
      expect(session.language).toBe(LANGUAGES.MR);
    });

    it('should handle LOCATION payload correctly', async () => {
      const sender = 'whatsapp:+3333333333';
      // Pre-seed the mock session to simulate being in WAITING_FOR_LOCATION state
      await WhatsAppSession.create({
        phoneNumber: sender,
        state: STATES.WAITING_FOR_LOCATION,
        language: LANGUAGES.EN
      });

      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .send({
          From: sender,
          Latitude: '19.123',
          Longitude: '74.123'
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain(DICTIONARY[LANGUAGES.EN].ASK_IMAGE);

      // Verify location was normalized correctly
      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.state).toBe(STATES.WAITING_FOR_IMAGE);
      expect(session.location.latitude).toBe(19.123);
      expect(session.location.longitude).toBe(74.123);
    });

    it('should handle IMAGE payload correctly', async () => {
      const sender = 'whatsapp:+4444444444';

      const Farmer = require('../../../models/Farmer');
      const Gat = require('../../../models/Gat');
      const gat = await Gat.create({
        gatNumber: '444',
        village: 'V',
        district: 'D',
        boundary: { type: 'Polygon', coordinates: [[[0,0],[0,10],[10,10],[10,0],[0,0]]] },
        center: { latitude: 5, longitude: 5 }
      });
      await Farmer.create({ name: 'Test', phoneNumber: sender, associatedGats: [gat._id] });
      // Pre-seed session
      await WhatsAppSession.create({
        phoneNumber: sender,
        state: STATES.WAITING_FOR_IMAGE,
        language: LANGUAGES.HI,
        selectedGatId: gat._id,
        declaredCrop: 'soybean',
        location: { latitude: 5, longitude: 5 }
      });

      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .send({
          From: sender,
          NumMedia: '1',
          MediaUrl0: 'https://test.com/image.jpg',
          MediaContentType0: 'image/jpeg'
        });

      // The controller generates a web receipt bridge on READY_FOR_VALIDATION
      expect(res.text).toContain('Web Receipt');
      expect(res.text).toContain('/submit?token=');

      // Verify image was saved correctly
      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.state).toBe(STATES.READY_FOR_VALIDATION);
      expect(session.image.url).toContain('res.cloudinary.com');
    });

    it('should handle flow errors by safely telling the user and keeping state', async () => {
      const sender = 'whatsapp:+5555555555';
      await WhatsAppSession.create({
        phoneNumber: sender,
        state: STATES.WAITING_FOR_LOCATION,
        language: LANGUAGES.EN
      });

      // Send text instead of location
      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .send({ From: sender, Body: 'This is not a location' });

      // Verify location was asked again
      expect(res.text).toContain(DICTIONARY[LANGUAGES.EN].ASK_LOCATION);

      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.state).toBe(STATES.WAITING_FOR_LOCATION);
    });

    it('should handle VOICE message for crop extraction (Integration: Voice -> STT -> Crop -> Flow)', async () => {
      const sender = 'whatsapp:+6666666666';
      await WhatsAppSession.create({
        phoneNumber: sender,
        state: STATES.WAITING_FOR_CROP,
        language: LANGUAGES.MR
      });

      // The mock URL 'marathi_soybean' will trigger the 'माझ्या शेतात सोयाबीन आहे' transcript, which maps to 'soybean'
      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .send({
          From: sender,
          NumMedia: '1',
          MediaUrl0: 'http://example.com/marathi_soybean.ogg',
          MediaContentType0: 'audio/ogg'
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain(DICTIONARY[LANGUAGES.MR].ASK_SOWING_DATE);

      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.state).toBe(STATES.WAITING_FOR_SOWING_DATE);
      expect(session.declaredCrop).toBe('soybean');
    });

    it('should return MULTIPLE_CROPS error when STT returns multiple crops via VOICE', async () => {
      const sender = 'whatsapp:+7777777777';
      await WhatsAppSession.create({
        phoneNumber: sender,
        state: STATES.WAITING_FOR_CROP,
        language: LANGUAGES.EN
      });

      // 'english_multiple' triggers 'I planted soybean and cotton'
      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .send({
          From: sender,
          NumMedia: '1',
          MediaUrl0: 'http://example.com/english_multiple.ogg',
          MediaContentType0: 'audio/ogg'
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain(DICTIONARY[LANGUAGES.EN].MULTIPLE_CROPS);

      // State transitions to WAITING_FOR_CROP_CONFIRMATION for crop selection
      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.state).toBe(STATES.WAITING_FOR_CROP_CONFIRMATION);
    });
  });
});
