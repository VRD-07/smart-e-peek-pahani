const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../src/config/env', () => ({
  twilioAuthToken: 'mock_twilio_token',
  storageProvider: 'mock',
  jwtSecret: 'mock_jwt_secret',
  notificationProvider: 'mock',
}));

const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');
const Submission = require('../src/models/Submission');
const SchemeDeadline = require('../src/models/SchemeDeadline');
const NotificationLog = require('../src/models/NotificationLog');
const WhatsAppSession = require('../src/models/WhatsAppSession');
const app = require('../server');
const { getMessage } = require('../src/services/whatsapp/messages');
const {
  getNotificationProvider,
  resetNotificationProvider,
} = require('../src/services/notifications/notificationFactory');
const {
  runDeadlineReminders,
  sendAwarenessIntro,
  findFarmersNeedingReminder,
  dueReminderOffset,
  buildReminderBody,
  toWhatsAppAddress,
} = require('../src/services/notifications/awarenessService');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUS,
} = require('../src/services/notifications/constants');

let mongoServer;
let provider;
let nashikGat;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-08-26T09:00:00.000Z');
const daysFromNow = (days) => new Date(NOW.getTime() + days * MS_PER_DAY);

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
    Farmer.deleteMany({}),
    Gat.deleteMany({}),
    Submission.deleteMany({}),
    SchemeDeadline.deleteMany({}),
    NotificationLog.deleteMany({}),
    WhatsAppSession.deleteMany({}),
  ]);

  resetNotificationProvider();
  provider = getNotificationProvider();
  provider.reset();

  nashikGat = await Gat.create({
    gatNumber: '101',
    village: 'Sinnar',
    district: 'Nashik',
    cropTypes: ['Soybean'],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [74.4938, 19.9011], [74.4941, 19.9011],
        [74.4941, 19.9014], [74.4938, 19.9014], [74.4938, 19.9011]
      ]]
    },
    center: { latitude: 19.90125, longitude: 74.49397 },
  });
});

const createDeadline = (overrides = {}) => SchemeDeadline.create({
  season: 'KHARIF',
  year: 2026,
  seasonStart: daysFromNow(-60),
  deadlineDate: daysFromNow(5),
  reminderOffsetsDays: [14, 7, 3, 1],
  district: 'Nashik',
  isActive: true,
  ...overrides,
});

const createFarmer = (overrides = {}) => Farmer.create({
  name: 'Demo Farmer',
  phoneNumber: '9990001111',
  preferredLanguage: 'mr',
  associatedGats: [nashikGat._id],
  ...overrides,
});

const createSubmission = async (farmer, overrides = {}) => {
  const submission = await Submission.create({
    clientSubmissionId: `sub_${Math.floor(Math.random() * 1e9)}`,
    farmerId: farmer._id,
    gatId: nashikGat._id,
    source: 'WEB',
    crop: { declaredCrop: 'Soybean', language: 'mr' },
    location: { latitude: 19.90125, longitude: 74.49397, source: 'WEB_GPS' },
    image: { url: 'https://example.com/a.jpg', mimeType: 'image/jpeg', size: 1024 },
    status: 'VALID',
    ...overrides,
  });

  // Mongoose marks createdAt immutable under `timestamps: true`, so go through
  // the raw driver when a test needs a submission dated to a specific season.
  if (overrides.createdAt) {
    await Submission.collection.updateOne(
      { _id: submission._id },
      { $set: { createdAt: overrides.createdAt } }
    );
  }

  return submission;
};

describe('Awareness Module - Reminder Scheduling Windows', () => {

  it('1. should pick the tightest reminder bucket that covers today', async () => {
    const deadline = await createDeadline({ deadlineDate: daysFromNow(5) });
    // 5 days out: the 7-day bucket is the tightest offset that still covers today.
    expect(dueReminderOffset(deadline, NOW)).toBe(7);
  });

  it('2. should advance to the next bucket as the deadline approaches', async () => {
    const deadline = await createDeadline({ deadlineDate: daysFromNow(2) });
    expect(dueReminderOffset(deadline, NOW)).toBe(3);
  });

  it('3. should return null before any reminder window opens', async () => {
    const deadline = await createDeadline({ deadlineDate: daysFromNow(30) });
    expect(dueReminderOffset(deadline, NOW)).toBeNull();
  });

  it('4. should return null once the deadline has passed', async () => {
    const deadline = await createDeadline({ deadlineDate: daysFromNow(-1) });
    expect(dueReminderOffset(deadline, NOW)).toBeNull();
  });

  it('5. should still fire a bucket when the scheduler missed the exact day', async () => {
    // Offsets are [14, 7, 3, 1] and the deadline is 9 days out. Even though no
    // offset equals 9, the 14-day bucket is due so a skipped day is caught up.
    const deadline = await createDeadline({ deadlineDate: daysFromNow(9) });
    expect(dueReminderOffset(deadline, NOW)).toBe(14);
  });
});

