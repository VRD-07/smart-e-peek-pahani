require('dotenv').config();
const mongoose = require('mongoose');
const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');
const env = require('../src/config/env');

// Demo data
const villages = ['Demo Village 1', 'Demo Village 2', 'Demo Village 3'];
const districts = ['Ahilyanagar', 'Pune', 'Nashik'];

// Helper to generate a polygon given a center point and size
const generatePolygon = (centerLat, centerLng, offset = 0.001) => {
  return [
    [
      [centerLng - offset, centerLat - offset],
      [centerLng + offset, centerLat - offset],
      [centerLng + offset, centerLat + offset],
      [centerLng - offset, centerLat + offset],
      [centerLng - offset, centerLat - offset]
    ]
  ];
};

const gatsData = [
  {
    gatNumber: '101',
    village: villages[0],
    district: districts[0],
    cropTypes: ['soybean', 'cotton'],
    center: { latitude: 19.1235, longitude: 74.1235 },
    boundary: { type: 'Polygon', coordinates: generatePolygon(19.1235, 74.1235) }
  },
  {
    gatNumber: '102',
    village: villages[0],
    district: districts[0],
    cropTypes: ['soybean'],
    center: { latitude: 19.1255, longitude: 74.1255 },
    boundary: { type: 'Polygon', coordinates: generatePolygon(19.1255, 74.1255) }
  },
  {
    gatNumber: '103',
    village: villages[0],
    district: districts[0],
    cropTypes: ['cotton'],
    center: { latitude: 19.1275, longitude: 74.1275 },
    boundary: { type: 'Polygon', coordinates: generatePolygon(19.1275, 74.1275) }
  },
  {
    gatNumber: '201',
    village: villages[1],
    district: districts[1],
    cropTypes: ['soybean'],
    center: { latitude: 18.5204, longitude: 73.8567 },
    boundary: { type: 'Polygon', coordinates: generatePolygon(18.5204, 73.8567) }
  },
  {
    gatNumber: '202',
    village: villages[1],
    district: districts[1],
    cropTypes: ['cotton'],
    center: { latitude: 18.5224, longitude: 73.8587 },
    boundary: { type: 'Polygon', coordinates: generatePolygon(18.5224, 73.8587) }
  },
  {
    gatNumber: '203',
    village: villages[1],
    district: districts[1],
    cropTypes: ['soybean', 'cotton'],
    center: { latitude: 18.5244, longitude: 73.8607 },
    boundary: { type: 'Polygon', coordinates: generatePolygon(18.5244, 73.8607) }
  },
  {
    gatNumber: '301',
    village: villages[2],
    district: districts[2],
    cropTypes: ['soybean'],
    center: { latitude: 19.9975, longitude: 73.7898 },
    boundary: { type: 'Polygon', coordinates: generatePolygon(19.9975, 73.7898) }
  },
  {
    gatNumber: '302',
    village: villages[2],
    district: districts[2],
    cropTypes: ['cotton'],
    center: { latitude: 19.9995, longitude: 73.7918 },
    boundary: { type: 'Polygon', coordinates: generatePolygon(19.9995, 73.7918) }
  },
  {
    gatNumber: '303',
    village: villages[2],
    district: districts[2],
    cropTypes: ['soybean'],
    center: { latitude: 20.0015, longitude: 73.7938 },
    boundary: { type: 'Polygon', coordinates: generatePolygon(20.0015, 73.7938) }
  },
  {
    gatNumber: '304',
    village: villages[2],
    district: districts[2],
    cropTypes: ['soybean', 'cotton'],
    center: { latitude: 20.0035, longitude: 73.7958 },
    boundary: { type: 'Polygon', coordinates: generatePolygon(20.0035, 73.7958) }
  }
];

const seedData = async () => {
  try {
    const mongoUri = env.mongoUri || 'mongodb://127.0.0.1:27017/smart-e-peek-pahani';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    await Gat.deleteMany({});
    await Farmer.deleteMany({});
    console.log('Cleared existing data.');

    // Insert Gats
    const createdGats = await Gat.insertMany(gatsData);
    console.log(`Inserted ${createdGats.length} Gats.`);

    // Insert Demo Farmer
    const farmerData = {
      name: 'Demo Farmer',
      phoneNumber: '+919999999999',
      preferredLanguage: 'mr',
      selectedGatId: createdGats[0]._id
    };
    const createdFarmer = await Farmer.create(farmerData);
    console.log(`Inserted Demo Farmer: ${createdFarmer.name} (${createdFarmer.phoneNumber})`);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
