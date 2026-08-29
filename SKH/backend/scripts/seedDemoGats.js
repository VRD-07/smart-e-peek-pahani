const mongoose = require('mongoose');
const env = require('../src/config/env');
const Gat = require('../src/models/Gat');
const Farmer = require('../src/models/Farmer');
const { normalizeStoredPhoneNumbers } = require('../src/utils/phone');

// The number the demo logs in as, and the one every seeded Gat is associated with.
// Canonical from the start: a seed that writes bare digits reintroduces exactly the
// format split that made the bot answer "not registered".
const DEMO_FARMER_PHONE = '+911234567890';

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
  { id: '106', lat: 19.9040, lng: 74.4975, offset: 0.00045, registeredArea: 2.5 },
];

// 15 meters in degrees (approx) to prevent overlaps of closely spaced points
const OFFSET = 0.00013;

// Stand-in for the figure on the 7/12 record, in hectares. Deliberately not
// measured off the demo polygon: those are traced small enough to sit side by side
// on a map, and an area computed from one would be a fraction of a hectare, making
// every ordinary filing look overallocated. See the note in models/Gat.js.
const DEFAULT_REGISTERED_AREA_HECTARES = 1.2;

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
        village: 'Murshatpur',
        district: 'Nashik', // Maharashtra region for Murshatpur
        cropTypes: ['soybean', 'cotton', 'onion', 'sugarcane', 'wheat', 'maize'],
        // The polygon is the whole point of the record: without it the location
        // check fails every submission with 'Invalid polygon boundary', the area
        // check degrades to SKIPPED, and the demo scenarios crash reading
        // `center.latitude`. An upsert skips `required` validators, so a missing
        // boundary here does not announce itself — it just quietly breaks
        // everything downstream.
        boundary,
        center: { latitude: coord.lat, longitude: coord.lng },
        registeredArea: coord.registeredArea || DEFAULT_REGISTERED_AREA_HECTARES,
      };

      const gat = await Gat.findOneAndUpdate(
        { gatNumber: coord.id },
        { $set: gatData },
        { upsert: true, new: true }
      );

      gatIds.push(gat._id);
      console.log(`Seeded Gat ${coord.id}`);
    }

    // Repair numbers stored before normalization, so a database carried over from
    // an earlier deploy does not keep one farmer under two formats.
    const migration = await normalizeStoredPhoneNumbers(Farmer);
    if (migration.normalized > 0 || migration.conflicts.length > 0) {
      console.log(`Normalized ${migration.normalized}/${migration.scanned} farmer phone numbers`);
      migration.conflicts.forEach(({ phoneNumber, canonical }) => {
        console.warn(`  Conflict: ${phoneNumber} already exists as ${canonical} — left as-is`);
      });
    }

    // Assign to demo farmer
    let farmer = await Farmer.findOne({ phoneNumber: DEMO_FARMER_PHONE });

    if (!farmer) {
      console.log('Demo farmer not found! Creating one...');
      farmer = await Farmer.create({
        name: 'Demo Farmer',
        phoneNumber: DEMO_FARMER_PHONE,
        // Marathi, like every other default in the system — the demo farmer is a
        // Marathi speaker, not an English-speaking special case.
        preferredLanguage: 'mr',
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

module.exports = { seed, GAT_COORDS, OFFSET, DEMO_FARMER_PHONE, createPolygon };
