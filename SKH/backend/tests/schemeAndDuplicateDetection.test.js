const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const { isVerificationQuery, verifySchemeOrCalamity } = require('../src/services/verification/schemeVerificationService');
const { computePerceptualHash, calculateHammingDistance, calculateSimilarity, checkDuplicatePhoto } = require('../src/services/image/perceptualHashService');
const { runValidationEngine } = require('../src/services/validation/validationEngine');

const CalamityZone = require('../src/models/CalamityZone');
const SchemeDeadline = require('../src/models/SchemeDeadline');
const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');
const Submission = require('../src/models/Submission');
const ValidationResult = require('../src/models/ValidationResult');

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_key_123';
  process.env.NOTIFICATION_PROVIDER = 'mock';

  // Require app after DB connection
  app = require('../server');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await CalamityZone.deleteMany({});
  await SchemeDeadline.deleteMany({});
  await Farmer.deleteMany({});
  await Gat.deleteMany({});
  await Submission.deleteMany({});
  await ValidationResult.deleteMany({});
});

describe('Task 1: Scheme / Calamity Verification Command', () => {
  it('1. Correctly identifies verification queries in English and Marathi', () => {
    expect(isVerificationQuery('is Kharif real').isQuery).toBe(true);
    expect(isVerificationQuery('verify crop scheme').isQuery).toBe(true);
    expect(isVerificationQuery('check status of drought relief').isQuery).toBe(true);
    expect(isVerificationQuery('अतिवृष्टी मुर्शदपूर तपासा').isQuery).toBe(true);
    expect(isVerificationQuery('ई-पीक पाहणी खरीप योजना खरी आहे का').isQuery).toBe(true);

    expect(isVerificationQuery('1').isQuery).toBe(false);
    expect(isVerificationQuery('सोयाबीन').isQuery).toBe(false);
  });

  it('2. Replies correctly with real backend data when a match exists', async () => {
    // Seed Calamity Zone
    await CalamityZone.create({
      name: 'Murshatpur Flood / Excess Rain 2026',
      calamityType: 'FLOOD',
      declaredDate: new Date('2026-08-01'),
      district: 'Nashik',
      boundary: {
        type: 'Polygon',
        coordinates: [[[74.48, 19.89], [74.52, 19.89], [74.52, 19.92], [74.48, 19.92], [74.48, 19.89]]]
      },
      affectedCropTypes: ['soybean', 'cotton'],
      isActive: true,
      notes: 'Declared pursuant to District Collector revenue order.'
    });

    // Seed Scheme Deadline
    await SchemeDeadline.create({
      season: 'KHARIF',
      year: 2026,
      seasonStart: new Date('2026-07-01'),
      deadlineDate: new Date('2026-09-15'),
      district: 'Nashik',
      isActive: true,
      notes: 'Official state crop registration window.'
    });

    // Test English scheme query
    const resSchemeEn = await verifySchemeOrCalamity('is Kharif 2026 real', 'en');
    expect(resSchemeEn.matched).toBe(true);
    expect(resSchemeEn.type).toBe('SCHEME_DEADLINE');
    expect(resSchemeEn.reply).toContain('OFFICIAL SCHEME / DEADLINE VERIFIED');
    expect(resSchemeEn.reply).toContain('KHARIF 2026');

    // Test Marathi calamity query
    const resCalamityMr = await verifySchemeOrCalamity('अतिवृष्टी मुर्शदपूर तपासा', 'mr');
    expect(resCalamityMr.matched).toBe(true);
    expect(resCalamityMr.type).toBe('CALAMITY_ZONE');
    expect(resCalamityMr.reply).toContain('महाराष्ट्र शासन — अधिकृत पडताळणी अहवाल');
    expect(resCalamityMr.reply).toContain('Murshatpur Flood / Excess Rain 2026');
  });

  it('3. Correctly declines when no match exists without guessing or fabricating', async () => {
    const resNoMatch = await verifySchemeOrCalamity('Fake Nonexistent 50000 Rs Free Scheme', 'en');
    expect(resNoMatch.matched).toBe(false);
    expect(resNoMatch.reply).toContain('NO OFFICIAL RECORD FOUND');
    expect(resNoMatch.reply).toContain('The platform has no data to confirm or deny this');

    const resNoMatchMr = await verifySchemeOrCalamity('काल्पनिक मोफत ट्रॅक्टर योजना', 'mr');
    expect(resNoMatchMr.matched).toBe(false);
    expect(resNoMatchMr.reply).toContain('अधिकृत प्रणालीत कोणतीही नोंद आढळली नाही');
  });
});

