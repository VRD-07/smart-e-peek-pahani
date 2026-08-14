const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../server');
const jwt = require('jsonwebtoken');
const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');
const Submission = require('../src/models/Submission');
const WhatsAppSession = require('../src/models/WhatsAppSession');
const { STATES, LANGUAGES } = require('../src/services/whatsapp/constants');
const env = require('../src/config/env');

jest.mock('../src/config/env', () => ({
  twilioAuthToken: 'mock_twilio_token',
  storageProvider: 'mock',
  jwtSecret: 'mock_jwt_secret'
}));

jest.mock('../src/services/whatsapp/mediaService', () => ({
  processMedia: jest.fn().mockImplementation((url, mimeType) => {
    return Promise.resolve({
      url: 'file:///temp/mock.jpg', // Replace http:// url with file://
      mimeType,
      size: 5000
    });
  })
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  unlink: jest.fn((path, cb) => cb(null))
}));

jest.setTimeout(60000);

describe('WhatsAppSession -> Submission Integration (Phase 3A)', () => {
  let mongoServer;
  let gat;
  let farmer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }

    gat = await Gat.create({
      gatNumber: '101',
      village: 'TestVillage',
      district: 'TestDistrict',
      boundary: {
        type: 'Polygon',
        coordinates: [[[74.0, 19.0], [74.0, 20.0], [75.0, 20.0], [75.0, 19.0], [74.0, 19.0]]]
      },
      center: { latitude: 19.5, longitude: 74.5 }
    });

    farmer = await Farmer.create({
      name: 'Test Farmer',
      phoneNumber: 'whatsapp:+1111111111',
      associatedGats: [gat._id]
    });
  });

  const setupSession = async (sender) => {
    const farmerDoc = await Farmer.findOne({ phoneNumber: sender });
    const selectedGatId = farmerDoc ? farmerDoc.associatedGats[0] : null;

    return await WhatsAppSession.create({
      phoneNumber: sender,
      state: STATES.WAITING_FOR_IMAGE,
      language: LANGUAGES.EN,
      selectedGatId,
      declaredCrop: 'soybean',
      location: { latitude: 19.1235, longitude: 74.1235 }
    });
  };

  it('Registered farmer - Submission created with valid fields (Tests 1, 4, 5, 6, 7)', async () => {
    const sender = farmer.phoneNumber;
    await setupSession(sender);

    const res = await request(app)
      .post('/api/whatsapp/webhook')
      .send({
        From: sender,
        MessageSid: 'sid_1',
        NumMedia: '1',
        MediaUrl0: 'http://test.com/img.jpg',
        MediaContentType0: 'image/jpeg'
      });

    expect(res.status).toBe(200);

    const submission = await Submission.findOne({ farmerId: farmer._id });
    expect(submission).toBeDefined();

    // Validate Crop
    expect(submission.crop.declaredCrop).toBe('soybean');

    // Validate Location
    expect(submission.location.latitude).toBe(19.1235);
    expect(submission.location.longitude).toBe(74.1235);
    expect(submission.location.source).toBe('WHATSAPP');

    // Validate Image
    expect(submission.image.url).toBe('https://res.cloudinary.com/mock-cloud/image/upload/v12345/sid_1.jpg');
    expect(submission.image.mimeType).toBe('image/jpeg');

    // Validate clientSubmissionId
    expect(submission.clientSubmissionId).toMatch(/^wa_.+/);

    // Status
    expect(submission.status).toBe('VALID');
  });

  it('Unregistered farmer - No submission created, controlled response (Test 2)', async () => {
    const sender = 'whatsapp:+9999999999'; // Not in DB
    await setupSession(sender);

    const res = await request(app)
      .post('/api/whatsapp/webhook')
      .send({
        From: sender,
        MessageSid: 'sid_2',
        NumMedia: '1',
        MediaUrl0: 'http://test.com/img.jpg',
        MediaContentType0: 'image/jpeg'
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Your WhatsApp number is not registered');

    const submissions = await Submission.find({});
    expect(submissions.length).toBe(0);
  });

  it('Missing Gat - No submission created, controlled response (Test 3)', async () => {
    const sender = 'whatsapp:+2222222222';
    await Farmer.create({
      name: 'No Gat Farmer',
      phoneNumber: sender
      // No associatedGats
    });
    await setupSession(sender);

    const res = await request(app)
      .post('/api/whatsapp/webhook')
      .send({
        From: sender,
        MessageSid: 'sid_3',
        NumMedia: '1',
        MediaUrl0: 'http://test.com/img.jpg',
        MediaContentType0: 'image/jpeg'
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('profile is not linked to a Gat');

    const submissions = await Submission.find({});
    expect(submissions.length).toBe(0);
  });

  it('Multiple WhatsApp submissions (Test 9)', async () => {
    const sender = farmer.phoneNumber;

    // Flow 1
    await setupSession(sender);
    await request(app)
      .post('/api/whatsapp/webhook')
      .send({ From: sender, MessageSid: 'sid_multi_1', NumMedia: '1', MediaUrl0: 'http://test.com/img1.jpg', MediaContentType0: 'image/jpeg' });

    // Simulate reset (e.g. user sends "hi" and goes through flow again)
    await WhatsAppSession.findOneAndUpdate({ phoneNumber: sender }, { state: STATES.WAITING_FOR_IMAGE });

    // Flow 2
    await request(app)
      .post('/api/whatsapp/webhook')
      .send({ From: sender, MessageSid: 'sid_multi_2', NumMedia: '1', MediaUrl0: 'http://test.com/img2.jpg', MediaContentType0: 'image/jpeg' });

    const submissions = await Submission.find({ farmerId: farmer._id });
    expect(submissions.length).toBe(2);
    expect(submissions[0].clientSubmissionId).not.toBe(submissions[1].clientSubmissionId);
  });

  it('Duplicate request safely handled (Test 8)', async () => {
    // A duplicate request would imply the EXACT same payload hitting the exact same state machine point twice.
    // In our architecture, the state machine moves to READY_FOR_VALIDATION on the first hit.
    // A subsequent duplicate hit will find the session already in READY_FOR_VALIDATION,
    // and thus will NOT trigger the submission block (because `previousState !== STATES.READY_FOR_VALIDATION`).

    const sender = farmer.phoneNumber;
    await setupSession(sender);

    const req1 = request(app)
      .post('/api/whatsapp/webhook')
      .send({ From: sender, MessageSid: 'sid_dup', NumMedia: '1', MediaUrl0: 'http://test.com/img.jpg', MediaContentType0: 'image/jpeg' });

    const req2 = request(app)
      .post('/api/whatsapp/webhook')
      .send({ From: sender, MessageSid: 'sid_dup', NumMedia: '1', MediaUrl0: 'http://test.com/img.jpg', MediaContentType0: 'image/jpeg' });

    await Promise.all([req1, req2]);

    const submissions = await Submission.find({ farmerId: farmer._id });
    expect(submissions.length).toBe(1);
  });

});

describe('HTTP Submission API Integration (Phase 7 - PWA Security)', () => {
  let mongoServer;
  let gatA, gatB;
  let farmerA, farmerB;

  const generateToken = (farmerId) => {
    return jwt.sign({ farmerId, role: 'farmer' }, env.jwtSecret, { expiresIn: '1h' });
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await Farmer.deleteMany({});
    await Gat.deleteMany({});
    await Submission.deleteMany({});

    gatA = await Gat.create({
      gatNumber: 'A101',
      village: 'VillageA',
      district: 'DistrictA',
      boundary: {
        type: 'Polygon',
        coordinates: [[[74.0, 19.0], [74.0, 20.0], [75.0, 20.0], [75.0, 19.0], [74.0, 19.0]]]
      },
      center: { latitude: 19.5, longitude: 74.5 }
    });

    gatB = await Gat.create({
      gatNumber: 'B101',
      village: 'VillageB',
      district: 'DistrictB',
      boundary: {
        type: 'Polygon',
        coordinates: [[[74.0, 19.0], [74.0, 20.0], [75.0, 20.0], [75.0, 19.0], [74.0, 19.0]]]
      },
      center: { latitude: 20.5, longitude: 75.5 }
    });

    farmerA = await Farmer.create({
      name: 'Farmer A',
      phoneNumber: '1111111111',
      associatedGats: [gatA._id]
    });

    farmerB = await Farmer.create({
      name: 'Farmer B',
      phoneNumber: '2222222222',
      associatedGats: [gatB._id]
    });
  });

  it('1. Authenticated Farmer A + Gat A -> SUCCESS', async () => {
    const token = generateToken(farmerA._id);
    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientSubmissionId: 'web_1',
        source: 'WEB',
        gatId: gatA._id,
        crop: { declaredCrop: 'Wheat' },
        location: { latitude: 19.5, longitude: 74.5, source: 'WEB_GPS' }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const sub = await Submission.findOne({ clientSubmissionId: 'web_1' });
    expect(sub.farmerId.toString()).toBe(farmerA._id.toString());
  });

  it('2. Authenticated Farmer A + Gat B -> 403 FARMER_GAT_MISMATCH', async () => {
    const token = generateToken(farmerA._id);
    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        gatId: gatB._id
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FARMER_GAT_MISMATCH');
  });

  it('3. Authenticated Farmer A + random Gat -> 403 FARMER_GAT_MISMATCH', async () => {
    const randomGatId = new mongoose.Types.ObjectId();
    const token = generateToken(farmerA._id);
    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        gatId: randomGatId
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FARMER_GAT_MISMATCH');
  });

  it('4. Authenticated Farmer A + missing gatId -> 400', async () => {
    const token = generateToken(farmerA._id);
    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        // no gatId
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('5. ANTI-BYPASS: Farmer A JWT + request body containing Farmer B farmerId -> submission MUST use Farmer A', async () => {
    const token = generateToken(farmerA._id);
    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientSubmissionId: 'web_anti_bypass_1',
        farmerId: farmerB._id.toString(), // Attacker tries to impersonate Farmer B
        gatId: gatA._id, // Farmer A's own valid Gat
        source: 'WEB',
        crop: { declaredCrop: 'Wheat' },
        location: { latitude: 19.5, longitude: 74.5, source: 'WEB_GPS' }
      });

    expect(res.status).toBe(201);

    const sub = await Submission.findOne({ clientSubmissionId: 'web_anti_bypass_1' });
    expect(sub.farmerId.toString()).not.toBe(farmerB._id.toString());
    expect(sub.farmerId.toString()).toBe(farmerA._id.toString());
  });

  it('6. ANTI-BYPASS: Farmer A JWT + Farmer B Gat (plus injected farmerId) -> 403', async () => {
    const token = generateToken(farmerA._id);
    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        farmerId: farmerB._id.toString(),
        gatId: gatB._id
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FARMER_GAT_MISMATCH');
  });

  it('7. Missing JWT -> 401', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .send({ gatId: gatA._id });

    expect(res.status).toBe(401);
  });

  it('8. Invalid JWT -> 401', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer fake_token`)
      .send({ gatId: gatA._id });

    expect(res.status).toBe(401);
  });

  it('9. Authenticated farmer does not exist -> 404 FARMER_NOT_REGISTERED', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const token = generateToken(fakeId);
    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ gatId: gatA._id });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('FARMER_NOT_REGISTERED');
  });

  it('10. Farmer has no associatedGats -> 400 FARMER_GAT_NOT_CONFIGURED', async () => {
    const farmerNoGat = await Farmer.create({
      name: 'No Gat Farmer',
      phoneNumber: '9999999999'
    });
    const token = generateToken(farmerNoGat._id);

    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ gatId: gatA._id });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('FARMER_GAT_NOT_CONFIGURED');
  });
});
