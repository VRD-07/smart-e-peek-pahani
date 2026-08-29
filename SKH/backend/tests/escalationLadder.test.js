const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../src/config/env', () => ({
  twilioAuthToken: 'mock_twilio_token',
  storageProvider: 'mock',
  jwtSecret: 'mock_jwt_secret',
  notificationProvider: 'mock',
  // Left unset so escalationWindowHours() falls back to its 24h default and the
  // tests that care about a window state it explicitly.
  escalationWhatsappWindowHours: undefined,
  escalationSmsWindowHours: undefined,
  escalationWhatsappRequireRead: undefined,
  voiceAudioBaseUrl: undefined,
}));

const env = require('../src/config/env');
const Farmer = require('../src/models/Farmer');
const Gat = require('../src/models/Gat');
const Submission = require('../src/models/Submission');
const SchemeDeadline = require('../src/models/SchemeDeadline');
const NotificationLog = require('../src/models/NotificationLog');
const app = require('../server');
const { DICTIONARY } = require('../src/services/whatsapp/messages');
const {
  getNotificationProvider,
  resetNotificationProvider,
} = require('../src/services/notifications/notificationFactory');
const {
  escalateNotification,
  runEscalation,
  channelState,
  summarizeAttempts,
  escalationOutcome,
  isDelivered,
  addressFor,
} = require('../src/services/notifications/escalationService');
const {
  escalateForFarmer,
  escalateFarmerReminder,
  runDeadlineReminders,
  reminderReachStats,
  reminderDedupeKey,
  buildSmsReminderBody,
  formatDeadlineDate,
} = require('../src/services/notifications/awarenessService');
const { VOICE_ASSETS, buildVoiceTwiml } = require('../src/services/notifications/voiceMessages');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUS,
  CHANNELS,
  CHANNEL_STATES,
  ESCALATION_ACTIONS,
  MAX_CHANNEL_SEND_ATTEMPTS,
} = require('../src/services/notifications/constants');

jest.setTimeout(60000);

let mongoServer;
let provider;
let gat;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
// The real clock rather than a fixed instant: sendOnChannel stamps sentAt with
// new Date(), so a frozen NOW would put every send in the future relative to the
// clock the windows are measured against, and "still inside its window" would
// pass for the wrong reason. Anything time-sensitive backdates sentAt explicitly.
const NOW = new Date();
const hoursFromNow = (hours) => new Date(NOW.getTime() + hours * MS_PER_HOUR);
const daysFromNow = (days) => new Date(NOW.getTime() + days * MS_PER_DAY);

const PHONE = '9990001111';
const TYPE = NOTIFICATION_TYPES.DEADLINE_REMINDER;
const KEY = 'test-cycle:7';

const BODIES = {
  [CHANNELS.WHATSAPP]: 'WhatsApp reminder body',
  [CHANNELS.SMS]: 'SMS reminder body',
};

/** The standard ladder params, so each test only states what it varies. */
const ladder = (overrides = {}) => ({
  phoneNumber: PHONE,
  type: TYPE,
  dedupeKey: KEY,
  language: 'mr',
  bodies: BODIES,
  now: NOW,
  ...overrides,
});

const logFor = (channel, dedupeKey = KEY) => NotificationLog.findOne({
  phoneNumber: PHONE,
  type: TYPE,
  dedupeKey,
  channel,
});

/** Forces what the provider will report for a channel's last send. */
const forceStatus = async (channel, status, dedupeKey = KEY) => {
  const log = await logFor(channel, dedupeKey);
  provider.setDeliveryStatus(log.providerMessageId, status);
  return log;
};

/** Backdates a channel's send so its escalation window has elapsed. */
const backdateSend = async (channel, hours, dedupeKey = KEY) => {
  const log = await logFor(channel, dedupeKey);
  log.sentAt = hoursFromNow(-hours);
  await log.save();
  return log;
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
    Farmer.deleteMany({}),
    Gat.deleteMany({}),
    Submission.deleteMany({}),
    SchemeDeadline.deleteMany({}),
    NotificationLog.deleteMany({}),
  ]);

  // Restored per test because several of them flip a window or the read bar.
  env.escalationWhatsappWindowHours = undefined;
  env.escalationSmsWindowHours = undefined;
  env.escalationWhatsappRequireRead = undefined;
  env.voiceAudioBaseUrl = undefined;

  resetNotificationProvider();
  provider = getNotificationProvider();
  provider.reset();

  gat = await Gat.create({
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
  phoneNumber: PHONE,
  preferredLanguage: 'mr',
  associatedGats: [gat._id],
  ...overrides,
});