describe('Awareness Module - Finding Farmers With Nothing On File', () => {

  it('6. should include a farmer with no submission this season', async () => {
    const deadline = await createDeadline();
    const farmer = await createFarmer();

    const needing = await findFarmersNeedingReminder(deadline);
    expect(needing.map((f) => f._id.toString())).toEqual([farmer._id.toString()]);
  });

  it('7. should exclude a farmer who already filed this season', async () => {
    const deadline = await createDeadline();
    const farmer = await createFarmer();
    await createSubmission(farmer, { status: 'VALID', createdAt: daysFromNow(-5) });

    const needing = await findFarmersNeedingReminder(deadline);
    expect(needing).toHaveLength(0);
  });

  it('8. should include a farmer whose only submission predates the season', async () => {
    const deadline = await createDeadline();
    const farmer = await createFarmer();
    await createSubmission(farmer, { status: 'VALID', createdAt: daysFromNow(-200) });

    const needing = await findFarmersNeedingReminder(deadline);
    expect(needing.map((f) => f._id.toString())).toEqual([farmer._id.toString()]);
  });

  it('9. should count a REVIEW submission as filed', async () => {
    const deadline = await createDeadline();
    const farmer = await createFarmer();
    await createSubmission(farmer, { status: 'REVIEW', createdAt: daysFromNow(-2) });

    const needing = await findFarmersNeedingReminder(deadline);
    expect(needing).toHaveLength(0);
  });

  it('10. should still remind a farmer whose only submission was REJECTED', async () => {
    // An INVALID submission leaves nothing on record for relief assessment, so
    // the farmer still needs the nudge to re-file before the deadline.
    const deadline = await createDeadline();
    const farmer = await createFarmer();
    await createSubmission(farmer, { status: 'INVALID', createdAt: daysFromNow(-2) });

    const needing = await findFarmersNeedingReminder(deadline);
    expect(needing.map((f) => f._id.toString())).toEqual([farmer._id.toString()]);
  });

  it('11. should still remind a farmer whose submission never left DRAFT', async () => {
    const deadline = await createDeadline();
    const farmer = await createFarmer();
    await createSubmission(farmer, { status: 'DRAFT', createdAt: daysFromNow(-2) });

    const needing = await findFarmersNeedingReminder(deadline);
    expect(needing.map((f) => f._id.toString())).toEqual([farmer._id.toString()]);
  });

  it('12. should scope a district-specific deadline through the Gat district', async () => {
    const deadline = await createDeadline({ district: 'Nashik' });

    const punePolygon = {
      type: 'Polygon',
      coordinates: [[[73.8, 18.5], [73.81, 18.5], [73.81, 18.51], [73.8, 18.51], [73.8, 18.5]]]
    };
    const puneGat = await Gat.create({
      gatNumber: '201',
      village: 'Haveli',
      district: 'Pune',
      cropTypes: ['Cotton'],
      boundary: punePolygon,
      center: { latitude: 18.505, longitude: 73.805 },
    });

    const nashikFarmer = await createFarmer({ phoneNumber: '9990001111' });
    await createFarmer({ phoneNumber: '9990002222', associatedGats: [puneGat._id] });

    const needing = await findFarmersNeedingReminder(deadline);
    expect(needing.map((f) => f._id.toString())).toEqual([nashikFarmer._id.toString()]);
  });

  it('13. should cover every district when the deadline has no district scope', async () => {
    const deadline = await createDeadline({ district: null });
    await createFarmer({ phoneNumber: '9990001111' });
    await createFarmer({ phoneNumber: '9990002222' });

    const needing = await findFarmersNeedingReminder(deadline);
    expect(needing).toHaveLength(2);
  });

  it('14. should skip farmers with no registered parcel', async () => {
    // The reminder tells the farmer to file now; that is not actionable without
    // a Gat, so sending it would be misleading.
    const deadline = await createDeadline({ district: null });
    await createFarmer({ phoneNumber: '9990003333', associatedGats: [] });

    const needing = await findFarmersNeedingReminder(deadline);
    expect(needing).toHaveLength(0);
  });
});

