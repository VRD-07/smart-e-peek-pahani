const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const WebBridgeToken = require('../src/models/WebBridgeToken');
const { createBridgeToken } = require('../src/services/whatsapp/webBridgeService');
const Submission = require('../src/models/Submission');
const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');
const ValidationResult = require('../src/models/ValidationResult');

describe('Bridge API Integration Tests (Phase 5M)', () => {
  let mongoServer;
  let testSubmissionId;
  let testFarmerId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await WebBridgeToken.deleteMany({});
    await Submission.deleteMany({});
    await Farmer.deleteMany({});
    await Gat.deleteMany({});
    await ValidationResult.deleteMany({});

    const gat = await Gat.create({
      gatNumber: '123',
      village: 'Demo Village',
      district: 'Ahilyanagar',
      cropTypes: ['soybean'],
      boundary: {
        type: 'Polygon',
        coordinates: [[[74, 19], [74.1, 19], [74.1, 19.1], [74, 19.1], [74, 19]]]
      },
      center: { latitude: 19.05, longitude: 74.05 }
    });

    const farmer = await Farmer.create({
      name: 'Test Farmer',
      phoneNumber: '+919999999999',
      preferredLanguage: 'en',
      associatedGats: [gat._id]
    });
    testFarmerId = farmer._id;

    const validationResult = await ValidationResult.create({
      submissionId: new mongoose.Types.ObjectId(), // placeholder
      overallStatus: 'PASS',
      checks: {
        location: { status: 'PASS', insideGat: true },
        crop: { status: 'PASS', declaredCrop: 'soybean', detectedCrop: 'soybean', confidence: 0.95 }
      }
    });

    const submission = await Submission.create({
      clientSubmissionId: 'wa_test_1',
      farmerId: farmer._id,
      source: 'WHATSAPP',
      gatId: gat._id,
      status: 'VALID',
      location: { latitude: 19.05, longitude: 74.05, source: 'WHATSAPP' },
      crop: { declaredCrop: 'soybean' },
      image: { url: 'http://test.com/img.jpg', mimeType: 'image/jpeg', size: 1024 },
      validationResultId: validationResult._id
    });
    testSubmissionId = submission._id;
  });

  it('Test 1 - Valid token: create token -> verify -> success', async () => {
    const bridge = await createBridgeToken('+919999999999', testSubmissionId);
    const res = await request(app).get(`/api/bridge/verify?token=${bridge.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.submission.id.toString()).toBe(testSubmissionId.toString());
    expect(res.body.data.validation.overallStatus).toBe('PASS');
  });

  it('Test 2 - Invalid token: random token -> INVALID_TOKEN', async () => {
    const res = await request(app).get(`/api/bridge/verify?token=random_garbage`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  it('Test 3 - Expired token: token expires -> EXPIRED_TOKEN', async () => {
    const bridge = await createBridgeToken('+919999999999', testSubmissionId);

    // Force expire in DB
    await WebBridgeToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app).get(`/api/bridge/verify?token=${bridge.token}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('EXPIRED_TOKEN');
  });

  it('Test 4 - Replay: first consume -> success, second consume -> USED_TOKEN', async () => {
    const bridge = await createBridgeToken('+919999999999', testSubmissionId);

    // First use
    const res1 = await request(app).get(`/api/bridge/verify?token=${bridge.token}`);
    expect(res1.status).toBe(200);

    // Second use
    const res2 = await request(app).get(`/api/bridge/verify?token=${bridge.token}`);
    expect(res2.status).toBe(400);
    expect(res2.body.error).toBe('USED_TOKEN');
  });

  it('Test 5 - Concurrent consumption', async () => {
    const bridge = await createBridgeToken('+919999999999', testSubmissionId);

    // Fire two requests simultaneously
    const req1 = request(app).get(`/api/bridge/verify?token=${bridge.token}`);
    const req2 = request(app).get(`/api/bridge/verify?token=${bridge.token}`);

    const [res1, res2] = await Promise.all([req1, req2]);

    const statuses = [res1.status, res2.status].sort();
    // One should succeed (200) and one should fail (400)
    expect(statuses).toEqual([200, 400]);
  });

  it('Test 6 - Raw token is never stored', async () => {
    const bridge = await createBridgeToken('+919999999999', testSubmissionId);

    // Inspect database directly
    const tokens = await WebBridgeToken.find({});
    expect(tokens.length).toBe(1);
    const dbToken = tokens[0];

    expect(dbToken.tokenHash).toBeDefined();
    // Ensure raw token is not anywhere in the doc
    expect(JSON.stringify(dbToken)).not.toContain(bridge.token);
  });

  it('Test 7 - Token does not contain sensitive info', async () => {
    const bridge = await createBridgeToken('+919999999999', testSubmissionId);

    expect(bridge.token).not.toContain('919999999999');
    expect(bridge.token).not.toContain(testSubmissionId.toString());
  });

  it('Test 10 - Invalid/expired token never reveals sensitive details', async () => {
    const bridge = await createBridgeToken('+919999999999', testSubmissionId);
    await WebBridgeToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app).get(`/api/bridge/verify?token=${bridge.token}`);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toContain('919999999999');
    expect(JSON.stringify(res.body)).not.toContain(testSubmissionId.toString());
  });
});
