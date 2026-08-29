const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

let mongoServer;

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
  await mongoServer.stop();
});

beforeEach(async () => {
  await Farmer.deleteMany({});
  await Gat.deleteMany({});
});

describe('Farmer Discovery Integration Tests', () => {
  let validGat, farmerA, farmerB;

  beforeEach(async () => {
    validGat = await Gat.create({
      gatNumber: '101',
      village: 'Pune',
      district: 'Pune',
      cropTypes: ['Wheat'],
      boundary: {
        type: 'Polygon',
        coordinates: [[
          [73.1, 19.1], [73.2, 19.1], [73.2, 19.2], [73.1, 19.2], [73.1, 19.1]
        ]]
      },
      center: { latitude: 19.15, longitude: 73.15 }
    });

    farmerA = await Farmer.create({
      name: 'Farmer A',
      phoneNumber: '1111111111',
      associatedGats: [validGat._id]
    });

    farmerB = await Farmer.create({
      name: 'Farmer B',
      phoneNumber: '2222222222',
      associatedGats: [validGat._id]
    });
  });

  it('A & B: Valid JWT returns correct farmer and populated Gat', async () => {
    const token = generateToken(farmerA._id);
    const res = await request(app)
      .get('/api/farmers/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Farmer A');
    expect(res.body.data.phoneNumber).toBe('+911111111111');
    expect(res.body.data.associatedGats).toBeDefined();
    expect(res.body.data.associatedGats.length).toBe(1);
    expect(res.body.data.associatedGats[0].gatNumber).toBe('101');
    expect(res.body.data.associatedGats[0].village).toBe('Pune');
  });

  it('C: No JWT returns 401', async () => {
    const res = await request(app).get('/api/farmers/me');
    expect(res.status).toBe(401);
  });

  it('D: Invalid JWT returns 401', async () => {
    const res = await request(app)
      .get('/api/farmers/me')
      .set('Authorization', `Bearer invalidtoken123`);
    expect(res.status).toBe(401);
  });

  it('E: Farmer does not exist returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const token = generateToken(fakeId);

    const res = await request(app)
      .get('/api/farmers/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('FARMER_NOT_REGISTERED');
  });

  it('F: Farmer without associatedGats returns correct error', async () => {
    const farmerNoGat = await Farmer.create({
      name: 'Farmer No Gat',
      phoneNumber: '3333333333'
    });
    const token = generateToken(farmerNoGat._id);

    const res = await request(app)
      .get('/api/farmers/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('FARMER_GAT_NOT_CONFIGURED');
  });

  it('G: Invalid/deleted Gat reference returns correct error', async () => {
    const deletedGatId = new mongoose.Types.ObjectId();
    const farmerDeletedGat = await Farmer.create({
      name: 'Farmer Deleted Gat',
      phoneNumber: '4444444444',
      associatedGats: [deletedGatId]
    });
    const token = generateToken(farmerDeletedGat._id);

    const res = await request(app)
      .get('/api/farmers/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('GAT_NOT_FOUND');
  });

  it('H: Farmer A JWT cannot access Farmer B data', async () => {
    const tokenA = generateToken(farmerA._id);
    const res = await request(app)
      .get('/api/farmers/me')
      .set('Authorization', `Bearer ${tokenA}`);

    // Must return Farmer A, proving isolation
    expect(res.body.data.name).toBe('Farmer A');
    expect(res.body.data.phoneNumber).toBe('+911111111111');
  });

  it('I: Query/body farmerId cannot override req.user.farmerId', async () => {
    const tokenA = generateToken(farmerA._id);

    // Attempting to inject Farmer B's ID
    const res = await request(app)
      .get(`/api/farmers/me?farmerId=${farmerB._id}`)
      .send({ farmerId: farmerB._id })
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    // Overrides should be completely ignored, resolving to Farmer A
    expect(res.body.data.name).toBe('Farmer A');
    expect(res.body.data._id).toBe(farmerA._id.toString());
  });
});
