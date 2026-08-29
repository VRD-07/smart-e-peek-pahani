const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const Gat = require('../src/models/Gat');
const Farmer = require('../src/models/Farmer');
const Officer = require('../src/models/Officer');
const Submission = require('../src/models/Submission');
const ValidationResult = require('../src/models/ValidationResult');
const { seed: seedGats } = require('../scripts/seedDemoGats');
const { seed: seedOfficers } = require('../scripts/seedDemoOfficer');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

let mockVisionResult = {
  detectedCrop: 'cotton',
  confidence: 0.95
};

jest.mock('../src/services/ai/visionFactory', () => ({
  getVisionProvider: () => ({
    classify: jest.fn().mockImplementation(() => Promise.resolve(mockVisionResult))
  })
}));

describe('Demo Scenarios A & B End-to-End Verification', () => {
  let mongoServer;
  let farmerToken;
  let officerToken;
  let farmGat;
  let collegeGat;
  let farmer;
  let officer;

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
    await seedOfficers(true);

    farmer = await Farmer.findOne({ phoneNumber: '+911234567890' });
    officer = await Officer.findOne({ employeeId: 'OFFICER001' });

    farmGat = await Gat.findOne({ gatNumber: '101' });

    const collegeCoords = [
      [74.4939, 19.9500],
      [74.4950, 19.9500],
      [74.4950, 19.9510],
      [74.4939, 19.9510],
      [74.4939, 19.9500]
    ];

    collegeGat = await Gat.create({
      gatNumber: 'COLLEGE-101',
      village: 'College Campus',
      district: 'Nashik',
      cropTypes: ['soybean', 'cotton'],
      registeredArea: 2.0,
      boundary: {
        type: 'Polygon',
        coordinates: [collegeCoords]
      },
      center: {
        latitude: 19.9505,
        longitude: 74.4945
      }
    });

    farmer.associatedGats.push(collegeGat._id);
    await farmer.save();

    farmerToken = jwt.sign(
      { farmerId: farmer._id, role: 'farmer' },
      env.jwtSecret,
      { expiresIn: '24h' }
    );

    officerToken = jwt.sign(
      { officerId: officer._id, role: officer.role },
      env.jwtSecret,
      { expiresIn: '12h' }
    );
  });

  describe('Scenario A: Out-of-bounds submission with ~5km distance feedback', () => {
    it('should fail validation when submitting from college location against Farm Gat and report ~5.4 km distance', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          clientSubmissionId: `sub-demo-a-${Date.now()}`,
          source: 'WEB',
          gatId: farmGat._id.toString(),
          crop: {declaredCrop: 'soybean' },
          location: {
            latitude: 19.9505,
            longitude: 74.4945,
            source: 'WEB_GPS',
            receivedAt: new Date().toISOString()
          },
          image: {
            url: 'https://example.com/soybean.jpg',
            mimeType: 'image/jpeg',
            size: 204800
          },
          registeredArea: 1.0,
          season: 'KHARIF'
        });

      expect(res.status).toBe(201);
      const submission = res.body.data;
      expect(submission.status).toBe('INVALID');

      const valResult = await ValidationResult.findById(submission.validationResultId);
      expect(valResult.overallStatus).toBe('FAIL');
      expect(valResult.checks.location.status).toBe('FAIL');
      expect(valResult.checks.location.insideGat).toBe(false);
      expect(valResult.checks.location.reasonCode).toBe('OUTSIDE_BOUNDARY');
      expect(valResult.checks.location.distanceFromBoundary).toBeGreaterThan(4500);
      expect(valResult.checks.location.distanceFromBoundary).toBeLessThan(6500);
      expect(valResult.reasons[0]).toContain('Outside Gat boundary by approximately');
      expect(valResult.checks.location.reason).toContain('Outside Gat boundary by approximately');
    });
  });

  describe('Scenario B: Correct location, wrong crop photo, then Officer Approve Override', () => {
    it('should route mismatch to REVIEW/INVALID, then allow Officer to Approve to VALID live', async () => {
      mockVisionResult = {
        detectedCrop: 'cotton',
        confidence: 0.95
      };

      const submitRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          clientSubmissionId: `sub-demo-b-${Date.now()}`,
          source: 'WEB',
          gatId: collegeGat._id.toString(),
          crop: { declaredCrop: 'soybean' },
          location: {
            latitude: 19.9505,
            longitude: 74.4945,
            source: 'WEB_GPS',
            receivedAt: new Date().toISOString()
          },
          image: {
            url: 'https://example.com/cotton_photo.jpg',
            mimeType: 'image/jpeg',
            size: 204800
          },
          registeredArea: 1.0,
          season: 'KHARIF'
        });

      expect(submitRes.status).toBe(201);
      const submission = submitRes.body.data;
      expect(['INVALID', 'REVIEW']).toContain(submission.status);

      const listRes = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(listRes.status).toBe(200);
      const found = listRes.body.data.submissions.find(s => s._id.toString() === submission._id.toString());
      expect(found).toBeDefined();
      expect(found.validationResultId.checks.crop.status).toBe('FAIL');

      const overrideRes = await request(app)
        .patch(`/api/submissions/${submission._id}/status`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ status: 'VALID' });

      expect(overrideRes.status).toBe(200);
      expect(overrideRes.body.data.status).toBe('VALID');
      expect(overrideRes.body.data.reviewedBy).toBe(officer._id.toString());
      expect(overrideRes.body.data.reviewedAt).toBeDefined();

      const updatedSub = await Submission.findById(submission._id);
      expect(updatedSub.status).toBe('VALID');
      expect(updatedSub.reviewedBy.toString()).toBe(officer._id.toString());
      expect(updatedSub.reviewedAt).toBeDefined();
    });
  });
});
