const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const SchemeDeadline = require('../src/models/SchemeDeadline');
const {
  seed,
  DEMO_DEADLINE,
  DAYS_UNTIL_DEADLINE,
} = require('../scripts/seedSchemeDeadline');
const { dueReminderOffset } = require('../src/services/notifications/awarenessService');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await SchemeDeadline.deleteMany({});
});

describe('Demo Scheme Deadline Seeding Verification', () => {

  it('1. should seed an active demo deadline scoped to the demo district', async () => {
    await seed(true); // skipConnect = true

    const deadline = await SchemeDeadline.findOne({ season: DEMO_DEADLINE.season });
    expect(deadline).not.toBeNull();
    expect(deadline.district).toBe(DEMO_DEADLINE.district);
    expect(deadline.isActive).toBe(true);
    expect(deadline.reminderOffsetsDays).toEqual(DEMO_DEADLINE.reminderOffsetsDays);
  });

  it('2. should label itself as sample data rather than an official date', async () => {
    await seed(true);

    const deadline = await SchemeDeadline.findOne({ season: DEMO_DEADLINE.season });
    expect(deadline.notes.toLowerCase()).toContain('sample');
    expect(deadline.notes.toLowerCase()).toContain('not an official date');
  });

  it('3. should land inside a reminder window so the demo has something to send', async () => {
    await seed(true);

    const deadline = await SchemeDeadline.findOne({ season: DEMO_DEADLINE.season });
    expect(dueReminderOffset(deadline, new Date())).not.toBeNull();
  });

  it('4. should open the season before today so prior filings count as filed', async () => {
    await seed(true);

    const deadline = await SchemeDeadline.findOne({ season: DEMO_DEADLINE.season });
    expect(deadline.seasonStart.getTime()).toBeLessThan(Date.now());
    expect(deadline.deadlineDate.getTime()).toBeGreaterThan(Date.now());
  });

  it('5. should be idempotent', async () => {
    await seed(true);
    await seed(true); // run twice

    const count = await SchemeDeadline.countDocuments({ season: DEMO_DEADLINE.season });
    expect(count).toBe(1);
  });

  it('6. should set the deadline the documented number of days out', async () => {
    await seed(true);

    const deadline = await SchemeDeadline.findOne({ season: DEMO_DEADLINE.season });
    const daysOut = Math.round((deadline.deadlineDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    expect(daysOut).toBe(DAYS_UNTIL_DEADLINE);
  });
});
