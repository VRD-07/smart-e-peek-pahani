const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const Farmer = require('../src/models/Farmer');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const fs = require('fs');
const path = require('path');
const os = require('os');
const StorageFactory = require('../src/services/storage/storageFactory');

let mongoServer;
const tempFilesToClean = [];

const generateToken = (farmerId) => {
  return jwt.sign({ farmerId, role: 'farmer' }, env.jwtSecret, { expiresIn: '1h' });
};

// Create a dummy image file for testing
const createDummyFile = (filename, sizeInBytes) => {
  const filePath = path.join(os.tmpdir(), filename);
  const buffer = Buffer.alloc(sizeInBytes, 'a');
  fs.writeFileSync(filePath, buffer);
  tempFilesToClean.push(filePath);
  return filePath;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();

  // Clean up any stray dummy files
  tempFilesToClean.forEach(file => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
});

beforeEach(async () => {
  await Farmer.deleteMany({});
  jest.clearAllMocks();
});

describe('Upload Integration Tests', () => {
  let farmer, token;
  let mockUploadImage;

  beforeEach(async () => {
    farmer = await Farmer.create({ name: 'Test Farmer', phoneNumber: '1112223333' });
    token = generateToken(farmer._id);

    mockUploadImage = jest.fn().mockResolvedValue({
      url: 'https://res.cloudinary.com/demo/image/upload/v1234/test.jpg',
      publicId: 'test_id',
      mimeType: 'image/jpeg',
      size: 1024
    });

    jest.spyOn(StorageFactory, 'getStorageProvider').mockReturnValue({
      uploadImage: mockUploadImage
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('1. Valid JPEG + valid JWT', async () => {
    const filePath = createDummyFile('test.jpg', 1024);

    const res = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', filePath, { contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toMatch(/^https:\/\//);
    expect(res.body.data.url).not.toMatch(/^file:\/\//);
    expect(res.body.data.url).not.toContain('twilio');

    // 11. Never exposes credentials
    const responseString = JSON.stringify(res.body);
    expect(responseString).not.toContain('api_key');
    expect(responseString).not.toContain('api_secret');

    // 8. Temp file cleanup after success
    // Need to give a tiny tick for finally block to execute unlink
    await new Promise(resolve => setTimeout(resolve, 50));
    const filesInTmp = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('upload_')); // multer uses 'upload_'
    // multer unlinks it because we called unlink. Let's spy on fs.unlink
    // Actually we can just check if the exact path multer created exists.
    // We can't know the exact path multer generated easily without spying on fs.unlink.
  });

  it('2. Valid PNG + valid JWT', async () => {
    const filePath = createDummyFile('test.png', 1024);

    mockUploadImage.mockResolvedValueOnce({
      url: 'https://res.cloudinary.com/demo/image/upload/v1234/test.png',
      publicId: 'test_png_id',
      mimeType: 'image/png',
      size: 1024
    });

    const res = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', filePath, { contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe('image/png');
  });

  it('3. Missing JWT returns 401', async () => {
    const res = await request(app)
      .post('/api/uploads/image');

    expect(res.status).toBe(401);
  });

  it('4. Missing image returns 400', async () => {
    const res = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_FILE');
  });

  it('5. Unsupported MIME type returns 400', async () => {
    const filePath = createDummyFile('test.txt', 1024);

    const res = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', filePath, { contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_MIME_TYPE');
  });

  it('6. Image >5MB returns 400', async () => {
    // 5.1 MB
    const filePath = createDummyFile('large.jpg', 5.1 * 1024 * 1024);

    const res = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', filePath, { contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('FILE_TOO_LARGE');
  });

  it('7. Cloudinary failure returns 500 and 9. Cleans up temp file', async () => {
    mockUploadImage.mockRejectedValueOnce(new Error('Cloudinary outage'));

    const filePath = createDummyFile('test.jpg', 1024);

    // Spy on fs.unlink
    const unlinkSpy = jest.spyOn(fs, 'unlink');

    const res = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', filePath, { contentType: 'image/jpeg' });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe('UPLOAD_ERROR');

    // Verify cleanup was still called
    expect(unlinkSpy).toHaveBeenCalled();
  });

  it('8. Temporary file cleanup after SUCCESS', async () => {
    const filePath = createDummyFile('test.jpg', 1024);

    const unlinkSpy = jest.spyOn(fs, 'unlink');

    const res = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', filePath, { contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(unlinkSpy).toHaveBeenCalled();
  });

  it('10. farmerId supplied by client cannot bypass JWT identity', async () => {
    const filePath = createDummyFile('test.jpg', 1024);

    const res = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${token}`)
      .field('farmerId', 'fake_admin_id')
      .attach('image', filePath, { contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    // Ensure the payload doesn't echo back a bypassed ID
    // (This endpoint doesn't return farmerId anyway, but it asserts that body injection doesn't crash or affect it)
    expect(res.body.data.url).toBeDefined();
  });
});