describe('Awareness Module - Deadline Reminder Dispatch', () => {

  it('15. should send a reminder to a farmer with nothing on file', async () => {
    await createDeadline();
    await createFarmer({ phoneNumber: '9990001111' });

    const summary = await runDeadlineReminders({ now: NOW });

    expect(summary.deadlinesDue).toBe(1);
    expect(summary.remindersSent).toBe(1);
    expect(summary.failed).toBe(0);

    const sent = provider.getSentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('whatsapp:+919990001111');
  });

  it('16. should send nothing when no deadline is inside a reminder window', async () => {
    await createDeadline({ deadlineDate: daysFromNow(45) });
    await createFarmer();

    const summary = await runDeadlineReminders({ now: NOW });

    expect(summary.deadlinesDue).toBe(0);
    expect(summary.remindersSent).toBe(0);
    expect(provider.getSentMessages()).toHaveLength(0);
  });

  it('17. should ignore inactive deadlines', async () => {
    await createDeadline({ isActive: false });
    await createFarmer();

    const summary = await runDeadlineReminders({ now: NOW });

    expect(summary.deadlinesDue).toBe(0);
    expect(provider.getSentMessages()).toHaveLength(0);
  });

  it('18. should not send twice for the same reminder bucket', async () => {
    await createDeadline();
    await createFarmer();

    await runDeadlineReminders({ now: NOW });
    const second = await runDeadlineReminders({ now: NOW });

    expect(second.remindersSent).toBe(0);
    expect(second.skipped).toBe(1);
    expect(provider.getSentMessages()).toHaveLength(1);
  });

  it('19. should send again once the next bucket opens', async () => {
    await createDeadline({ deadlineDate: daysFromNow(5) }); // 7-day bucket
    await createFarmer();

    await runDeadlineReminders({ now: NOW });
    // Three days later the deadline is 2 days out, which is the 3-day bucket.
    const later = await runDeadlineReminders({ now: daysFromNow(3) });

    expect(later.remindersSent).toBe(1);
    expect(provider.getSentMessages()).toHaveLength(2);
  });

  it('20. should record an auditable log row per notification', async () => {
    const deadline = await createDeadline();
    const farmer = await createFarmer();

    await runDeadlineReminders({ now: NOW });

    const log = await NotificationLog.findOne({ type: NOTIFICATION_TYPES.DEADLINE_REMINDER });
    expect(log).not.toBeNull();
    expect(log.status).toBe(NOTIFICATION_STATUS.SENT);
    expect(log.provider).toBe('mock');
    expect(log.farmerId.toString()).toBe(farmer._id.toString());
    expect(log.dedupeKey).toBe(`${deadline._id.toString()}:7`);
    expect(log.providerMessageId).toBeTruthy();
    expect(log.sentAt).toBeInstanceOf(Date);
  });

  it('21. should log a failure without blocking the rest of the sweep', async () => {
    await createDeadline({ district: null });
    // The mock provider rejects any recipient containing 'fail'.
    await createFarmer({ phoneNumber: '+fail0001', name: 'Unreachable Farmer' });
    await createFarmer({ phoneNumber: '9990002222', name: 'Reachable Farmer' });

    const summary = await runDeadlineReminders({ now: NOW });

    expect(summary.failed).toBe(1);
    expect(summary.remindersSent).toBe(1);

    const failedLog = await NotificationLog.findOne({ phoneNumber: '+fail0001' });
    expect(failedLog.status).toBe(NOTIFICATION_STATUS.FAILED);
    expect(failedLog.error).toContain('PROVIDER_ERROR');
  });

  it('22. should retry a previously failed reminder on the next run', async () => {
    await createDeadline({ district: null });
    const farmer = await createFarmer({ phoneNumber: '+fail0001' });

    await runDeadlineReminders({ now: NOW });

    // The number becomes reachable; the FAILED log row must not block a resend.
    await Farmer.updateOne({ _id: farmer._id }, { $set: { phoneNumber: '+919990004444' } });
    await NotificationLog.updateOne(
      { phoneNumber: '+fail0001' },
      { $set: { phoneNumber: '+919990004444' } }
    );

    const second = await runDeadlineReminders({ now: NOW });

    expect(second.remindersSent).toBe(1);
    const log = await NotificationLog.findOne({ phoneNumber: '+919990004444' });
    expect(log.status).toBe(NOTIFICATION_STATUS.SENT);
  });

  it('23. should handle multiple due deadlines in one sweep', async () => {
    await createDeadline({ season: 'KHARIF', district: null, deadlineDate: daysFromNow(5) });
    await createDeadline({ season: 'RABI', district: null, deadlineDate: daysFromNow(2) });
    await createFarmer();

    const summary = await runDeadlineReminders({ now: NOW });

    expect(summary.deadlinesDue).toBe(2);
    expect(summary.remindersSent).toBe(2);
    expect(summary.deadlines.map((d) => d.season).sort()).toEqual(['KHARIF', 'RABI']);
  });
});

