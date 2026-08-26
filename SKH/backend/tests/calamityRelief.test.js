const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');
const Officer = require('../src/models/Officer');
const Submission = require('../src/models/Submission');
const CalamityZone = require('../src/models/CalamityZone');
const CalamityMatch = require('../src/models/CalamityMatch');
const NotificationLog = require('../src/models/NotificationLog');
const env = require('../src/config/env');
const {
  runCalamityMatching,
  findMatchingSubmissions,
  gatIntersectsZone,
  isCropAffected,
  buildReliefBody,
} = require('../src/services/relief/calamityMatchingService');
const { SKIP_REASONS, CALAMITY_TYPES } = require('../src/services/relief/constants');
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

// Squares sized like the demo Gats: ~29m across, far smaller than the zones.
const square = (lat, lng, offset = 0.00013) => ({
  type: 'Polygon',
  coordinates: [[
    [lng - offset, lat - offset],
    [lng + offset, lat - offset],
    [lng + offset, lat + offset],
    [lng - offset, lat + offset],
    [lng - offset, lat - offset],
  ]],
});

describe('Calamity Relief Matching (Phase 3)', () => {
  let mongoServer;
  let gatInside, gatOutside;
  let farmer;
  let officer;

  const HOUR = 60 * 60 * 1000;

  const officerToken = () => jwt.sign(
    { officerId: officer._id, role: 'officer' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  const farmerToken = () => jwt.sign(
    { farmerId: farmer._id, role: 'farmer' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  const createZone = (overrides = {}) => CalamityZone.create({
    name: 'Test declaration',
    calamityType: CALAMITY_TYPES.UNSEASONAL_RAIN,
    // Default: an hour from now, so a submission created during the test counts
    // as having existed when the calamity was declared.
    declaredDate: new Date(Date.now() + HOUR),
    boundary: square(19.9005, 74.4945, 0.0015),
    affectedCropTypes: [],
    district: 'Nashik',
    ...overrides,
  });

  const createSubmission = async (overrides = {}) => {
    const { gat = gatInside, status = 'VALID', crop = 'soybean', createdAt, ...rest } = overrides;

    const submission = await Submission.create({
      clientSubmissionId: `sub_${Math.random().toString(36).slice(2)}`,
      farmerId: farmer._id,
      source: 'WEB',
      gatId: gat._id,
      crop: { declaredCrop: crop },
      location: {
        latitude: gat.center.latitude,
        longitude: gat.center.longitude,
        source: 'WEB_GPS',
      },
      image: { url: 'https://res.cloudinary.com/mock/img.jpg', mimeType: 'image/jpeg', size: 5000 },
      status,
      ...rest,
    });

    if (createdAt) {
      // createdAt is immutable under `timestamps: true`, so backdate through the
      // raw driver.
      await Submission.collection.updateOne(
        { _id: submission._id },
        { $set: { createdAt } }
      );
      return Submission.findById(submission._id);
    }

    return submission;
  };

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
      Submission.deleteMany({}),
      CalamityZone.deleteMany({}),
      CalamityMatch.deleteMany({}),
      NotificationLog.deleteMany({}),
      Farmer.deleteMany({}),
      Gat.deleteMany({}),
      Officer.deleteMany({}),
    ]);

    resetNotificationProvider();
    getNotificationProvider().reset();

    // Inside the default zone.
    gatInside = await Gat.create({
      gatNumber: '101',
      village: 'Demo Village',
      district: 'Nashik',
      cropTypes: ['soybean', 'cotton'],
      center: { latitude: 19.9005, longitude: 74.4945 },
      boundary: square(19.9005, 74.4945),
    });

    // ~2.5km away, well outside the default zone.
    gatOutside = await Gat.create({
      gatNumber: '102',
      village: 'Demo Village',
      district: 'Nashik',
      cropTypes: ['soybean'],
      center: { latitude: 19.8787, longitude: 74.4809 },
      boundary: square(19.8787, 74.4809),
    });

    farmer = await Farmer.create({
      name: 'Demo Farmer',
      phoneNumber: '1234567890',
      preferredLanguage: 'en',
      associatedGats: [gatInside._id, gatOutside._id],
    });

    officer = await Officer.create({
      name: 'Demo Officer',
      employeeId: 'OFFICER001',
      passwordHash: 'x'.repeat(20),
      role: 'officer',
      jurisdiction: { district: 'Nashik' },
    });
  });

  // ---------------------------------------------------------------------------
  describe('Zone / field geometry', () => {

    it('1. should match a field fully inside the zone', () => {
      const zone = square(19.9005, 74.4945, 0.0015);
      expect(gatIntersectsZone(square(19.9005, 74.4945), zone)).toBe(true);
    });

    it('2. should match a field that only partially overlaps the zone', () => {
      // Zone edge cuts through the parcel.
      const zone = square(19.9005, 74.4945, 0.0015);
      const straddling = square(19.9005, 74.4945 + 0.0015);
      expect(gatIntersectsZone(straddling, zone)).toBe(true);
    });

    it('3. should not match a disjoint field', () => {
      const zone = square(19.9005, 74.4945, 0.0015);
      expect(gatIntersectsZone(square(19.8787, 74.4809), zone)).toBe(false);
    });

    it('4. should match a field that only touches the zone edge', () => {
      // booleanIntersects, not booleanWithin: a parcel on the boundary of a
      // flood zone is partially affected and belongs in front of an officer.
      const zone = square(19.9005, 74.4945, 0.001);
      const touching = square(19.9005, 74.4945 + 0.001 + 0.00013);
      expect(gatIntersectsZone(touching, zone)).toBe(true);
    });

    it('5. should return false rather than throw on malformed geometry', () => {
      const zone = square(19.9005, 74.4945, 0.0015);
      expect(gatIntersectsZone(null, zone)).toBe(false);
      expect(gatIntersectsZone({ coordinates: [[[0, 0]]] }, zone)).toBe(false);
      expect(gatIntersectsZone(square(19.9, 74.49), null)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Verified filings only', () => {

    it('6. should match a VALID submission inside the zone', async () => {
      const zone = await createZone();
      await createSubmission({ status: 'VALID' });

      const { matches } = await findMatchingSubmissions(zone);
      expect(matches).toHaveLength(1);
    });

    it.each(['REVIEW', 'INVALID', 'PENDING_VALIDATION', 'DRAFT', 'SYNC_PENDING'])(
      '7. should not match a %s submission — relief eligibility is a stronger claim than "on file"',
      async (status) => {
        const zone = await createZone();
        await createSubmission({ status });

        const { matches } = await findMatchingSubmissions(zone);
        expect(matches).toHaveLength(0);
      }
    );

    it('8. should not match a verified submission whose field lies outside the zone', async () => {
      const zone = await createZone();
      await createSubmission({ gat: gatOutside });

      const { matches, gatsInZone } = await findMatchingSubmissions(zone);
      expect(gatsInZone).toBe(1); // only gatInside
      expect(matches).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Filing must predate the declaration', () => {

    it('9. should match a filing that already existed when the calamity was declared', async () => {
      const zone = await createZone({ declaredDate: new Date(Date.now() + HOUR) });
      await createSubmission({ createdAt: new Date(Date.now() - HOUR) });

      const { matches } = await findMatchingSubmissions(zone);
      expect(matches).toHaveLength(1);
    });

    it('10. should not match a filing created after the declaration', async () => {
      // A record created after the news cannot be evidence of what was standing
      // in the field when the calamity struck.
      const zone = await createZone({ declaredDate: new Date(Date.now() - HOUR) });
      await createSubmission();

      const { matches, skipped } = await findMatchingSubmissions(zone);
      expect(matches).toHaveLength(0);
      expect(skipped).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ reason: SKIP_REASONS.FILED_AFTER_DECLARATION }),
        ])
      );
    });
  });

  // ---------------------------------------------------------------------------
  describe('Crop scoping', () => {

    it('11. should treat an empty affectedCropTypes as "every crop in the zone"', () => {
      expect(isCropAffected('soybean', [])).toBe(true);
      expect(isCropAffected('anything', undefined)).toBe(true);
    });

    it('12. should restrict to the crops named in the declaration', () => {
      expect(isCropAffected('cotton', ['cotton'])).toBe(true);
      expect(isCropAffected('soybean', ['cotton'])).toBe(false);
    });

    it('13. should compare crop names case-insensitively', () => {
      // Declared crop text arrives from free-form WhatsApp replies.
      expect(isCropAffected('Cotton', ['cotton'])).toBe(true);
      expect(isCropAffected(' COTTON ', ['Cotton'])).toBe(true);
    });

    it('14. should skip an unaffected crop with an explainable reason', async () => {
      const zone = await createZone({ affectedCropTypes: ['cotton'] });
      await createSubmission({ crop: 'soybean' });

      const { matches, skipped } = await findMatchingSubmissions(zone);
      expect(matches).toHaveLength(0);
      expect(skipped).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ reason: SKIP_REASONS.CROP_NOT_AFFECTED }),
        ])
      );
    });

    it('15. should match when the declared crop is named', async () => {
      const zone = await createZone({ affectedCropTypes: ['cotton', 'maize'] });
      await createSubmission({ crop: 'cotton' });

      const { matches } = await findMatchingSubmissions(zone);
      expect(matches).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Persistence and idempotency', () => {

    it('16. should record a match', async () => {
      const zone = await createZone();
      const submission = await createSubmission();

      const summary = await runCalamityMatching();
      expect(summary.matchesCreated).toBe(1);

      const match = await CalamityMatch.findOne({ submissionId: submission._id });
      expect(match).not.toBeNull();
      expect(match.calamityZoneId.toString()).toBe(zone._id.toString());
      expect(match.declaredCrop).toBe('soybean');
      expect(match.farmerId.toString()).toBe(farmer._id.toString());
    });

    it('17. should create nothing new on a second run', async () => {
      await createZone();
      await createSubmission();

      await runCalamityMatching();
      const second = await runCalamityMatching();

      expect(second.matchesCreated).toBe(0);
      expect(second.matchesExisting).toBe(1);
      expect(await CalamityMatch.countDocuments({})).toBe(1);
    });

    it('18. should skip inactive declarations', async () => {
      await createZone({ isActive: false });
      await createSubmission();

      const summary = await runCalamityMatching();
      expect(summary.zonesProcessed).toBe(0);
      expect(await CalamityMatch.countDocuments({})).toBe(0);
    });

    it('19. should restrict to one declaration when zoneId is given', async () => {
      const zoneA = await createZone({ name: 'Zone A' });
      await createZone({ name: 'Zone B' });
      await createSubmission();

      const summary = await runCalamityMatching({ zoneId: zoneA._id });
      expect(summary.zonesProcessed).toBe(1);
      expect(await CalamityMatch.countDocuments({})).toBe(1);
    });

    it('20. should let one filing match two overlapping declarations', async () => {
      // A field can be hit by a flood and later a hailstorm; each declaration is
      // assessed separately.
      await createZone({ name: 'Flood', calamityType: CALAMITY_TYPES.FLOOD });
      await createZone({ name: 'Hailstorm', calamityType: CALAMITY_TYPES.HAILSTORM });
      const submission = await createSubmission();

      await runCalamityMatching();
      expect(await CalamityMatch.countDocuments({ submissionId: submission._id })).toBe(2);
    });

    it('21. should compute matches without sending when notify is false', async () => {
      await createZone();
      await createSubmission();

      const summary = await runCalamityMatching({ notify: false });

      expect(summary.matchesCreated).toBe(1);
      expect(summary.notificationsSent).toBe(0);
      expect(getNotificationProvider().getSentMessages()).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Farmer notification', () => {

    it('22. should send one WhatsApp message per match', async () => {
      await createZone();
      await createSubmission();

      const summary = await runCalamityMatching();

      expect(summary.notificationsSent).toBe(1);
      const sent = getNotificationProvider().getSentMessages();
      expect(sent).toHaveLength(1);
      expect(sent[0].to).toBe('whatsapp:+911234567890');
    });

    it('23. should name the calamity, field, crop and filing date', async () => {
      await createZone({ calamityType: CALAMITY_TYPES.HAILSTORM });
      await createSubmission({ crop: 'cotton' });

      await runCalamityMatching();
      const [sent] = getNotificationProvider().getSentMessages();

      expect(sent.body).toContain('Hailstorm');
      expect(sent.body).toContain('Gat 101');
      expect(sent.body).toContain('cotton');
      // DD/MM/YYYY, the format used on Indian government forms.
      expect(sent.body).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('24. should not message the same farmer twice for the same declaration', async () => {
      await createZone();
      await createSubmission();

      await runCalamityMatching();
      const second = await runCalamityMatching();

      expect(second.notificationsSent).toBe(0);
      expect(second.notificationsSkipped).toBe(1);
      expect(getNotificationProvider().getSentMessages()).toHaveLength(1);
      expect(await NotificationLog.countDocuments({ type: 'CALAMITY_RELIEF' })).toBe(1);
    });

    it('25. should mark the match as notified, and keep it marked on re-run', async () => {
      await createZone();
      const submission = await createSubmission();

      await runCalamityMatching();
      expect((await CalamityMatch.findOne({ submissionId: submission._id })).farmerNotified).toBe(true);

      await runCalamityMatching();
      expect((await CalamityMatch.findOne({ submissionId: submission._id })).farmerNotified).toBe(true);
    });

    it('26. should write to the notification audit trail', async () => {
      await createZone();
      await createSubmission();

      await runCalamityMatching();

      const log = await NotificationLog.findOne({ type: 'CALAMITY_RELIEF' });
      expect(log.status).toBe('SENT');
      expect(log.provider).toBe('mock');
      expect(log.farmerId.toString()).toBe(farmer._id.toString());
    });

    it('27. should message the farmer in their own language', async () => {
      await Farmer.findByIdAndUpdate(farmer._id, { preferredLanguage: 'mr' });
      await createZone();
      await createSubmission();

      await runCalamityMatching();
      const [sent] = getNotificationProvider().getSentMessages();

      expect(sent.body).toContain('आपत्ती');   // "calamity"
      expect(sent.body).toContain('गट 101');
    });

    it('28. should render the message in all three languages', async () => {
      const zone = await createZone();
      const submission = await createSubmission();
      const gat = gatInside;

      for (const [language, marker] of [['mr', 'आपत्ती'], ['hi', 'आपदा'], ['en', 'calamity']]) {
        const body = buildReliefBody({ zone, submission, gat, language });
        expect(body).toContain(marker);
        expect(body).not.toContain('{{');   // every placeholder filled
      }
    });

    it('29. should not overstate the outcome in any language', async () => {
      const zone = await createZone();
      const submission = await createSubmission();

      // A match means "may qualify, go get assessed" — never a promised payout.
      const forbidden = ['guarantee', 'guaranteed', '100%', 'fraud-proof', 'will receive', 'approved payout'];

      for (const language of ['mr', 'hi', 'en']) {
        const body = buildReliefBody({ zone, submission, gat: gatInside, language }).toLowerCase();
        for (const phrase of forbidden) {
          expect(body).not.toContain(phrase);
        }
      }

      const english = buildReliefBody({ zone, submission, gat: gatInside, language: 'en' });
      expect(english).toContain('may qualify');
      expect(english).toContain('not an approval');
    });

    it('30. should still record the match when the send fails', async () => {
      // Notification failure must not lose the officer-side flag: the farmer can
      // be reached later, but the eligibility record has to survive.
      await Farmer.findByIdAndUpdate(farmer._id, { phoneNumber: 'whatsapp:+fail0001' });
      await createZone();
      const submission = await createSubmission();

      const summary = await runCalamityMatching();

      expect(summary.notificationsFailed).toBe(1);
      expect(summary.matchesCreated).toBe(1);

      const match = await CalamityMatch.findOne({ submissionId: submission._id });
      expect(match).not.toBeNull();
      expect(match.farmerNotified).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  describe('Officer Dashboard surfacing', () => {

    const listSubmissions = (query = {}) => request(app)
      .get('/api/submissions')
      .query(query)
      .set('Authorization', `Bearer ${officerToken()}`);

    it('31. should report how many verified filings sit in a declared zone', async () => {
      await createZone();
      await createSubmission();                 // inside  -> matched
      await createSubmission({ gat: gatOutside }); // outside -> not matched
      await runCalamityMatching();

      const res = await listSubmissions();

      expect(res.status).toBe(200);
      expect(res.body.data.reliefEligibleCount).toBe(1);
      expect(res.body.data.pagination.total).toBe(2);
    });

    it('32. should filter to relief-eligible submissions', async () => {
      await createZone();
      const matched = await createSubmission();
      await createSubmission({ gat: gatOutside });
      await runCalamityMatching();

      const res = await listSubmissions({ reliefEligible: 'true' });

      expect(res.body.data.submissions).toHaveLength(1);
      expect(res.body.data.submissions[0]._id).toBe(matched._id.toString());
    });

    it('33. should filter to submissions with no declaration over them', async () => {
      await createZone();
      await createSubmission();
      const unmatched = await createSubmission({ gat: gatOutside });
      await runCalamityMatching();

      const res = await listSubmissions({ reliefEligible: 'false' });

      expect(res.body.data.submissions).toHaveLength(1);
      expect(res.body.data.submissions[0]._id).toBe(unmatched._id.toString());
    });

    it('34. should attach the matching declaration to each row for the badge', async () => {
      const zone = await createZone({ name: 'Sample declaration — Heavy rainfall' });
      await createSubmission();
      await runCalamityMatching();

      const res = await listSubmissions({ reliefEligible: 'true' });
      const [row] = res.body.data.submissions;

      expect(row.calamityMatches).toHaveLength(1);
      expect(row.calamityMatches[0].calamityZone.name).toBe('Sample declaration — Heavy rainfall');
      expect(row.calamityMatches[0].calamityZone._id).toBe(zone._id.toString());
      expect(row.calamityMatches[0].farmerNotified).toBe(true);
    });

    it('35. should return an empty match list for unmatched rows rather than omitting the field', async () => {
      await createSubmission();

      const res = await listSubmissions();
      expect(res.body.data.submissions[0].calamityMatches).toEqual([]);
      expect(res.body.data.reliefEligibleCount).toBe(0);
    });

    it('36. should reject a malformed reliefEligible value instead of ignoring it', async () => {
      const res = await listSubmissions({ reliefEligible: 'maybe' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('37. should combine the relief filter with the existing filters', async () => {
      await createZone();
      await createSubmission();
      await runCalamityMatching();

      const match = await listSubmissions({ reliefEligible: 'true', district: 'Nashik', status: 'VALID' });
      expect(match.body.data.submissions).toHaveLength(1);

      // gatOutside is in the same district but outside the zone.
      const miss = await listSubmissions({ reliefEligible: 'true', gatId: gatOutside._id.toString() });
      expect(miss.body.data.submissions).toHaveLength(0);
    });

    it('38. should stay officer-only', async () => {
      await createZone();
      await createSubmission();
      await runCalamityMatching();

      const res = await request(app)
        .get('/api/submissions')
        .query({ reliefEligible: 'true' })
        .set('Authorization', `Bearer ${farmerToken()}`);

      expect(res.status).toBe(403);
    });
  });
});
