const mongoose = require('mongoose');
const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');
const env = require('../src/config/env');

async function fixFarmer() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('Connected to DB');

    // 1. Find Farmer
    const farmerPhone = 'whatsapp:+919272556195';
    let farmer = await Farmer.findOne({ phoneNumber: farmerPhone });

    if (!farmer) {
      console.log('Farmer not found:', farmerPhone);
      process.exit(1);
    }

    console.log('Found Farmer:', farmer._id);
    console.log('Preferred Language:', farmer.preferredLanguage);

    // 2. Find Gats
    const gatNumbers = ['101', '102', '103', '104', '105'];
    const gats = await Gat.find({ gatNumber: { $in: gatNumbers } });

    if (gats.length !== 5) {
      console.log('Expected 5 gats, found:', gats.length);
      process.exit(1);
    }

    const expectedCoordinates = {
      '101': [74.4939745930154, 19.901255644016928],
      '102': [74.48089350751991, 19.878711131993455],
      '103': [74.4948416352007, 19.90035335154627],
      '104': [74.49495428797766, 19.900640864256825],
      '105': [74.49491465336934, 19.901061250502313]
    };

    let allCoordsMatch = true;
    const associatedGats = [];
    const gatIds = {};

    for (const gatNum of gatNumbers) {
      const gat = gats.find(g => g.gatNumber === gatNum);
      gatIds[gatNum] = gat._id.toString();
      associatedGats.push(gat._id);

      // Verify coordinate (center)
      const expectedLon = expectedCoordinates[gatNum][0];
      const expectedLat = expectedCoordinates[gatNum][1];

      const actualLon = gat.center.longitude;
      const actualLat = gat.center.latitude;

      // Let's print out the coordinates to verify visually.
      console.log(`Gat ${gatNum} ID: ${gat._id} - Expected: [${expectedLon}, ${expectedLat}] Actual: [${actualLon}, ${actualLat}]`);
      if (Math.abs(expectedLon - actualLon) > 0.0001 || Math.abs(expectedLat - actualLat) > 0.0001) {
        console.error(`Coordinate mismatch for Gat ${gatNum}!`);
        allCoordsMatch = false;
      }
    }

    if (!allCoordsMatch) {
      console.log('Coordinates do not match. Aborting.');
      process.exit(1);
    }

    // 3. Update Farmer
    farmer.associatedGats = associatedGats;
    if (farmer.selectedGatId) {
      farmer.selectedGatId = undefined; // Unset legacy field
    }
    await farmer.save();

    console.log('Update successful!');
    console.log(`Farmer ${farmerPhone} now has ${farmer.associatedGats.length} associated Gats.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixFarmer();
