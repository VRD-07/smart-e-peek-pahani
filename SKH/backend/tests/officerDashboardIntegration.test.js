const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../server');
const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');
const Officer = require('../src/models/Officer');
const Submission = require('../src/models/Submission');
const ValidationResult = require('../src/models/ValidationResult');
const env = require('../src/config/env');

jest.mock('../src/config/env', () => ({
  twilioAuthToken: 'mock_twilio_token',
  storageProvider: 'mock',
  jwtSecret: 'mock_jwt_secret'
}));

jest.setTimeout(60000);

describe('Officer Dashboard - GET /api/submissions (Phase 1)', () => {
  let mongoServer;
  let gatNashik, gatPune;
  let farmerA, farmerB;
  let officer;

  const officerToken = () => jwt.sign(
    { officerId: officer._id, role: 'officer' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  const farmerToken = (farmerId) => jwt.sign(
    { farmerId, role: 'farmer' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  const boundaryAround = (lat, lng, offset = 0.001) => ({
    type: 'Polygon',
    coordinates: [[
      [lng - offset, lat - offset],
      [lng + offset, lat - offset],
      [lng + offset, lat + offset],
      [lng - offset, lat + offset],
      [lng - offset, lat - offset]
    ]]
  });

  const createSubmissionDoc = async (overrides = {}) => {
    const {
      farmer = farmerA,
      gat = gatNashik,
      status = 'VALID',
      clientSubmissionId,
      createdAt,
      ...rest
    } = overrides;

    const submission = await Submission.create({
      clientSubmissionId: clientSubmissionId || `sub_${Math.random().toString(36).slice(2)}`,
      farmerId: farmer._id,
      source: 'WEB',
      gatId: gat._id,
      crop: { declaredCrop: 'soybean' },
      location: {
        latitude: gat.center.latitude,
        longitude: gat.center.longitude,
        source: 'WEB_GPS'
      },
      image: { url: 'https://res.cloudinary.com/mock/img.jpg', mimeType: 'image/jpeg', size: 5000 },
      status,
      ...rest
    });

    if (createdAt) {
      // Mongoose marks createdAt immutable under `timestamps: true`, so go
      // through the raw driver to backdate the document for range filtering.
      await Submission.collection.updateOne(
        { _id: submission._id },
        { $set: { createdAt } }
      );
    }

    return submission;
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await Farmer.deleteMany({});
    await Gat.deleteMany({});
    await Officer.deleteMany({});
    await Submission.deleteMany({});
    await ValidationResult.deleteMany({});

    gatNashik = await Gat.create({
      gatNumber: '101',
      village: 'Demo Village',
      district: 'Nashik',
      cropTypes: ['soybean'],
      boundary: boundaryAround(19.9012, 74.4939),
      center: { latitude: 19.9012, longitude: 74.4939 }
    });

    gatPune = await Gat.create({
      gatNumber: '201',
      village: 'Other Village',
      district: 'Pune',
      cropTypes: ['cotton'],
      boundary: boundaryAround(18.5204, 73.8567),
      center: { latitude: 18.5204, longitude: 73.8567 }
    });

    farmerA = await Farmer.create({
      name: 'Farmer A',
      phoneNumber: '1111111111',
      associatedGats: [gatNashik._id]
    });

    farmerB = await Farmer.create({
      name: 'Farmer B',
      phoneNumber: '2222222222',
      associatedGats: [gatPune._id]
    });

    officer = await Officer.create({
      employeeId: 'OFFICER001',
      name: 'Demo Revenue Officer',
      passwordHash: await bcrypt.hash('demo1234', 10),
      jurisdiction: { district: 'Nashik', taluka: 'Sinnar' }
    });
  });

  describe('Authorization', () => {
    it('1. Missing JWT -> 401', async () => {
      const res = await request(app).get('/api/submissions');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('2. Invalid JWT -> 401', async () => {
      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', 'Bearer not_a_real_token');

      expect(res.status).toBe(401);
    });

    it('3. Farmer JWT -> 403 FORBIDDEN (role check)', async () => {
      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${farmerToken(farmerA._id)}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('4. Officer JWT -> 200', async () => {
      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Global visibility', () => {
    it('5. Returns submissions across all farmers and Gats', async () => {
      await createSubmissionDoc({ farmer: farmerA, gat: gatNashik });
      await createSubmissionDoc({ farmer: farmerB, gat: gatPune });

      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.submissions.length).toBe(2);

      const farmerNames = res.body.data.submissions.map(s => s.farmerId.name).sort();
      expect(farmerNames).toEqual(['Farmer A', 'Farmer B']);
    });

    it('6. Populates farmer, Gat and validation result for the table and map', async () => {
      const submission = await createSubmissionDoc({ status: 'REVIEW' });
      const validationResult = await ValidationResult.create({
        submissionId: submission._id,
        overallStatus: 'REVIEW',
        reasons: ['AI service unavailable or failed']
      });
      await Submission.updateOne({ _id: submission._id }, { validationResultId: validationResult._id });

      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${officerToken()}`);

      const row = res.body.data.submissions[0];

      expect(row.farmerId.name).toBe('Farmer A');
      expect(row.farmerId.phoneNumber).toBe('1111111111');
      expect(row.gatId.gatNumber).toBe('101');
      expect(row.gatId.district).toBe('Nashik');
      expect(row.gatId.boundary).toBeDefined();
      // Map pins are drawn from the submission coordinates
      expect(row.location.latitude).toBe(19.9012);
      expect(row.location.longitude).toBe(74.4939);
      expect(row.validationResultId.overallStatus).toBe('REVIEW');
      expect(row.validationResultId.reasons).toContain('AI service unavailable or failed');
    });
  });

  describe('Status filter', () => {
    beforeEach(async () => {
      await createSubmissionDoc({ status: 'VALID' });
      await createSubmissionDoc({ status: 'REVIEW' });
      await createSubmissionDoc({ status: 'REVIEW' });
      await createSubmissionDoc({ status: 'INVALID' });
    });

    it('7. Filters to REVIEW only', async () => {
      const res = await request(app)
        .get('/api/submissions?status=REVIEW')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.submissions.length).toBe(2);
      expect(res.body.data.submissions.every(s => s.status === 'REVIEW')).toBe(true);
      expect(res.body.data.pagination.total).toBe(2);
    });

    it('8. Accepts a comma-separated status list', async () => {
      const res = await request(app)
        .get('/api/submissions?status=REVIEW,INVALID')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.body.data.submissions.length).toBe(3);
      expect(res.body.data.submissions.every(s => ['REVIEW', 'INVALID'].includes(s.status))).toBe(true);
    });

    it('9. Status filter is case-insensitive', async () => {
      const res = await request(app)
        .get('/api/submissions?status=review')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.body.data.submissions.length).toBe(2);
    });

    it('10. Unknown status -> 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/submissions?status=NOT_A_STATUS')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('11. statusCounts ignores the active status filter', async () => {
      const res = await request(app)
        .get('/api/submissions?status=REVIEW')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.body.data.statusCounts).toEqual({
        VALID: 1,
        REVIEW: 2,
        INVALID: 1
      });
    });
  });

  describe('Gat and area filters', () => {
    beforeEach(async () => {
      await createSubmissionDoc({ farmer: farmerA, gat: gatNashik });
      await createSubmissionDoc({ farmer: farmerA, gat: gatNashik });
      await createSubmissionDoc({ farmer: farmerB, gat: gatPune });
    });

    it('12. Filters by gatId', async () => {
      const res = await request(app)
        .get(`/api/submissions?gatId=${gatPune._id}`)
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.body.data.submissions.length).toBe(1);
      expect(res.body.data.submissions[0].gatId.gatNumber).toBe('201');
    });

    it('13. Invalid gatId -> 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/submissions?gatId=not-an-objectid')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('14. Filters by district', async () => {
      const res = await request(app)
        .get('/api/submissions?district=Nashik')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.body.data.submissions.length).toBe(2);
      expect(res.body.data.submissions.every(s => s.gatId.district === 'Nashik')).toBe(true);
    });

    it('15. Filters by village', async () => {
      const res = await request(app)
        .get('/api/submissions?village=Other%20Village')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.body.data.submissions.length).toBe(1);
      expect(res.body.data.submissions[0].gatId.village).toBe('Other Village');
    });

    it('16. Combined gatId + district that disagree returns nothing', async () => {
      const res = await request(app)
        .get(`/api/submissions?gatId=${gatPune._id}&district=Nashik`)
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.submissions.length).toBe(0);
      expect(res.body.data.pagination.total).toBe(0);
    });

    it('17. Unknown district returns an empty page, not an error', async () => {
      const res = await request(app)
        .get('/api/submissions?district=Nowhere')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.submissions.length).toBe(0);
    });
  });

  describe('Date range filter', () => {
    beforeEach(async () => {
      await createSubmissionDoc({ clientSubmissionId: 'old', createdAt: new Date('2026-01-10T00:00:00Z') });
      await createSubmissionDoc({ clientSubmissionId: 'mid', createdAt: new Date('2026-06-15T00:00:00Z') });
      await createSubmissionDoc({ clientSubmissionId: 'new', createdAt: new Date('2026-08-20T00:00:00Z') });
    });

    it('18. Filters by from date', async () => {
      const res = await request(app)
        .get('/api/submissions?from=2026-06-01')
        .set('Authorization', `Bearer ${officerToken()}`);

      const ids = res.body.data.submissions.map(s => s.clientSubmissionId).sort();
      expect(ids).toEqual(['mid', 'new']);
    });

    it('19. Filters by from + to range', async () => {
      const res = await request(app)
        .get('/api/submissions?from=2026-02-01&to=2026-07-01')
        .set('Authorization', `Bearer ${officerToken()}`);

      const ids = res.body.data.submissions.map(s => s.clientSubmissionId);
      expect(ids).toEqual(['mid']);
    });

    it('20. Invalid date -> 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/submissions?from=yesterday')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Pagination and sorting', () => {
    beforeEach(async () => {
      for (let i = 0; i < 25; i++) {
        await createSubmissionDoc({
          clientSubmissionId: `page_${i.toString().padStart(2, '0')}`,
          createdAt: new Date(Date.UTC(2026, 0, i + 1))
        });
      }
    });

    it('21. Defaults to 20 per page with pagination metadata', async () => {
      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.body.data.submissions.length).toBe(20);
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2
      });
    });

    it('22. Serves the second page', async () => {
      const res = await request(app)
        .get('/api/submissions?page=2')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.body.data.submissions.length).toBe(5);
      expect(res.body.data.pagination.page).toBe(2);
    });

    it('23. Honours an explicit limit', async () => {
      const res = await request(app)
        .get('/api/submissions?limit=5&page=3')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.body.data.submissions.length).toBe(5);
      expect(res.body.data.pagination.totalPages).toBe(5);
    });

    it('24. Caps limit at 100', async () => {
      const res = await request(app)
        .get('/api/submissions?limit=5000')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.body.data.pagination.limit).toBe(100);
    });

    it('25. Sorts newest first by default', async () => {
      const res = await request(app)
        .get('/api/submissions?limit=3')
        .set('Authorization', `Bearer ${officerToken()}`);

      const ids = res.body.data.submissions.map(s => s.clientSubmissionId);
      expect(ids).toEqual(['page_24', 'page_23', 'page_22']);
    });

    it('26. Supports ascending sort', async () => {
      const res = await request(app)
        .get('/api/submissions?limit=3&sortBy=createdAt&sortOrder=asc')
        .set('Authorization', `Bearer ${officerToken()}`);

      const ids = res.body.data.submissions.map(s => s.clientSubmissionId);
      expect(ids).toEqual(['page_00', 'page_01', 'page_02']);
    });

    it('27. Ignores a non-whitelisted sort field', async () => {
      const res = await request(app)
        .get('/api/submissions?limit=3&sortBy=farmerId.phoneNumber')
        .set('Authorization', `Bearer ${officerToken()}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.submissions.map(s => s.clientSubmissionId);
      expect(ids).toEqual(['page_24', 'page_23', 'page_22']);
    });
  });

  describe('Route separation', () => {
    it('28. GET /api/submissions/:id still works for a farmer token', async () => {
      const submission = await createSubmissionDoc();

      const res = await request(app)
        .get(`/api/submissions/${submission._id}`)
        .set('Authorization', `Bearer ${farmerToken(farmerA._id)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.clientSubmissionId).toBe(submission.clientSubmissionId);
    });
  });
});

describe('Officer login - POST /api/auth/officer/login (Phase 1)', () => {
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
    await Officer.deleteMany({});
    await Officer.create({
      employeeId: 'OFFICER001',
      name: 'Demo Revenue Officer',
      passwordHash: await bcrypt.hash('demo1234', 10),
      jurisdiction: { district: 'Nashik', taluka: 'Sinnar' }
    });
  });

  it('1. Valid credentials -> token with officer role', async () => {
    const res = await request(app)
      .post('/api/auth/officer/login')
      .send({ employeeId: 'OFFICER001', password: 'demo1234' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();

    const decoded = jwt.verify(res.body.data.token, env.jwtSecret);
    expect(decoded.role).toBe('officer');
    expect(decoded.officerId).toBeDefined();
    expect(res.body.data.officer.jurisdiction.district).toBe('Nashik');
  });

  it('2. Token from login is accepted by GET /api/submissions', async () => {
    const login = await request(app)
      .post('/api/auth/officer/login')
      .send({ employeeId: 'OFFICER001', password: 'demo1234' });

    const res = await request(app)
      .get('/api/submissions')
      .set('Authorization', `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
  });

  it('3. Wrong password -> 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/api/auth/officer/login')
      .send({ employeeId: 'OFFICER001', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('4. Unknown employeeId -> 401 with the same message as a wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/officer/login')
      .send({ employeeId: 'GHOST999', password: 'demo1234' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('5. Missing password -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/auth/officer/login')
      .send({ employeeId: 'OFFICER001' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('6. Password is never returned and is stored hashed', async () => {
    const res = await request(app)
      .post('/api/auth/officer/login')
      .send({ employeeId: 'OFFICER001', password: 'demo1234' });

    expect(JSON.stringify(res.body)).not.toContain('demo1234');

    const officer = await Officer.findOne({ employeeId: 'OFFICER001' });
    expect(officer.passwordHash).not.toBe('demo1234');
  });
});
