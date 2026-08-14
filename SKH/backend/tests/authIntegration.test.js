const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const Farmer = require('../src/models/Farmer');
const OTP = require('../src/models/OTP');
const bcrypt = require('bcrypt');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Farmer.deleteMany({});
  await OTP.deleteMany({});
});

describe('Auth Integration Tests', () => {
  describe('POST /api/auth/request-otp', () => {
    it('should return 404 for unregistered farmer', async () => {
      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({ phoneNumber: '9999999999' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Farmer not registered');
    });

    it('should request OTP successfully for registered farmer', async () => {
      await Farmer.create({ name: 'Test Farmer', phoneNumber: '1234567890' });

      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({ phoneNumber: '1234567890' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const otpRecord = await OTP.findOne({ phoneNumber: '1234567890' });
      expect(otpRecord).not.toBeNull();
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should fail with invalid OTP', async () => {
      await Farmer.create({ name: 'Test Farmer', phoneNumber: '1234567890' });

      // Store a valid hashed OTP
      const hashedOtp = await bcrypt.hash('123456', 10);
      await OTP.create({ phoneNumber: '1234567890', otp: hashedOtp });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: '1234567890', otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid OTP');
    });

    it('should succeed with valid OTP and return JWT', async () => {
      await Farmer.create({ name: 'Test Farmer', phoneNumber: '1234567890' });

      const hashedOtp = await bcrypt.hash('123456', 10);
      await OTP.create({ phoneNumber: '1234567890', otp: hashedOtp });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: '1234567890', otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();

      // Ensure OTP was deleted after single use
      const otpRecord = await OTP.findOne({ phoneNumber: '1234567890' });
      expect(otpRecord).toBeNull();
    });

    it('should return 400 for expired/missing OTP', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: '1234567890', otp: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired OTP');
    });
  });

  describe('Protected Routes', () => {
    it('should return 401 without JWT', async () => {
      // Use existing /api/farmers POST to test protect middleware
      const res = await request(app)
        .post('/api/farmers')
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Not authorized, no token');
    });

    it('should allow access with valid JWT', async () => {
      const farmer = await Farmer.create({ name: 'Test Farmer', phoneNumber: '1234567890' });
      const hashedOtp = await bcrypt.hash('123456', 10);
      await OTP.create({ phoneNumber: '1234567890', otp: hashedOtp });

      const loginRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: '1234567890', otp: '123456' });

      const token = loginRes.body.data.token;

      // Access protected route
      const res = await request(app)
        .get(`/api/farmers/${farmer._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Test Farmer');
    });
  });
});
