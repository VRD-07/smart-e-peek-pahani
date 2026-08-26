const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Officer = require('../src/models/Officer');
const { seed, DEMO_OFFICER, DEMO_PASSWORD } = require('../scripts/seedDemoOfficer');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Officer.deleteMany({});
});

describe('Demo Officer Seeding Verification', () => {

  it('1. should seed the demo officer with a hashed password', async () => {
    await seed(true); // skipConnect = true

    const officer = await Officer.findOne({ employeeId: DEMO_OFFICER.employeeId });
    expect(officer).not.toBeNull();
    expect(officer.name).toBe(DEMO_OFFICER.name);
    expect(officer.jurisdiction.district).toBe(DEMO_OFFICER.jurisdiction.district);
    expect(officer.jurisdiction.taluka).toBe(DEMO_OFFICER.jurisdiction.taluka);

    // The plaintext demo password must never be stored on the document
    expect(officer.passwordHash).toBeDefined();
    expect(officer.passwordHash).not.toBe(DEMO_PASSWORD);
  });

  it('2. should seed an officer role so requireRole("officer") accepts the account', async () => {
    await seed(true);

    const officer = await Officer.findOne({ employeeId: DEMO_OFFICER.employeeId });
    expect(officer.role).toBe('officer');
  });

  it('3. should produce a password hash that verifies against the demo password', async () => {
    await seed(true);

    const officer = await Officer.findOne({ employeeId: DEMO_OFFICER.employeeId });
    await expect(officer.verifyPassword(DEMO_PASSWORD)).resolves.toBe(true);
    await expect(officer.verifyPassword('not-the-password')).resolves.toBe(false);
  });

  it('4. should be idempotent', async () => {
    await seed(true);
    await seed(true); // run twice

    const count = await Officer.countDocuments({ employeeId: DEMO_OFFICER.employeeId });
    expect(count).toBe(1);

    // Re-seeding must leave a working login, not a corrupted hash
    const officer = await Officer.findOne({ employeeId: DEMO_OFFICER.employeeId });
    await expect(officer.verifyPassword(DEMO_PASSWORD)).resolves.toBe(true);
  });
});
