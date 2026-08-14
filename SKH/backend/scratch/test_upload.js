process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const Farmer = require('../src/models/Farmer');
const app = require('../server');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function runRealTest() {
  console.log('--- STARTING REAL CLOUDINARY TEST ---');
  
  // Ensure we are using cloudinary
  if (env.storageProvider !== 'cloudinary') {
    console.warn('STORAGE_PROVIDER is not cloudinary. Modifying process.env for this test...');
    env.storageProvider = 'cloudinary';
  }
  
  if (!env.cloudinaryCloudName) {
    console.error('Missing Cloudinary credentials in env!');
    process.exit(1);
  }

  // Connect to the real DB
  await mongoose.connect(env.mongoUri);
  console.log('Using real MongoDB connection');
  console.log('Using test environment configuration');
  console.log('Connected to real MongoDB.');

  // Create a real temp farmer for this test
  const testPhone = '9998887776';
  await Farmer.deleteOne({ phoneNumber: testPhone });
  const farmer = await Farmer.create({ name: 'Cloudinary Test Farmer', phoneNumber: testPhone });
  console.log(`Created test farmer: ${farmer._id}`);

  // Generate real JWT
  const token = jwt.sign({ farmerId: farmer._id, role: 'farmer' }, env.jwtSecret, { expiresIn: '1h' });

  // Use the mock-image.jpg we have in the backend folder or create one
  const imagePath = path.join(__dirname, '../mock-image.jpg');
  if (!fs.existsSync(imagePath) || fs.statSync(imagePath).size < 50) {
    console.log('Writing a tiny valid PNG for test...');
    // A valid 1x1 transparent PNG in base64
    const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    fs.writeFileSync(imagePath, Buffer.from(b64, 'base64'));
  }

  console.log('Sending upload request to backend...');
  const res = await request(app)
    .post('/api/uploads/image')
    .set('Authorization', `Bearer ${token}`)
    .attach('image', imagePath, { contentType: 'image/jpeg' });

  console.log('Response Status:', res.status);
  console.log('Response Body:', res.body);

  if (res.status === 200 && res.body.data && res.body.data.url) {
    console.log('SUCCESS: Image uploaded to Cloudinary successfully.');
    console.log('Secure URL:', res.body.data.url);
  } else {
    console.error('FAILED to upload image.');
  }

  // Cleanup
  await Farmer.deleteOne({ _id: farmer._id });
  await mongoose.disconnect();
  console.log('--- TEST COMPLETE ---');
}

runRealTest().catch(console.error);
