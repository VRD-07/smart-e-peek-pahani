const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const CalamityZone = require('../src/models/CalamityZone');
const CalamityMatch = require('../src/models/CalamityMatch');
const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');
const Submission = require('../src/models/Submission');
const NotificationLog = require('../src/models/NotificationLog');
const { seed, DEMO_ZONES } = require('../scripts/seedCalamityZone');
const { seed: seedGats, GAT_COORDS, createPolygon } = require('../scripts/seedDemoGats');
const {
  runCalamityMatching,
  gatIntersectsZone,
} = require('../src/services/relief/calamityMatchingService');
const {
  getNotificationProvider,
  resetNotificationProvider,
} = require('../src/services/notifications/notificationFactory');

jest.mock('../src/config/env', () => ({
  twilioAuthToken: 'mock_twilio_token',
  storageProvider: 'mock',
  jwtSecret: 'mock_jwt_secret',
  notificationProvider: 'mock',
}));

jest.setTimeout(60000);

let mongoServer;

const demoGatPolygon = (gatNumber) => {
  const coord = GAT_COORDS.find((c) => c.id === gatNumber);
  return createPolygon(coord.lat, coord.lng, coord.offset);
};

const zoneByName = (fragment) => DEMO_ZONES.find((z) => z.name.includes(fragment));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([
    CalamityZone.deleteMany({}),
    CalamityMatch.deleteMany({}),
    Submission.deleteMany({}),
    NotificationLog.deleteMany({}),
    Farmer.deleteMany({}),
    Gat.deleteMany({}),
  ]);

  resetNotificationProvider();
  getNotificationProvider().reset();
});

describe('Demo Calamity Zone Seeding Verification', () => {

  it('1. should seed both sample declarations as active', async () => {
    await seed(true); // skipConnect = true

    expect(await CalamityZone.countDocuments({ isActive: true })).toBe(DEMO_ZONES.length);

    for (const demo of DEMO_ZONES) {
      const zone = await CalamityZone.findOne({ name: demo.name });
      expect(zone).not.toBeNull();
      expect(zone.calamityType).toBe(demo.calamityType);
      expect(zone.district).toBe(demo.district);
      expect(zone.boundary.coordinates).toEqual(demo.boundary.coordinates);
    }
  });

  it('2. should label itself as sample data rather than an official declaration', async () => {
    await seed(true);

    const zones = await CalamityZone.find({});
    expect(zones).toHaveLength(DEMO_ZONES.length);

    for (const zone of zones) {
      expect(zone.notes.toLowerCase()).toContain('sample');
      expect(zone.notes.toLowerCase()).toContain('not an official declaration');
    }
  });

  it('3. should be idempotent', async () => {
    await seed(true);
    await seed(true); // run twice

    expect(await CalamityZone.countDocuments({})).toBe(DEMO_ZONES.length);
  });

  it('4. should declare from "now", so a filing made during the demo becomes eligible', async () => {
    // Only filings that already existed when the calamity was declared can match.
    // Refreshing declaredDate on each run is what makes "file, re-seed, match"
    // work in a live walkthrough.
    const before = Date.now();
    await seed(true);

    const zones = await CalamityZone.find({});
    for (const zone of zones) {
      expect(zone.declaredDate.getTime()).toBeGreaterThanOrEqual(before);
    }
  });

  it('5. should cover Gats 101, 103, 104 and 105 with the rainfall zone', async () => {
    const rainfall = zoneByName('Heavy rainfall').boundary;

    for (const gatNumber of ['101', '103', '104', '105']) {
      expect(gatIntersectsZone(demoGatPolygon(gatNumber), rainfall)).toBe(true);
    }
  });

  it('6. should leave Gat 102 outside the rainfall zone', async () => {
    // The exclusion is the point: it makes the geofence visible in the demo
    // instead of something the audience has to take on trust.
    const rainfall = zoneByName('Heavy rainfall').boundary;
    expect(gatIntersectsZone(demoGatPolygon('102'), rainfall)).toBe(false);
  });

  it('7. should cover only Gat 102 with the hailstorm zone', async () => {
    const hailstorm = zoneByName('Hailstorm').boundary;

    expect(gatIntersectsZone(demoGatPolygon('102'), hailstorm)).toBe(true);
    for (const gatNumber of ['101', '103', '104', '105']) {
      expect(gatIntersectsZone(demoGatPolygon(gatNumber), hailstorm)).toBe(false);
    }
  });

  it('8. should scope the hailstorm declaration to cotton and the rainfall one to every crop', async () => {
    await seed(true);

    const hailstorm = await CalamityZone.findOne({ name: /Hailstorm/ });
    const rainfall = await CalamityZone.findOne({ name: /Heavy rainfall/ });

    expect(hailstorm.affectedCropTypes).toEqual(['cotton']);
    expect(rainfall.affectedCropTypes).toEqual([]);
  });
});

