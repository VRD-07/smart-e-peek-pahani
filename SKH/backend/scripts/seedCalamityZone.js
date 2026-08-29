const mongoose = require('mongoose');
const env = require('../src/config/env');
const CalamityZone = require('../src/models/CalamityZone');
const Submission = require('../src/models/Submission');
const { CALAMITY_TYPES } = require('../src/services/relief/constants');

// Two sample declarations sized against the demo Gats seeded by seedDemoGats.js.
//
// Gats 101/103/104/105 sit in a tight cluster around 19.9005 N, 74.4945 E while
// Gat 102 is roughly 2.5 km south-west. That split is deliberate here: the first
// zone covers the cluster and must NOT reach Gat 102, which is what makes the
// geometry test visible in the demo rather than something you have to take on
// trust.
//
// Both are clearly-labelled sample data. Real declarations would arrive from the
// state's disaster-management feed, which requires a state MoU.
const DEMO_ZONES = [
  {
    name: 'Sample declaration — Heavy rainfall, Demo Village cluster',
    calamityType: CALAMITY_TYPES.UNSEASONAL_RAIN,
    district: 'Nashik',
    // Covers Gats 101, 103, 104 and 105. Excludes Gat 102.
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [74.4930, 19.8995],
        [74.4960, 19.8995],
        [74.4960, 19.9020],
        [74.4930, 19.9020],
        [74.4930, 19.8995],
      ]],
    },
    // Empty: the declaration did not single out crops, so every crop in the zone
    // is in scope.
    affectedCropTypes: [],
    notes: 'Sample/demo calamity zone seeded for the hackathon walkthrough. Not an official declaration.',
  },
  {
    name: 'Sample declaration — Hailstorm, Gat 102 (cotton only)',
    calamityType: CALAMITY_TYPES.HAILSTORM,
    district: 'Nashik',
    // Covers Gat 102 only.
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [74.4802, 19.8780],
        [74.4816, 19.8780],
        [74.4816, 19.8794],
        [74.4802, 19.8794],
        [74.4802, 19.8780],
      ]],
    },
    // Crop-scoped, to show that a declaration naming specific crops does not
    // sweep in every filing inside the polygon.
    affectedCropTypes: ['cotton'],
    notes: 'Sample/demo calamity zone seeded for the hackathon walkthrough. Not an official declaration.',
  },
];

async function seed(skipConnect = false) {
  try {
    if (!skipConnect) {
      await mongoose.connect(env.mongoUri);
      console.log('Connected to DB');
    }

    for (const zone of DEMO_ZONES) {
      // declaredDate is refreshed to "now" on every run. Only filings that
      // already existed when the calamity was declared can be matched, so
      // re-running this after filing a demo submission is what makes the
      // submission eligible — mirroring the real sequence, where the record is
      // filed during the season and the declaration comes later.
      await CalamityZone.findOneAndUpdate(
        { name: zone.name },
        { $set: { ...zone, declaredDate: new Date(), isActive: true } },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`Seeded calamity zone: ${zone.name}`);
    }

    const validCount = await Submission.countDocuments({ status: 'VALID' });
    console.log(`\n${validCount} VALID submission(s) currently on file.`);

    if (validCount === 0) {
      console.log('Nothing to match yet — file a submission (demo scenario 1), then re-run this script.');
    } else {
      console.log('Next: node scripts/runCalamityMatching.js');
    }

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

module.exports = { seed, DEMO_ZONES };