describe('Task 2 & 3: Perceptual Hashing & Coordinated Duplicate Submission Detection', () => {
  it('4. Computes perceptual hash and measures similarity', async () => {
    // Two identical synthetic base64 images
    const rawA = Buffer.alloc(100, 200);
    const rawB = Buffer.alloc(100, 200);

    const hashA = await computePerceptualHash(rawA);
    const hashB = await computePerceptualHash(rawB);

    expect(typeof hashA).toBe('string');
    expect(hashA.length).toBe(16);
    expect(calculateHammingDistance(hashA, hashB)).toBe(0);
    expect(calculateSimilarity(hashA, hashB)).toBe(1.0);
  });

  it('5. Flags duplicate photo from different farmer/Gat as SUSPECTED_DUPLICATE with matching reference', async () => {
    const gatA = await Gat.create({
      gatNumber: '101',
      village: 'Murshatpur',
      district: 'Nashik',
      registeredArea: 2.5,
      boundary: { type: 'Polygon', coordinates: [[[74.49, 19.90], [74.50, 19.90], [74.50, 19.91], [74.49, 19.91], [74.49, 19.90]]] },
      center: { latitude: 19.905, longitude: 74.495 }
    });

    const gatB = await Gat.create({
      gatNumber: '102',
      village: 'Murshatpur',
      district: 'Nashik',
      registeredArea: 2.0,
      boundary: { type: 'Polygon', coordinates: [[[74.51, 19.90], [74.52, 19.90], [74.52, 19.91], [74.51, 19.91], [74.51, 19.90]]] },
      center: { latitude: 19.905, longitude: 74.515 }
    });

    const farmerA = await Farmer.create({
      name: 'Farmer Alpha',
      phoneNumber: '+919876500001',
      associatedGats: [gatA._id]
    });

    const farmerB = await Farmer.create({
      name: 'Farmer Beta',
      phoneNumber: '+919876500002',
      associatedGats: [gatB._id]
    });

    const sharedPHash = 'a1b2c3d4e5f60718';

    // 1st submission from Farmer A on Gat A
    const subA = await Submission.create({
      clientSubmissionId: 'sub_alpha_1',
      farmerId: farmerA._id,
      gatId: gatA._id,
      source: 'WEB',
      season: 'KHARIF',
      cropYear: 2026,
      registeredArea: 1.0,
      crop: { declaredCrop: 'soybean', language: 'mr' },
      location: { latitude: 19.905, longitude: 74.495, source: 'WEB_GPS' },
      image: { url: 'https://example.com/crop1.jpg', mimeType: 'image/jpeg', size: 1000, perceptualHash: sharedPHash },
      status: 'VALID'
    });

    // 2nd submission from Farmer B on Gat B with identical photo hash
    const subB = await Submission.create({
      clientSubmissionId: 'sub_beta_2',
      farmerId: farmerB._id,
      gatId: gatB._id,
      source: 'WHATSAPP',
      season: 'KHARIF',
      cropYear: 2026,
      registeredArea: 1.0,
      crop: { declaredCrop: 'soybean', language: 'mr' },
      location: { latitude: 19.905, longitude: 74.515, source: 'WHATSAPP' },
      image: { url: 'https://example.com/crop2.jpg', mimeType: 'image/jpeg', size: 1000, perceptualHash: sharedPHash },
      status: 'PENDING_VALIDATION'
    });

    const valResultB = await runValidationEngine(subB, farmerB, gatB);

    expect(valResultB.overallStatus).toBe('REVIEW');
    expect(valResultB.checks.duplicate.status).toBe('REVIEW');
    expect(valResultB.checks.duplicate.reasonCode).toBe('SUSPECTED_DUPLICATE');
    expect(valResultB.checks.duplicate.matchedSubmissionId.toString()).toBe(subA._id.toString());
    expect(valResultB.checks.duplicate.similarity).toBe(1.0);
    expect(subB.status).toBe('REVIEW');
  });

  it('6. Demo panel endpoints execute successfully', async () => {
    // 1. POST /api/demo/verify-scheme
    const resVerify = await request(app)
      .post('/api/demo/verify-scheme')
      .send({ query: 'is Kharif real', language: 'en' });
    expect(resVerify.status).toBe(200);
    expect(resVerify.body.success).toBe(true);

    // 2. POST /api/demo/trigger-duplicate
    const resDup = await request(app)
      .post('/api/demo/trigger-duplicate')
      .send({});
    expect(resDup.status).toBe(201);
    expect(resDup.body.success).toBe(true);
    expect(resDup.body.data.duplicateSubmission.status).toBe('REVIEW');
    expect(resDup.body.data.duplicateSubmission.reasonCode).toBe('SUSPECTED_DUPLICATE');
    expect(resDup.body.data.duplicateSubmission.matchedSubmissionId).toBeTruthy();
  });
});
