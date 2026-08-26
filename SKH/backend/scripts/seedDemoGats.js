const mongoose = require('mongoose');
const env = require('../src/config/env');
const Gat = require('../src/models/Gat');
const Farmer = require('../src/models/Farmer');

const GAT_COORDS = [
  { id: '101', lat: 19.901255644016928, lng: 74.4939745930154 },
  { id: '102', lat: 19.878711131993455, lng: 74.48089350751991 },
  { id: '103', lat: 19.90035335154627, lng: 74.4948416352007 },
  { id: '104', lat: 19.900640864256825, lng: 74.49495428797766 },
  { id: '105', lat: 19.901061250502313, lng: 74.49491465336934 },
  // Gat 106 exists to make boundary-edge review routing demonstrable.
  //
  // Gats 101-105 are deliberately tiny (~27m across) so that five of them fit in
  // a cluster without overlapping. On a parcel that small the review band is
  // capped down to a few metres, so you can never actually stand in it. This one
  // is roughly 94m across — an ordinary smallholding — which is the size at which
  // the full 15m band applies and the rule can be seen working.
  { id: '106', lat: 19.9040, lng: 74.4975, offset: 0.00045 },
];

// 15 meters in degrees (approx) to prevent overlaps of closely spaced points
const OFFSET = 0.00013;

function createPolygon(lat, lng, offset = OFFSET) {
  return {
    type: 'Polygon',
    coordinates: [[
      [lng - offset, lat - offset], // Bottom Left
      [lng + offset, lat - offset], // Bottom Right
      [lng + offset, lat + offset], // Top Right
      [lng - offset, lat + offset], // Top Left
      [lng - offset, lat - offset]  // Close Loop
    ]]
  };
}

async function seed(skipConnect = false) {
  try {
    if (!skipConnect) {
      await mongoose.connect(env.mongoUri);
      console.log('Connected to DB');
    }

    const gatIds = [];

    for (const coord of GAT_COORDS) {
      const boundary = createPolygon(coord.lat, coord.lng, coord.offset);

      const gatData = {
        gatNumber: coord.id,
        village: 'Demo Village',
        district: 'Nashik', // Reasonable district for these coordinates
        cropTypes: ['soybean', 'wheat', 'cotton', 'maize'],
        center: { latitude: coord.lat, longitude: coord.lng },
        boundary: boundary
      };

      const gat = await Gat.findOneAndUpdate(
        { gatNumber: coord.id },
        { $set: gatData },
        { upsert: true, new: true }
      );

      gatIds.push(gat._id);
      console.log(`Seeded Gat ${coord.id}`);
    }

    // Assign to demo farmer
    // Find the primary demo farmer by standard test phone number 1234567890
    let farmer = await Farmer.findOne({ phoneNumber: '1234567890' });

    if (!farmer) {
      console.log('Demo farmer not found! Creating one...');
      farmer = await Farmer.create({
        name: 'Demo Farmer',
        phoneNumber: '1234567890',
        preferredLanguage: 'en',
        associatedGats: gatIds
      });
    } else {
      farmer.associatedGats = gatIds;
      await farmer.save();
    }

    console.log(`Associated ${gatIds.length} Gats to Farmer ${farmer.phoneNumber}`);
    console.log('Done!');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    if (!skipConnect) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed, GAT_COORDS, OFFSET, createPolygon };
