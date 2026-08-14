const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server');
const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');
const Submission = require('../src/models/Submission');
const env = require('../src/config/env');
const { getVisionProvider } = require('../src/services/ai/visionFactory');

jest.mock('../src/services/ai/visionFactory');

const mockVisionProvider = { classify: jest.fn() };
jest.setTimeout(60000);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  // Server.js might have connected, we wait and re-connect if needed or let it use the existing mock
  // Actually, connectDB in server.js connects to default env.mongoUri
  // We should override mongoose connect
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('API Endpoints', () => {
  let token;
  let farmer;
  let gat;

  beforeEach(async () => {
    await Farmer.deleteMany({});
    await Gat.deleteMany({});
    await Submission.deleteMany({});
    jest.clearAllMocks();

    getVisionProvider.mockReturnValue(mockVisionProvider);

    gat = await Gat.create({
      gatNumber: '101',
      village: 'Demo',
      district: 'Pune',
      cropTypes: ['soybean'],
      boundary: {
        type: 'Polygon',
        coordinates: [[
          [74.1230, 19.1230],
          [74.1240, 19.1230],
          [74.1240, 19.1240],
          [74.1230, 19.1240],
          [74.1230, 19.1230]
        ]]
      },
      center: { latitude: 19.1235, longitude: 74.1235 }
    });

    farmer = await Farmer.create({
      name: 'Test Farmer',
      phoneNumber: '1234567890',
      preferredLanguage: 'mr',
      associatedGats: [gat._id]
    });

    token = jwt.sign({ farmerId: farmer._id }, env.jwtSecret || 'secret');
  });

  describe('Authentication protection', () => {
    it('should reject unauthenticated request to /api/submissions', async () => {
      const res = await request(app).post('/api/submissions').send({});
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated request to /api/submissions/:id/validate', async () => {
      const res = await request(app).post('/api/submissions/sub123/validate').send({});
      expect(res.status).toBe(401);
    });

    it('health endpoint should be public', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('whatsapp webhook should be public (no JWT, but twilio signature checks)', async () => {
      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .set('x-twilio-signature', 'fake');
      // our validateTwilio middleware returns 403 if token isn't mock, but it doesn't require JWT.
      // If we use 'mock_twilio_token' it will pass. Let's just expect it's not 401.
      expect(res.status).not.toBe(401);
    });
  });

  describe('POST /api/submissions', () => {
    const validPayload = {
      clientSubmissionId: 'cs_123',
      farmerId: null,
      source: 'WEB',
      gatId: null,
      crop: { declaredCrop: 'soybean' },
      location: { latitude: 19.1235, longitude: 74.1235, source: 'WEB_GPS' },
      image: { url: 'http://test.com/img.jpg', mimeType: 'image/jpeg', size: 1024 }
    };

    beforeEach(() => {
      validPayload.farmerId = farmer._id.toString();
      validPayload.gatId = gat._id.toString();
    });

    it('should create a valid submission', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.clientSubmissionId).toBe('cs_123');
    });

    it('should return 400 for malformed/missing data', async () => {
      const payload = { ...validPayload, location: undefined };
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(400); // Mongoose validation error
    });

    it('should return 409 for duplicate submission', async () => {
      await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload);

      const res2 = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload);

      expect(res2.status).toBe(409);
      expect(res2.body.code).toBe('DUPLICATE_SUBMISSION');
    });
  });

  describe('POST /api/submissions/:id/validate', () => {
    let submission;
    beforeEach(async () => {
      submission = await Submission.create({
        clientSubmissionId: 'cs_validate_123',
        farmerId: farmer._id,
        source: 'WEB',
        gatId: gat._id,
        crop: { declaredCrop: 'soybean' },
        location: { latitude: 19.1235, longitude: 74.1235, source: 'WEB_GPS' },
        image: { url: 'http://example.com/image.jpg', mimeType: 'image/jpeg', size: 1024 }
      });
    });

    it('expected success response (PASS)', async () => {
      mockVisionProvider.classify.mockResolvedValue({ detectedCrop: 'soybean', confidence: 0.95 });

      const res = await request(app)
        .post(`/api/submissions/${submission._id}/validate`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      if (res.body.data.overallStatus !== 'PASS') {
        console.error('Validation failed with reasons:', res.body.data.reasons);
      }
      expect(res.status).toBe(200);
      expect(res.body.data.overallStatus).toBe('PASS');
    });

    it('expected validation failures (FAIL for outside gat)', async () => {
      submission.location.latitude = 19.2;
      await submission.save();
      mockVisionProvider.classify.mockResolvedValue({ detectedCrop: 'soybean', confidence: 0.95 });

      const res = await request(app)
        .post(`/api/submissions/${submission._id}/validate`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.overallStatus).toBe('FAIL');
      expect(res.body.data.checks.location.status).toBe('FAIL');
    });
  });
});
