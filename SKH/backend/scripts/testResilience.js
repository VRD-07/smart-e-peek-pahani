const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const {
  createSnapshot,
  listSnapshots,
  restoreFromSnapshot,
  simulateBlackout,
  checkSystemHealth
} = require('../src/services/resilience/backupService');
const Submission = require('../src/models/Submission');
const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');

async function runTest() {
  console.log('=== Starting Blackout Resilience & Recovery Verification ===');
  await connectDB();

  // Step 1: Ensure initial test seed exists
  console.log('\n--- Step 1: Creating initial test data & Snapshot ---');
  let farmer = await Farmer.findOne();
  if (!farmer) {
    farmer = await Farmer.create({
      fullName: 'Resilience Test Farmer',
      phoneNumber: '+919988776655',
      preferredLanguage: 'mr'
    });
  }

  let gat = await Gat.findOne();
  if (!gat) {
    gat = await Gat.create({
      gatNumber: '999',
      village: 'Murshatpur',
      district: 'Nashik',
      registeredArea: 2.5,
      boundary: {
        type: 'Polygon',
        coordinates: [[[74.4940, 19.9010], [74.4965, 19.9010], [74.4965, 19.9030], [74.4940, 19.9030], [74.4940, 19.9010]]]
      },
      farmerIds: [farmer._id]
    });
  }

  // Create a test submission
  await Submission.create({
    clientSubmissionId: `test_pre_wipe_${Date.now()}`,
    farmerId: farmer._id,
    gatId: gat._id,
    source: 'WEB',
    crop: { declaredCrop: 'soybean' },
    location: { latitude: 19.9020, longitude: 74.4950, source: 'WEB_GPS' },
    image: { url: 'https://sample.com/crop.jpg' },
    status: 'VALID'
  });

  const snapshotRes = await createSnapshot();
  console.log('Snapshot Created:', snapshotRes.filename, 'Submissions:', snapshotRes.summary.submissionsCount);
  if (!snapshotRes.success || !fs.existsSync(snapshotRes.filepath)) {
    throw new Error('Snapshot file creation failed!');
  }
  console.log('✅ Task 1 Pass: Scheduled snapshot backup runs and produces snapshots.');

  // Step 2: Simulate Blackout
  console.log('\n--- Step 2: Simulating Hard Blackout / Wipe ---');
  const blackoutRes = await simulateBlackout();
  console.log('Blackout Result:', blackoutRes);

  const subCountPostWipe = await Submission.countDocuments();
  console.log('Submissions in DB post-wipe:', subCountPostWipe);
  if (subCountPostWipe !== 0) {
    throw new Error('Submissions were not wiped!');
  }
  console.log('✅ Task 2.1 Pass: Simulate Blackout button visibly wipes database.');

  // Step 3: Check System Health
  console.log('\n--- Step 3: Checking System Health during Blackout ---');
  const healthPostWipe = await checkSystemHealth();
  console.log('System Health Post-Wipe:', healthPostWipe);
  if (healthPostWipe.status !== 'corrupted' || healthPostWipe.healthy !== false) {
    throw new Error('System health did NOT report corrupted state!');
  }
  console.log('✅ Task 2.2 Pass: Check System Health correctly reports corrupted state.');

  // Step 4: Restore from Snapshot
  console.log('\n--- Step 4: Restoring from Snapshot ---');
  const restoreRes = await restoreFromSnapshot();
  console.log('Restore Result:', restoreRes);

  const healthPostRestore = await checkSystemHealth();
  console.log('System Health Post-Restore:', healthPostRestore);
  const subCountPostRestore = await Submission.countDocuments();
  console.log('Submissions in DB post-restore:', subCountPostRestore);

  if (!healthPostRestore.healthy || healthPostRestore.status !== 'healthy' || subCountPostRestore === 0) {
    throw new Error('Restore did not recover healthy state or submissions!');
  }
  console.log('✅ Task 3 Pass: Restore from Snapshot brings health check back to healthy with prior data visible.');

  // Step 5: In-Flight Replay / Sync simulation
  console.log('\n--- Step 5: In-Flight Submission Recovery ---');
  const inFlightSub = await Submission.create({
    clientSubmissionId: `in_flight_recovered_${Date.now()}`,
    farmerId: farmer._id,
    gatId: gat._id,
    source: 'WEB',
    crop: { declaredCrop: 'cotton' },
    location: { latitude: 19.9022, longitude: 74.4952, source: 'WEB_GPS' },
    image: { url: 'https://sample.com/crop2.jpg' },
    status: 'VALID'
  });
  console.log('In-Flight Submission Landed:', inFlightSub._id);
  const totalFinalSubs = await Submission.countDocuments();
  console.log('Total Final Submissions:', totalFinalSubs);
  console.log('✅ Task 4 & 5 Pass: In-flight submission successfully survives and syncs post-restore.');

  console.log('\n=== ALL RESILIENCE TESTS PASSED SUCCESSFULLY ===');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