describe('Awareness Module - Language & Message Content', () => {

  it('24. should send the reminder in the farmer\'s preferred language', async () => {
    await createDeadline({ district: null });
    await createFarmer({ phoneNumber: '9990001111', preferredLanguage: 'mr' });
    await createFarmer({ phoneNumber: '9990002222', preferredLanguage: 'hi' });
    await createFarmer({ phoneNumber: '9990003333', preferredLanguage: 'en' });

    await runDeadlineReminders({ now: NOW });

    const sent = provider.getSentMessages();
    expect(sent).toHaveLength(3);

    const marathi = sent.find((m) => m.to.endsWith('9990001111'));
    const hindi = sent.find((m) => m.to.endsWith('9990002222'));
    const english = sent.find((m) => m.to.endsWith('9990003333'));

    expect(marathi.body).toContain('स्मरणपत्र');
    expect(marathi.body).toContain('खरीप');
    expect(hindi.body).toContain('स्मरण');
    expect(hindi.body).toContain('खरीफ');
    expect(english.body).toContain('E-Peek Pahani closes on');
    expect(english.body).toContain('Kharif');
  });

  it('25. should interpolate the deadline date and days remaining', async () => {
    const deadline = await createDeadline({ deadlineDate: new Date('2026-08-31T00:00:00.000Z') });

    const body = buildReminderBody(deadline, 'en', NOW);

    expect(body).toContain('31/08/2026');
    expect(body).toContain('5 day(s) left');
    expect(body).not.toContain('{{');
  });

  it('26. should explain the relief consequence rather than just nagging', async () => {
    // The whole point of the reminder is the link between filing and relief.
    const deadline = await createDeadline();
    const body = buildReminderBody(deadline, 'en', NOW);

    expect(body.toLowerCase()).toContain('calamity relief');
    expect(body.toLowerCase()).toContain('not be eligible');
  });

  it('27. should never claim the system prevents or guarantees anything', async () => {
    const deadline = await createDeadline();
    const bodies = ['mr', 'hi', 'en'].flatMap((lang) => [
      buildReminderBody(deadline, lang, NOW),
      getMessage('AWARENESS_INTRO', lang),
    ]);

    for (const body of bodies) {
      expect(body.toLowerCase()).not.toContain('fraud-proof');
      expect(body.toLowerCase()).not.toContain('100%');
      expect(body.toLowerCase()).not.toContain('guarantee');
    }
  });
});

describe('Awareness Module - First-Contact Intro', () => {

  it('28. should send the intro once for a brand-new number', async () => {
    const result = await sendAwarenessIntro('whatsapp:+919990001111', 'mr');

    expect(result.status).toBe('SENT');
    const sent = provider.getSentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('whatsapp:+919990001111');
    expect(sent[0].body).toContain('ई-पीक पाहणी');
  });

  it('29. should not repeat the intro on later contact from the same number', async () => {
    await sendAwarenessIntro('whatsapp:+919990001111', 'mr');
    const second = await sendAwarenessIntro('whatsapp:+919990001111', 'mr');

    expect(second.status).toBe('SKIPPED');
    expect(second.reason).toBe('ALREADY_SENT');
    expect(provider.getSentMessages()).toHaveLength(1);
  });

  it('30. should reach unregistered numbers, which is the population that misses out', async () => {
    // No Farmer record exists for this number at all.
    const result = await sendAwarenessIntro('whatsapp:+919998887777', 'mr');

    expect(result.status).toBe('SENT');
    const log = await NotificationLog.findOne({ type: NOTIFICATION_TYPES.AWARENESS_INTRO });
    expect(log.farmerId).toBeNull();
  });

  it('31. should explain both what E-Peek Pahani is and why filing matters', async () => {
    const body = getMessage('AWARENESS_INTRO', 'en');

    expect(body).toContain('What is E-Peek Pahani?');
    expect(body.toLowerCase()).toContain('why it matters');
    expect(body.toLowerCase()).toContain('compensation');
    expect(body.toLowerCase()).toContain('no record');
  });

  it('32. should keep the survey flow independent of intro delivery', async () => {
    // A failing intro must not surface as an error to the caller of the webhook.
    const result = await sendAwarenessIntro('whatsapp:+fail9999', 'mr');
    expect(result.status).toBe('FAILED');

    const log = await NotificationLog.findOne({ phoneNumber: 'whatsapp:+fail9999' });
    expect(log.status).toBe(NOTIFICATION_STATUS.FAILED);
  });
});

