const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const env = require('../src/config/env');
const Officer = require('../src/models/Officer');

// Sample/demo officer account for the Officer Dashboard walkthrough.
// Production deployments would federate officer identity with the state
// revenue-department directory; that integration requires a state MoU.
const DEMO_OFFICER = {
  employeeId: 'OFFICER001',
  name: 'Demo Revenue Officer',
  jurisdiction: { district: 'Nashik', taluka: 'Sinnar' },
};

const DEMO_PASSWORD = process.env.OFFICER_DEMO_PASSWORD || 'demo1234';

async function seed(skipConnect = false) {
  try {
    if (!skipConnect) {
      await mongoose.connect(env.mongoUri);
      console.log('Connected to DB');
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const officer = await Officer.findOneAndUpdate(
      { employeeId: DEMO_OFFICER.employeeId },
      { $set: { ...DEMO_OFFICER, passwordHash } },
      { upsert: true, new: true }
    );

    console.log(`Seeded officer ${officer.employeeId} (${officer.name})`);
    console.log(`Login with employeeId=${officer.employeeId} password=${DEMO_PASSWORD}`);
    console.log('Done!');

    return officer;
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

module.exports = { seed, DEMO_OFFICER, DEMO_PASSWORD };
