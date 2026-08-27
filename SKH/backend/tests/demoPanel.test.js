const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const Gat = require('../src/models/Gat');
const Farmer = require('../src/models/Farmer');
const Submission = require('../src/models/Submission');
const { seed: seedGats } = require('../scripts/seedDemoGats');

jest.mock('../src/services/ai/visionFactory', () => ({
  getVisionProvider: () => ({
    classify: jest.fn().mockImplementation((image) => {
      // Mock vision provider returns soybean by default with high confidence
      return Promise.resolve({
        detectedCrop: 'soybean',
        confidence: 0.95
      });
    })
  })
}));

describe('Phase 8 — Demo Control Panel Integration Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
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
    await seedGats(true);
  });

  describe('1. Seed/Register New Gat', () => {
    it('should create a closed Polygon Gat and calculate area and center using Turf.js', async () => {
      const coords = [
        [19.1000, 74.5000],
        [19.1020, 74.5000],
        [19.1020, 74.5020],
        [19.1000, 74.5020]
      ];

      const res = await request(app)
        .post('/api/demo/seed-gat')
        .send({
          gatNumber: 'DEMO-999',
          village: 'Test Village',
          district: 'Nashik',
          coordinates: coords
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gat.gatNumber).toBe('DEMO-999');
      expect(res.body.data.gat.boundary.type).toBe('Polygon');
      // Coordinates normalized to [lng, lat] and closed
      const ring = res.body.data.gat.boundary.coordinates[0];
      expect(ring.length).toBe(5);
      expect(ring[0]).toEqual(ring[4]);
      expect(res.body.data.gat.registeredArea).toBeGreaterThan(0);
      expect(res.body.data.gat.center.latitude).toBeCloseTo(19.1010, 2);

      // Verify farmer association
      const farmer = await Farmer.findOne({ phoneNumber: '1234567890' });
      expect(farmer.associatedGats.map(g => g.toString())).toContain(res.body.data.gat._id.toString());
    });
  });

  describe('2. Pipeline Submission Triggers', () => {
    it('should trigger a VALID submission successfully', async () => {
      const res = await request(app)
        .post('/api/demo/trigger-submission')
        .send({ scenario: 'VALID' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.submission.status).toBe('VALID');
      expect(res.body.data.submission.crop.declaredCrop).toBe('soybean');
    });

    it('should trigger a REVIEW submission for boundary edge location', async () => {
      const res = await request(app)
        .post('/api/demo/trigger-submission')
        .send({ scenario: 'REVIEW_BOUNDARY_EDGE' });

      expect(res.status).toBe(200);
      expect(res.body.data.submission.status).toBe('REVIEW');
      expect(res.body.data.submission.validationResultId.checks.location.status).toBe('REVIEW');
      expect(res.body.data.submission.validationResultId.checks.location.reasonCode).toBe('NEAR_BOUNDARY');
    });

    it('should trigger a REVIEW submission for area overallocation', async () => {
      const res = await request(app)
        .post('/api/demo/trigger-submission')
        .send({ scenario: 'REVIEW_AREA_OVERALLOCATION' });

      expect(res.status).toBe(200);
      expect(res.body.data.submission.status).toBe('REVIEW');
      expect(res.body.data.submission.validationResultId.checks.area.status).toBe('REVIEW');
      expect(res.body.data.submission.validationResultId.checks.area.reasonCode).toBe('AREA_OVERALLOCATION');
    });

    it('should trigger a REJECTED submission for crop mismatch', async () => {
      const res = await request(app)
        .post('/api/demo/trigger-submission')
        .send({ scenario: 'REJECTED_CROP_MISMATCH' });

      expect(res.status).toBe(200);
      expect(res.body.data.submission.status).toBe('INVALID');
      expect(res.body.data.submission.validationResultId.checks.crop.status).toBe('FAIL');
    });

    it('should trigger a Calamity Match', async () => {
      const res = await request(app)
        .post('/api/demo/trigger-submission')
        .send({ scenario: 'CALAMITY_MATCH' });

      expect(res.status).toBe(200);
      expect(res.body.data.submission.status).toBe('VALID');
      expect(res.body.data.calamityMatch).toBeDefined();
    });
  });

  describe('3. Multi-Channel Escalation Trigger', () => {
    it('should trigger notification escalation up to SMS/Voice', async () => {
      const res = await request(app)
        .post('/api/demo/trigger-escalation')
        .send({ channel: 'SMS' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.steps).toBeDefined();
    });
  });

  describe('4. Chaos Mode Trigger', () => {
    it('should fire multiple randomized submissions across outcomes', async () => {
      const res = await request(app)
        .post('/api/demo/chaos')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBeGreaterThanOrEqual(5);
      expect(res.body.data.results.length).toBeGreaterThanOrEqual(5);

      const count = await Submission.countDocuments({});
      expect(count).toBeGreaterThanOrEqual(5);
    });
  });
});