describe('Escalation Ladder - channel progression', () => {
  it('1. should attempt WhatsApp first, before any SMS or call', async () => {
    const result = await escalateNotification(ladder());

    expect(result.action).toBe(ESCALATION_ACTIONS.SENT);
    expect(result.channel).toBe(CHANNELS.WHATSAPP);
    expect(provider.getSentMessages()).toHaveLength(1);
    expect(provider.getSentMessages()[0].channel).toBe(CHANNELS.WHATSAPP);
    expect(provider.getPlacedCalls()).toHaveLength(0);
  });

  it('2. should wait rather than escalate while the WhatsApp window is still open', async () => {
    await escalateNotification(ladder());

    // Two hours later, still unconfirmed. Escalating here would triple-message
    // every farmer whose phone happened to be in a pocket.
    const result = await escalateNotification(ladder({ now: hoursFromNow(2) }));

    expect(result.action).toBe(ESCALATION_ACTIONS.WAITING);
    expect(result.channel).toBe(CHANNELS.WHATSAPP);
    expect(result.windowHours).toBe(24);
    expect(provider.getSentMessages()).toHaveLength(1);
  });

  it('3. should fall back to SMS once the WhatsApp window has elapsed unconfirmed', async () => {
    await escalateNotification(ladder());
    await backdateSend(CHANNELS.WHATSAPP, 25);

    const result = await escalateNotification(ladder());

    expect(result.action).toBe(ESCALATION_ACTIONS.SENT);
    expect(result.channel).toBe(CHANNELS.SMS);

    const sms = provider.getSentMessages().find((m) => m.channel === CHANNELS.SMS);
    expect(sms.body).toBe(BODIES[CHANNELS.SMS]);
    // Plain E.164, not the whatsapp: form — a different Twilio product.
    expect(sms.to).toBe('+919990001111');
  });

  it('4. should place a voice call once the SMS window has also elapsed', async () => {
    await escalateNotification(ladder());
    await backdateSend(CHANNELS.WHATSAPP, 50);
    await escalateNotification(ladder());
    await backdateSend(CHANNELS.SMS, 25);

    const result = await escalateNotification(ladder());

    expect(result.action).toBe(ESCALATION_ACTIONS.SENT);
    expect(result.channel).toBe(CHANNELS.VOICE);
    expect(provider.getPlacedCalls()).toHaveLength(1);
    expect(provider.getPlacedCalls()[0].to).toBe('+919990001111');
  });

  it('5. should report EXHAUSTED once all three channels have gone unanswered', async () => {
    await runEscalation(ladder({ force: true }));

    // Every rung tried and every one of them came back undelivered.
    for (const channel of [CHANNELS.WHATSAPP, CHANNELS.SMS, CHANNELS.VOICE]) {
      await forceStatus(channel, 'undelivered');
    }

    const result = await escalateNotification(ladder());
    expect(result.action).toBe(ESCALATION_ACTIONS.EXHAUSTED);
  });

  it('6. should advance only one rung per call so the daily cron paces the ladder', async () => {
    const first = await escalateNotification(ladder());
    const second = await escalateNotification(ladder({ now: hoursFromNow(1) }));

    expect(first.channel).toBe(CHANNELS.WHATSAPP);
    expect(second.action).toBe(ESCALATION_ACTIONS.WAITING);
    expect(provider.getSentMessages()).toHaveLength(1);
    expect(provider.getPlacedCalls()).toHaveLength(0);
  });

  it('7. should walk the whole ladder in one go when forced, for a manual trigger', async () => {
    const result = await runEscalation(ladder({ force: true }));

    expect(result.channelsAttempted).toEqual([CHANNELS.WHATSAPP, CHANNELS.SMS, CHANNELS.VOICE]);
    expect(provider.getSentMessages()).toHaveLength(2);
    expect(provider.getPlacedCalls()).toHaveLength(1);
  });

  it('8. should stop at the requested rung when upToChannel limits the walk', async () => {
    const result = await runEscalation(ladder({ force: true }), { upToChannel: CHANNELS.SMS });

    expect(result.channelsAttempted).toEqual([CHANNELS.WHATSAPP, CHANNELS.SMS]);
    // "Show me the SMS fallback" must not also ring the farmer's phone.
    expect(provider.getPlacedCalls()).toHaveLength(0);
  });

  it('9. should respect a configured window rather than a hardcoded 24 hours', async () => {
    env.escalationWhatsappWindowHours = '2';

    await escalateNotification(ladder());
    await backdateSend(CHANNELS.WHATSAPP, 3);

    const result = await escalateNotification(ladder());
    expect(result.channel).toBe(CHANNELS.SMS);
  });

  it('10. should collapse the whole ladder into one sweep when the windows are set to zero', async () => {
    env.escalationWhatsappWindowHours = '0';
    env.escalationSmsWindowHours = '0';

    await escalateNotification(ladder());
    const second = await escalateNotification(ladder({ now: hoursFromNow(1) }));
    const third = await escalateNotification(ladder({ now: hoursFromNow(2) }));

    expect(second.channel).toBe(CHANNELS.SMS);
    expect(third.channel).toBe(CHANNELS.VOICE);
  });
});