describe('Awareness Module - Recipient Normalization', () => {

  it('33. should pass through an address Twilio already formatted', () => {
    expect(toWhatsAppAddress('whatsapp:+919990001111')).toBe('whatsapp:+919990001111');
  });

  it('34. should prefix an E.164 number', () => {
    expect(toWhatsAppAddress('+919990001111')).toBe('whatsapp:+919990001111');
  });

  it('35. should assume India for a bare 10-digit number', () => {
    expect(toWhatsAppAddress('9990001111')).toBe('whatsapp:+919990001111');
  });

  it('36. should not double up the country code on a longer number', () => {
    expect(toWhatsAppAddress('919990001111')).toBe('whatsapp:+919990001111');
  });

  it('37. should return null for an unusable value', () => {
    expect(toWhatsAppAddress('')).toBeNull();
    expect(toWhatsAppAddress(null)).toBeNull();
    expect(toWhatsAppAddress('----')).toBeNull();
  });
});

describe('Awareness Module - Intro Hooked Into Farmer Discovery', () => {
  const sendWebhook = (body) => request(app).post('/api/whatsapp/webhook').send(body);

  it('38. should send the intro on the first webhook from an unknown number', async () => {
    const response = await sendWebhook({
      From: 'whatsapp:+919990005555',
      MessageSid: 'sid_intro_1',
      Body: 'hi',
    });

    expect(response.status).toBe(200);

    const sent = provider.getSentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('whatsapp:+919990005555');
    expect(sent[0].body).toContain('ई-पीक पाहणी');
  });

  it('39. should not resend the intro on subsequent messages in the same survey', async () => {
    const sender = 'whatsapp:+919990005555';

    await sendWebhook({ From: sender, MessageSid: 'sid_intro_2a', Body: 'hi' });
    await sendWebhook({ From: sender, MessageSid: 'sid_intro_2b', Body: '1' });
    await sendWebhook({ From: sender, MessageSid: 'sid_intro_2c', Body: 'soybean' });

    expect(provider.getSentMessages()).toHaveLength(1);
  });

  it('40. should not resend the intro after the 24h session has expired', async () => {
    const sender = 'whatsapp:+919990005555';

    await sendWebhook({ From: sender, MessageSid: 'sid_intro_3a', Body: 'hi' });
    // The WhatsApp session is a 24h TTL document; the intro ledger is not, which
    // is why de-duplication lives on NotificationLog instead.
    await WhatsAppSession.deleteMany({ phoneNumber: sender });
    await sendWebhook({ From: sender, MessageSid: 'sid_intro_3b', Body: 'hi' });

    expect(provider.getSentMessages()).toHaveLength(1);
  });

  it('41. should use a registered farmer\'s preferred language', async () => {
    const sender = 'whatsapp:+919990006666';
    await createFarmer({ phoneNumber: sender, preferredLanguage: 'en' });

    await sendWebhook({ From: sender, MessageSid: 'sid_intro_4', Body: 'hi' });

    const sent = provider.getSentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toContain('What is E-Peek Pahani?');

    const log = await NotificationLog.findOne({ type: NOTIFICATION_TYPES.AWARENESS_INTRO });
    expect(log.farmerId).not.toBeNull();
  });

  it('42. should still answer the webhook when the intro send fails', async () => {
    const response = await sendWebhook({
      From: 'whatsapp:+fail1234',
      MessageSid: 'sid_intro_5',
      Body: 'hi',
    });

    // Awareness is additive — a failed notification must not break the survey.
    expect(response.status).toBe(200);
    expect(response.text).toContain('<Message>');

    const log = await NotificationLog.findOne({ phoneNumber: 'whatsapp:+fail1234' });
    expect(log.status).toBe(NOTIFICATION_STATUS.FAILED);
  });
});