describe('Demo Walkthrough — verified filing inside a declared zone', () => {

  // The acceptance path end to end, on the real demo dataset: a farmer files,
  // the state declares a calamity over their Gat, and the farmer hears about it
  // while the officer sees the flag.
  const fileDemoSubmission = async (gatNumber, crop = 'soybean') => {
    const gat = await Gat.findOne({ gatNumber });
    const farmer = await Farmer.findOne({ phoneNumber: '1234567890' });

    return Submission.create({
      clientSubmissionId: `demo_${gatNumber}_${crop}`,
      farmerId: farmer._id,
      source: 'WHATSAPP',
      gatId: gat._id,
      crop: { declaredCrop: crop },
      location: {
        latitude: gat.center.latitude,
        longitude: gat.center.longitude,
        source: 'WHATSAPP',
      },
      image: { url: 'https://res.cloudinary.com/mock/demo.jpg', mimeType: 'image/jpeg', size: 5000 },
      status: 'VALID',
    });
  };

  beforeEach(async () => {
    await seedGats(true);
  });

  it('9. should notify the farmer and flag the filing when a declaration covers their Gat', async () => {
    const submission = await fileDemoSubmission('101', 'soybean');
    await seed(true); // declaration arrives after the filing

    const summary = await runCalamityMatching();

    expect(summary.matchesCreated).toBe(1);
    expect(summary.notificationsSent).toBe(1);

    const [sent] = getNotificationProvider().getSentMessages();
    expect(sent.to).toBe('whatsapp:+911234567890');
    // Marathi: the demo farmer is seeded with the system's default language, so
    // this is the message a judge actually sees on the phone.
    expect(sent.body).toContain('गट 101');
    expect(sent.body).toContain('soybean');
    expect(sent.body).toContain('पात्र ठरवू शकते');

    const match = await CalamityMatch.findOne({ submissionId: submission._id });
    expect(match.farmerNotified).toBe(true);
  });

  it('10. should leave a filing on Gat 102 out of the rainfall declaration', async () => {
    await fileDemoSubmission('102', 'soybean');
    await seed(true);

    await runCalamityMatching();

    // Gat 102 is outside the rainfall zone, and the hailstorm zone that does
    // cover it is scoped to cotton — so a soybean filing there matches neither.
    expect(await CalamityMatch.countDocuments({})).toBe(0);
    expect(getNotificationProvider().getSentMessages()).toHaveLength(0);
  });

  it('11. should match a cotton filing on Gat 102 to the hailstorm declaration', async () => {
    await fileDemoSubmission('102', 'cotton');
    await seed(true);

    await runCalamityMatching();

    const match = await CalamityMatch.findOne({}).populate('calamityZoneId');
    expect(match).not.toBeNull();
    expect(match.calamityZoneId.name).toContain('Hailstorm');
    expect(match.declaredCrop).toBe('cotton');
  });

  it('12. should notify each affected farmer once, across repeated demo runs', async () => {
    await fileDemoSubmission('101', 'soybean');
    await fileDemoSubmission('103', 'wheat');
    await seed(true);

    const first = await runCalamityMatching();
    expect(first.matchesCreated).toBe(2);
    expect(first.notificationsSent).toBe(2);

    // Re-seeding pushes declaredDate forward again; the matches and messages
    // must not multiply.
    await seed(true);
    const second = await runCalamityMatching();

    expect(second.matchesCreated).toBe(0);
    expect(second.notificationsSent).toBe(0);
    expect(getNotificationProvider().getSentMessages()).toHaveLength(2);
  });
});