describe('Escalation Ladder - delivery confirmation', () => {
  it('11. should stop escalating once WhatsApp is confirmed read', async () => {
    await escalateNotification(ladder());
    await forceStatus(CHANNELS.WHATSAPP, 'read');
    await backdateSend(CHANNELS.WHATSAPP, 50);

    const result = await escalateNotification(ladder());

    expect(result.action).toBe(ESCALATION_ACTIONS.REACHED);
    expect(result.reachedVia).toBe(CHANNELS.WHATSAPP);
    expect(provider.getSentMessages()).toHaveLength(1);
  });

  it('12. should treat a delivered-but-unread WhatsApp message as not yet reaching the farmer', async () => {
    await escalateNotification(ladder());
    await forceStatus(CHANNELS.WHATSAPP, 'delivered');
    await backdateSend(CHANNELS.WHATSAPP, 25);

    const result = await escalateNotification(ladder());

    // The default read bar: on the phone but unread has not done its job.
    expect(result.channel).toBe(CHANNELS.SMS);
  });

  it('13. should accept delivered as reached when the read requirement is switched off', async () => {
    env.escalationWhatsappRequireRead = 'false';

    await escalateNotification(ladder());
    await forceStatus(CHANNELS.WHATSAPP, 'delivered');
    await backdateSend(CHANNELS.WHATSAPP, 25);

    const result = await escalateNotification(ladder());

    // The knob exists because farmers with read receipts off would otherwise be
    // escalated to a phone call every single cycle.
    expect(result.action).toBe(ESCALATION_ACTIONS.REACHED);
    expect(result.reachedVia).toBe(CHANNELS.WHATSAPP);
  });

  it('14. should hold SMS to delivered, since SMS has no read receipt to wait for', async () => {
    expect(isDelivered(CHANNELS.SMS, 'delivered')).toBe(true);
    expect(isDelivered(CHANNELS.VOICE, 'completed')).toBe(true);
    expect(isDelivered(CHANNELS.WHATSAPP, 'delivered')).toBe(false);
  });

  it('15. should escalate immediately on an explicit undelivered, without waiting out the window', async () => {
    await escalateNotification(ladder());
    await forceStatus(CHANNELS.WHATSAPP, 'undelivered');

    // Only minutes later: there is nothing left to wait for once the carrier has
    // said it could not be delivered.
    const result = await escalateNotification(ladder({ now: hoursFromNow(0.5) }));
    expect(result.channel).toBe(CHANNELS.SMS);
  });

  it('16. should leave the stored state alone when the status lookup itself fails', async () => {
    await escalateNotification(ladder());
    await backdateSend(CHANNELS.WHATSAPP, 25);

    const spy = jest.spyOn(provider, 'getDeliveryStatus')
      .mockResolvedValue({ error: 'PROVIDER_ERROR', message: 'lookup down' });

    const result = await escalateNotification(ladder());

    // The window has elapsed, so it escalates — but on the strength of the
    // window, not on a failed lookup being misread as a delivery failure.
    expect(result.channel).toBe(CHANNELS.SMS);
    const log = await logFor(CHANNELS.WHATSAPP);
    expect(log.deliveryStatus).toBeUndefined();

    spy.mockRestore();
  });

  it('17. should not re-poll a channel that has already reached a terminal state', async () => {
    await escalateNotification(ladder());
    await forceStatus(CHANNELS.WHATSAPP, 'read');
    await escalateNotification(ladder({ now: hoursFromNow(1) }));

    const spy = jest.spyOn(provider, 'getDeliveryStatus');
    await escalateNotification(ladder({ now: hoursFromNow(2) }));

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('Escalation Ladder - failed sends versus unanswered rungs', () => {
  const failing = (overrides = {}) => ladder({ phoneNumber: '+91fail0001', ...overrides });

  const failLogFor = (channel) => NotificationLog.findOne({
    phoneNumber: '+91fail0001',
    type: TYPE,
    dedupeKey: KEY,
    channel,
  });

  it('18. should report a rejected send as FAILED instead of escalating past it', async () => {
    const result = await escalateNotification(failing());

    expect(result.action).toBe(ESCALATION_ACTIONS.FAILED);
    expect(result.channel).toBe(CHANNELS.WHATSAPP);
    expect(result.reason).toBe('PROVIDER_ERROR');
    // No SMS: the provider is what went wrong, not the farmer.
    expect(await failLogFor(CHANNELS.SMS)).toBeNull();
  });

  it('19. should retry the same channel on the next sweep after a rejected send', async () => {
    await escalateNotification(failing());
    const log = await failLogFor(CHANNELS.WHATSAPP);

    expect(log.status).toBe(NOTIFICATION_STATUS.FAILED);
    expect(log.attempts).toBe(1);
    expect(channelState(log)).toBe(CHANNEL_STATES.RETRYABLE);

    const second = await escalateNotification(failing({ now: hoursFromNow(24) }));
    expect(second.channel).toBe(CHANNELS.WHATSAPP);
    expect((await failLogFor(CHANNELS.WHATSAPP)).attempts).toBe(2);
  });

  it('20. should give up on a channel and descend once its send attempts are spent', async () => {
    for (let i = 0; i < MAX_CHANNEL_SEND_ATTEMPTS; i += 1) {
      await escalateNotification(failing({ now: hoursFromNow(i * 24) }));
    }

    const log = await failLogFor(CHANNELS.WHATSAPP);
    expect(log.attempts).toBe(MAX_CHANNEL_SEND_ATTEMPTS);
    expect(channelState(log)).toBe(CHANNEL_STATES.UNREACHED);

    // Now the ladder is free to descend — and finds the same bad number on SMS.
    const next = await escalateNotification(failing({ now: hoursFromNow(48) }));
    expect(next.channel).toBe(CHANNELS.SMS);
  });

  it('21. should walk past an already-failed channel when forced, so a demo does not stall', async () => {
    await escalateNotification(failing());

    const result = await runEscalation(failing({ force: true }));

    // Every rung is attempted; the bad number just fails on each of them.
    expect(result.finalAction).toBe(ESCALATION_ACTIONS.EXHAUSTED);
    expect(await failLogFor(CHANNELS.SMS)).not.toBeNull();
    expect(await failLogFor(CHANNELS.VOICE)).not.toBeNull();
  });

  it('22. should skip a channel it has no dialable number for', async () => {
    const result = await escalateNotification(ladder({ phoneNumber: '' }));

    expect(result.action).toBe(ESCALATION_ACTIONS.SKIPPED);
    expect(result.reason).toBe('INVALID_RECIPIENT');
    expect(addressFor(CHANNELS.SMS, '')).toBeNull();
  });
});

describe('Escalation Ladder - audit trail', () => {
  it('23. should record one row per channel under a shared dedupe key', async () => {
    await runEscalation(ladder({ force: true }));

    const logs = await NotificationLog.find({ phoneNumber: PHONE, type: TYPE, dedupeKey: KEY });
    expect(logs).toHaveLength(3);
    expect(logs.map((l) => l.channel).sort()).toEqual(['SMS', 'VOICE', 'WHATSAPP']);
    // A shared key is what makes the three rows groupable into one ladder.
    expect(new Set(logs.map((l) => l.dedupeKey)).size).toBe(1);
  });

  it('24. should record the SMS body separately from the WhatsApp body', async () => {
    await runEscalation(ladder({ force: true }), { upToChannel: CHANNELS.SMS });

    expect((await logFor(CHANNELS.WHATSAPP)).body).toBe(BODIES[CHANNELS.WHATSAPP]);
    expect((await logFor(CHANNELS.SMS)).body).toBe(BODIES[CHANNELS.SMS]);
  });

  it('25. should record the exact TwiML the call was asked to play', async () => {
    await runEscalation(ladder({ force: true }));

    const log = await logFor(CHANNELS.VOICE);
    // The auditable artefact for a call is the document Twilio executed.
    expect(log.body).toContain('<Response>');
    expect(log.body).toBe(provider.getPlacedCalls()[0].twiml);
  });

  it('26. should record the provider error on a rejected send', async () => {
    await escalateNotification(ladder({ phoneNumber: '+91fail0001' }));

    const log = await NotificationLog.findOne({ phoneNumber: '+91fail0001', channel: CHANNELS.WHATSAPP });
    expect(log.status).toBe(NOTIFICATION_STATUS.FAILED);
    expect(log.error).toContain('PROVIDER_ERROR');
    expect(log.providerMessageId).toBeUndefined();
    expect(log.sentAt).toBeUndefined();
  });

  it('27. should store the refreshed delivery status and when it was checked', async () => {
    await escalateNotification(ladder());
    await forceStatus(CHANNELS.WHATSAPP, 'read');
    await escalateNotification(ladder({ now: hoursFromNow(1) }));

    const log = await logFor(CHANNELS.WHATSAPP);
    expect(log.deliveryStatus).toBe('read');
    expect(log.deliveryCheckedAt).toBeInstanceOf(Date);
  });
});

describe('Escalation Ladder - voice call TwiML', () => {
  it('28. should play the pre-recorded audio twice when a public audio URL is configured', () => {
    env.voiceAudioBaseUrl = 'https://demo.test/assets/voice';

    const twiml = buildVoiceTwiml(NOTIFICATION_TYPES.DEADLINE_REMINDER);

    expect(twiml).toContain('<Play>https://demo.test/assets/voice/reminder-mr.mp3</Play>');
    expect(twiml).toContain('<Pause length="1"/>');
    // Twice, because someone answering mid-sentence cannot scroll back.
    expect(twiml.match(/<Play>/g)).toHaveLength(2);
    expect(twiml).not.toContain('<Say');
  });

  it('29. should fall back to speech rather than a silent call when no audio is hosted', () => {
    const twiml = buildVoiceTwiml(NOTIFICATION_TYPES.DEADLINE_REMINDER);

    // hi-IN because Twilio has no Marathi voice at all. A degraded stopgap.
    expect(twiml).toContain('<Say language="hi-IN">');
    expect(twiml).not.toContain('<Play>');
  });

  it('30. should have an audio asset and a Marathi script for each escalating notification type', () => {
    for (const type of [
      NOTIFICATION_TYPES.DEADLINE_REMINDER,
      NOTIFICATION_TYPES.CALAMITY_RELIEF,
      NOTIFICATION_TYPES.SUBMISSION_REVIEW,
    ]) {
      expect(VOICE_ASSETS[type].file).toMatch(/-mr\.wav$/);
      // Devanagari: the script is the text a Marathi speaker records.
      expect(VOICE_ASSETS[type].script).toMatch(/[ऀ-ॿ]/);
    }
  });

  it('31. should skip the voice rung for a notification type with no recording', async () => {
    const result = await runEscalation(ladder({
      type: NOTIFICATION_TYPES.AWARENESS_INTRO,
      dedupeKey: 'FIRST_CONTACT',
      force: true,
    }));

    // WhatsApp and SMS go out; the call is skipped rather than placing a silent one.
    const logs = await NotificationLog.find({ type: NOTIFICATION_TYPES.AWARENESS_INTRO });
    expect(logs.map((l) => l.channel).sort()).toEqual(['SMS', 'WHATSAPP']);
    expect(provider.getPlacedCalls()).toHaveLength(0);
    expect(result.channelsAttempted).toEqual([CHANNELS.WHATSAPP, CHANNELS.SMS]);
  });
});

describe('Escalation Ladder - manual trigger service function', () => {
  it('32. should fire all three channels for a seeded farmer with an overdue reminder', async () => {
    const deadline = await createDeadline();
    const farmer = await createFarmer();

    const result = await escalateForFarmer({ phoneNumber: farmer.phoneNumber, now: NOW });

    expect(result.channelsAttempted).toEqual([CHANNELS.WHATSAPP, CHANNELS.SMS, CHANNELS.VOICE]);
    // Stored canonically, whatever shape the number was created with.
    expect(result.farmer.phoneNumber).toBe('+919990001111');
    expect(result.deadline.id).toBe(deadline._id.toString());
    expect(provider.getSentMessages()).toHaveLength(2);
    expect(provider.getPlacedCalls()).toHaveLength(1);
  });

  it('33. should accept a farmerId as well as a phone number', async () => {
    await createDeadline();
    const farmer = await createFarmer();

    const result = await escalateForFarmer({ farmerId: farmer._id, now: NOW });
    expect(result.farmer.id).toBe(farmer._id.toString());
  });

  it('34. should stop before the call when only the SMS fallback was asked for', async () => {
    await createDeadline();
    await createFarmer();

    const result = await escalateForFarmer({
      phoneNumber: PHONE,
      upToChannel: CHANNELS.SMS,
      now: NOW,
    });

    expect(result.channelsAttempted).toEqual([CHANNELS.WHATSAPP, CHANNELS.SMS]);
    expect(provider.getPlacedCalls()).toHaveLength(0);
  });

  it('35. should report an unknown farmer rather than silently doing nothing', async () => {
    await createDeadline();
    const result = await escalateForFarmer({ phoneNumber: '9999999999' });
    expect(result.error).toBe('FARMER_NOT_FOUND');
  });

  it('36. should report that there is no deadline to remind about', async () => {
    await createFarmer();
    const result = await escalateForFarmer({ phoneNumber: PHONE });
    expect(result.error).toBe('NO_ACTIVE_DEADLINE');
  });

  it('37. should still work outside a reminder window, which is where a demo usually sits', async () => {
    // Deadline far enough out that no configured offset covers today.
    const deadline = await createDeadline({ deadlineDate: daysFromNow(90) });
    await createFarmer();

    const result = await escalateForFarmer({ phoneNumber: PHONE, now: NOW });

    expect(result.deadline.id).toBe(deadline._id.toString());
    // Labelled with the tightest configured bucket rather than an invented one.
    expect(result.deadline.offsetDays).toBe(1);
    expect(result.channelsAttempted).toContain(CHANNELS.WHATSAPP);
  });

  it('38. should send in the farmer stored language and default to Marathi without one', async () => {
    await createDeadline();
    const english = await createFarmer({ phoneNumber: '9990002222', preferredLanguage: 'en' });
    await escalateForFarmer({ phoneNumber: english.phoneNumber, upToChannel: CHANNELS.SMS, now: NOW });

    const englishSms = provider.getSentMessages().find((m) => m.channel === CHANNELS.SMS);
    expect(englishSms.body).toContain('E-Peek Pahani');

    provider.reset();
    // preferredLanguage defaults to 'mr' on the model, so an unset preference is
    // Marathi rather than English.
    const unset = await Farmer.create({
      name: 'No Preference',
      phoneNumber: '9990003333',
      associatedGats: [gat._id],
    });
    await escalateForFarmer({ phoneNumber: unset.phoneNumber, upToChannel: CHANNELS.SMS, now: NOW });

    const marathiSms = provider.getSentMessages().find((m) => m.channel === CHANNELS.SMS);
    expect(marathiSms.body).toMatch(/[ऀ-ॿ]/);
  });

  it('39. should advance a farmer one rung per sweep of the scheduled job', async () => {
    const deadline = await createDeadline();
    const farmer = await createFarmer();

    const first = await runDeadlineReminders({ now: NOW });
    expect(first.remindersSent).toBe(1);
    expect(first.byChannel[CHANNELS.WHATSAPP]).toBe(1);
    expect(first.byChannel[CHANNELS.SMS]).toBe(0);

    // Nothing came back overnight.
    await NotificationLog.updateOne(
      { phoneNumber: PHONE, channel: CHANNELS.WHATSAPP },
      { $set: { sentAt: hoursFromNow(-25) } }
    );

    const second = await runDeadlineReminders({ now: NOW });
    expect(second.byChannel[CHANNELS.SMS]).toBe(1);

    const keys = await NotificationLog.distinct('dedupeKey', { phoneNumber: PHONE });
    expect(keys).toEqual([reminderDedupeKey(deadline, 7)]);
    expect(farmer.preferredLanguage).toBe('mr');
  });

  it('40. should count a farmer reached on an earlier rung as skipped, not re-sent', async () => {
    const deadline = await createDeadline();
    await createFarmer();

    await runDeadlineReminders({ now: NOW });
    await forceStatus(CHANNELS.WHATSAPP, 'read', reminderDedupeKey(deadline, 7));

    const summary = await runDeadlineReminders({ now: NOW });

    expect(summary.remindersSent).toBe(0);
    expect(summary.skipped).toBe(1);
  });

  it('41. should count farmers no channel reached as exhausted, separately from failures', async () => {
    const deadline = await createDeadline();
    const farmer = await createFarmer();
    const key = reminderDedupeKey(deadline, 7);

    await escalateFarmerReminder(farmer, deadline, 7, { now: NOW, force: true });
    await escalateFarmerReminder(farmer, deadline, 7, { now: NOW, force: true });
    await escalateFarmerReminder(farmer, deadline, 7, { now: NOW, force: true });

    for (const channel of [CHANNELS.WHATSAPP, CHANNELS.SMS, CHANNELS.VOICE]) {
      const log = await NotificationLog.findOne({ phoneNumber: PHONE, dedupeKey: key, channel });
      provider.setDeliveryStatus(log.providerMessageId, 'undelivered');
    }

    const summary = await runDeadlineReminders({ now: NOW });

    expect(summary.exhausted).toBe(1);
    // A farmer we could not reach is not the same thing as a sweep that errored.
    expect(summary.failed).toBe(0);
  });
});

describe('Escalation Ladder - officer dashboard reach stats', () => {
  const statsFor = async () => reminderReachStats({ now: NOW });

  it('42. should report nothing when no deadline is active', async () => {
    const stats = await statsFor();
    expect(stats.cycles).toEqual([]);
    expect(stats.total).toBe(0);
  });

  it('43. should count an unconfirmed send as attempted and pending, not as reached', async () => {
    await createDeadline();
    await createFarmer();
    await runDeadlineReminders({ now: NOW });

    const stats = await statsFor();

    expect(stats.total).toBe(1);
    expect(stats.attempted[CHANNELS.WHATSAPP]).toBe(1);
    // Attempted is reported alongside reached precisely so a block of zeroes does
    // not read as though nothing had been sent.
    expect(stats.reached[CHANNELS.WHATSAPP]).toBe(0);
    expect(stats.pending).toBe(1);
    expect(stats.unreached).toBe(0);
  });

  it('44. should attribute a farmer to the channel that actually reached them', async () => {
    const deadline = await createDeadline();
    await createFarmer();
    const key = reminderDedupeKey(deadline, 7);

    await runEscalation(ladder({ dedupeKey: key, force: true }), { upToChannel: CHANNELS.SMS });
    const sms = await NotificationLog.findOne({ phoneNumber: PHONE, dedupeKey: key, channel: CHANNELS.SMS });
    sms.deliveryStatus = 'delivered';
    await sms.save();

    const stats = await statsFor();

    expect(stats.reached[CHANNELS.SMS]).toBe(1);
    expect(stats.reached[CHANNELS.WHATSAPP]).toBe(0);
    expect(stats.attempted[CHANNELS.WHATSAPP]).toBe(1);
    expect(stats.pending).toBe(0);
  });

  it('45. should count a farmer as unreached only once every channel has come back undelivered', async () => {
    const deadline = await createDeadline();
    await createFarmer();
    const key = reminderDedupeKey(deadline, 7);

    await runEscalation(ladder({ dedupeKey: key, force: true }));
    await NotificationLog.updateMany(
      { phoneNumber: PHONE, dedupeKey: key },
      { $set: { deliveryStatus: 'undelivered' } }
    );

    const stats = await statsFor();

    expect(stats.unreached).toBe(1);
    expect(stats.pending).toBe(0);
    expect(stats.attempted[CHANNELS.VOICE]).toBe(1);
  });

  it('46. should keep every farmer in the cycle counted separately', async () => {
    const deadline = await createDeadline();
    await createFarmer();
    await createFarmer({ phoneNumber: '9990002222' });
    await createFarmer({ phoneNumber: '9990003333' });

    await runDeadlineReminders({ now: NOW });

    const stats = await statsFor();
    expect(stats.total).toBe(3);
    expect(stats.attempted[CHANNELS.WHATSAPP]).toBe(3);
    expect(stats.cycles[0].dedupeKey).toBe(reminderDedupeKey(deadline, 7));
  });

  it('47. should not poll the provider on a dashboard read', async () => {
    await createDeadline();
    await createFarmer();
    await runDeadlineReminders({ now: NOW });

    const spy = jest.spyOn(provider, 'getDeliveryStatus');
    await statsFor();

    // An officer may refresh this repeatedly; one API call per log row per refresh
    // is not a trade worth making.
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('48. should summarize a single ladder without hitting the database', () => {
    const summary = summarizeAttempts({
      [CHANNELS.WHATSAPP]: { channel: CHANNELS.WHATSAPP, status: 'SENT', deliveryStatus: 'undelivered' },
      [CHANNELS.SMS]: { channel: CHANNELS.SMS, status: 'SENT', deliveryStatus: 'delivered' },
    });

    expect(summary.reachedVia).toBe(CHANNELS.SMS);
    expect(summary.attemptedChannels).toEqual([CHANNELS.WHATSAPP, CHANNELS.SMS]);
    expect(summary.pending).toBe(false);
    expect(summary.unreached).toBe(false);
  });

  it('49. should read one message ladder straight off its log rows', async () => {
    await runEscalation(ladder({ force: true }), { upToChannel: CHANNELS.SMS });

    const outcome = await escalationOutcome({ phoneNumber: PHONE, type: TYPE, dedupeKey: KEY });

    expect(outcome.attemptedChannels).toEqual([CHANNELS.WHATSAPP, CHANNELS.SMS]);
    expect(outcome.states[CHANNELS.VOICE]).toBe(CHANNEL_STATES.NOT_ATTEMPTED);
  });
});

describe('Escalation Ladder - officer API', () => {
  const officerToken = () => jwt.sign({ officerId: new mongoose.Types.ObjectId(), role: 'officer' }, env.jwtSecret, { expiresIn: '1h' });
  const farmerToken = () => jwt.sign({ farmerId: new mongoose.Types.ObjectId(), role: 'farmer' }, env.jwtSecret, { expiresIn: '1h' });

  it('50. should require a token for the escalation stats', async () => {
    const res = await request(app).get('/api/notifications/escalation-stats');
    expect(res.status).toBe(401);
  });

  it('51. should not expose the escalation stats to a farmer token', async () => {
    const res = await request(app)
      .get('/api/notifications/escalation-stats')
      .set('Authorization', `Bearer ${farmerToken()}`);
    expect(res.status).toBe(403);
  });

  it('52. should return the reach breakdown to an officer', async () => {
    await createDeadline();
    await createFarmer();
    await runDeadlineReminders({ now: new Date() });

    const res = await request(app)
      .get('/api/notifications/escalation-stats')
      .set('Authorization', `Bearer ${officerToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.attempted.WHATSAPP).toBe(1);
    expect(res.body.data.reached).toEqual({ WHATSAPP: 0, SMS: 0, VOICE: 0 });
  });

  it('53. should require a farmer to escalate for', async () => {
    const res = await request(app)
      .post('/api/notifications/escalate')
      .set('Authorization', `Bearer ${officerToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('54. should reject an unknown channel rather than guessing', async () => {
    const res = await request(app)
      .post('/api/notifications/escalate')
      .set('Authorization', `Bearer ${officerToken()}`)
      .send({ phoneNumber: PHONE, upToChannel: 'CARRIER_PIGEON' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('WHATSAPP');
  });

  it('55. should 404 for a phone number with no farmer record', async () => {
    await createDeadline();

    const res = await request(app)
      .post('/api/notifications/escalate')
      .set('Authorization', `Bearer ${officerToken()}`)
      .send({ phoneNumber: '9999999999' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('FARMER_NOT_FOUND');
  });

  it('56. should 409 and point at the seed script when no deadline is active', async () => {
    await createFarmer();

    const res = await request(app)
      .post('/api/notifications/escalate')
      .set('Authorization', `Bearer ${officerToken()}`)
      .send({ phoneNumber: PHONE });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('NO_ACTIVE_DEADLINE');
    expect(res.body.message).toContain('seedDemoSchemeDeadlines');
  });

  it('57. should fire the ladder immediately without waiting out the real windows', async () => {
    await createDeadline();
    await createFarmer();

    const res = await request(app)
      .post('/api/notifications/escalate')
      .set('Authorization', `Bearer ${officerToken()}`)
      .send({ phoneNumber: PHONE });

    expect(res.status).toBe(200);
    expect(res.body.data.channelsAttempted).toEqual([CHANNELS.WHATSAPP, CHANNELS.SMS, CHANNELS.VOICE]);
    expect(provider.getSentMessages()).toHaveLength(2);
    expect(provider.getPlacedCalls()).toHaveLength(1);
  });

  it('58. should serve the placeholder voice assets outside the API rate limiter', async () => {
    const res = await request(app).get('/assets/voice/reminder-mr.wav');

    // Twilio's media fetcher is unauthenticated and must not be rate limited or
    // blocked by helmet's same-origin resource policy.
    expect(res.status).toBe(200);
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});

describe('Escalation Ladder - copy guardrails', () => {
  const SMS_KEYS = [
    'SMS_DEADLINE_REMINDER',
    'SMS_CALAMITY_RELIEF',
    'SMS_SUBMISSION_REVIEW',
    'SMS_AWARENESS_INTRO',
  ];
  const BANNED = [/fraud-?proof/i, /100\s*%/, /guarantee/i, /फसवणूक\s*मुक्त/];

  it('59. should have SMS copy for every language the bot speaks', () => {
    for (const language of ['mr', 'hi', 'en']) {
      for (const key of SMS_KEYS) {
        expect(typeof DICTIONARY[language][key]).toBe('string');
        expect(DICTIONARY[language][key].length).toBeGreaterThan(0);
      }
    }
  });

  it('60. should make no accuracy or fraud-proof claim in any SMS or voice copy', () => {
    const copy = [];
    for (const language of ['mr', 'hi', 'en']) {
      for (const key of SMS_KEYS) copy.push(DICTIONARY[language][key]);
    }
    for (const asset of Object.values(VOICE_ASSETS)) copy.push(asset.script);

    for (const text of copy) {
      for (const pattern of BANNED) {
        expect(text).not.toMatch(pattern);
      }
    }
  });

  it('61. should default SMS copy to Marathi when no language is given', () => {
    const deadlineDate = daysFromNow(5);
    const deadline = { season: 'KHARIF', year: 2026, deadlineDate };

    const body = buildSmsReminderBody(deadline, undefined);

    // Marathi is the silent default, not something a farmer has to pick.
    expect(body).toMatch(/[ऀ-ॿ]/);
    expect(body).toBe(DICTIONARY.mr.SMS_DEADLINE_REMINDER
      .replace('{{season}}', DICTIONARY.mr.SEASON_KHARIF)
      .replace('{{year}}', '2026')
      .replace('{{date}}', formatDeadlineDate(deadlineDate)));
  });

  it('62. should say the relief notice is not an approval, on SMS as well as WhatsApp', () => {
    // The shortened SMS drops the explanation, not the caveat.
    expect(DICTIONARY.mr.SMS_CALAMITY_RELIEF).toContain('ही मंजुरी नाही');
    expect(DICTIONARY.en.SMS_CALAMITY_RELIEF.toLowerCase()).toContain('not an approval');
  });

  it('63. should tell a farmer under review that the filing is not rejected', () => {
    // The whole point of the notice: stop the farmer re-filing over the top.
    expect(DICTIONARY.mr.SMS_SUBMISSION_REVIEW).toContain('रद्द झालेली नाही');
    expect(VOICE_ASSETS[NOTIFICATION_TYPES.SUBMISSION_REVIEW].script).toContain('रद्द झालेली नाही');
  });
});
