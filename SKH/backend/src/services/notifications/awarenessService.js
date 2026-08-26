const Farmer = require('../../models/Farmer');
const Gat = require('../../models/Gat');
const Submission = require('../../models/Submission');
const SchemeDeadline = require('../../models/SchemeDeadline');
const NotificationLog = require('../../models/NotificationLog');
const { getMessage } = require('../whatsapp/messages');
const { getNotificationProvider } = require('./notificationFactory');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUS,
  FILED_SUBMISSION_STATUSES,
  DEDUPE_KEYS,
} = require('./constants');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Numbers reach us from Twilio as 'whatsapp:+91...', and the repo stores the
// inbound `From` value verbatim on the Farmer record. Rather than migrate that
// data, outbound sends normalize at the boundary. Bare 10-digit numbers (as used
// by the demo seed) are assumed Indian.
const DEFAULT_COUNTRY_CODE = '91';

function toWhatsAppAddress(phoneNumber) {
  if (!phoneNumber) return null;

  const value = phoneNumber.toString().trim();
  if (value.startsWith('whatsapp:')) return value;
  if (value.startsWith('+')) return `whatsapp:${value}`;

  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  return digits.length > 10
    ? `whatsapp:+${digits}`
    : `whatsapp:+${DEFAULT_COUNTRY_CODE}${digits}`;
}

/** Whole calendar days between two dates, computed in UTC so it is testable. */
function daysBetween(from, to) {
  const dayStart = (value) => {
    const d = new Date(value);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  };
  return Math.round((dayStart(to) - dayStart(from)) / MS_PER_DAY);
}

/** DD/MM/YYYY — the format used on Indian government forms, and stable across ICU versions. */
function formatDeadlineDate(value) {
  const d = new Date(value);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/**
 * Which reminder bucket, if any, is due for this deadline today.
 *
 * Picks the tightest configured offset that still covers today, so a day the
 * scheduler was offline is caught up on the next run rather than skipped, and
 * each bucket fires at most once thanks to the NotificationLog dedupe key.
 * Returns null when the deadline has passed or no bucket applies yet.
 */
function dueReminderOffset(deadline, now = new Date()) {
  const daysLeft = daysBetween(now, deadline.deadlineDate);
  if (daysLeft < 0) return null;

  const applicable = (deadline.reminderOffsetsDays || [])
    .filter((offset) => Number.isFinite(offset) && offset >= daysLeft)
    .sort((a, b) => a - b);

  return applicable.length > 0 ? applicable[0] : null;
}

/**
 * Sends one WhatsApp notification and records it.
 *
 * De-duplicates on (phoneNumber, type, dedupeKey): an existing SENT row short
 * circuits, so re-running the job — or running it manually mid-demo — will not
 * message the same farmer twice. A FAILED row stays retryable.
 *
 * @returns {Promise<{status: 'SENT'|'FAILED'|'SKIPPED', reason?: string}>}
 */
async function dispatchNotification({ phoneNumber, farmerId = null, type, dedupeKey, language = 'mr', body }) {
  const to = toWhatsAppAddress(phoneNumber);
  if (!to) {
    return { status: 'SKIPPED', reason: 'INVALID_RECIPIENT' };
  }

  const existing = await NotificationLog.findOne({ phoneNumber, type, dedupeKey });
  if (existing && existing.status === NOTIFICATION_STATUS.SENT) {
    return { status: 'SKIPPED', reason: 'ALREADY_SENT' };
  }

  const provider = getNotificationProvider();
  const result = await provider.sendMessage(to, body);
  const sent = !result.error;

  const logEntry = {
    farmerId,
    language,
    provider: provider.name,
    body,
    status: sent ? NOTIFICATION_STATUS.SENT : NOTIFICATION_STATUS.FAILED,
    providerMessageId: sent ? result.messageId : undefined,
    error: sent ? undefined : `${result.error}: ${result.message || ''}`.trim(),
    sentAt: sent ? new Date() : undefined,
  };

  await NotificationLog.findOneAndUpdate(
    { phoneNumber, type, dedupeKey },
    { $set: logEntry },
    { upsert: true, new: true }
  );

  return sent
    ? { status: 'SENT' }
    : { status: 'FAILED', reason: result.error };
}

/**
 * One-time "what is E-Peek Pahani and why it matters" message.
 *
 * Called on first contact from an unknown number, so it also reaches people who
 * are not registered farmers yet — which is the point, since the farmers who
 * miss out on relief are the ones who never filed at all. Sent as text; the
 * NotificationProvider interface would carry a pre-recorded voice note the same
 * way once one is produced.
 */
async function sendAwarenessIntro(phoneNumber, language = 'mr', farmerId = null) {
  return dispatchNotification({
    phoneNumber,
    farmerId,
    type: NOTIFICATION_TYPES.AWARENESS_INTRO,
    dedupeKey: DEDUPE_KEYS.FIRST_CONTACT,
    language,
    body: getMessage('AWARENESS_INTRO', language),
  });
}

/**
 * Farmers in a deadline's scope with nothing filed for the season yet.
 *
 * Scope is resolved through associated Gats because district lives on the Gat,
 * not the Farmer. Farmers with no Gat linked are excluded: the reminder's call
 * to action ("send Hi to file now") is not actionable for them, and telling
 * them otherwise would be misleading.
 */
async function findFarmersNeedingReminder(deadline) {
  // Any farmer with at least one registered parcel...
  const farmerQuery = { associatedGats: { $exists: true, $not: { $size: 0 } } };

  if (deadline.district) {
    // ...narrowed to the deadline's district. $in on an array field already
    // implies a non-empty array, so this replaces the clause above.
    const gatIds = await Gat.find({ district: deadline.district }).distinct('_id');
    if (gatIds.length === 0) return [];
    farmerQuery.associatedGats = { $in: gatIds };
  }

  const farmers = await Farmer.find(farmerQuery);
  if (farmers.length === 0) return [];

  // Any submission created on or after the season start counts as filed.
  const filedFarmerIds = await Submission.distinct('farmerId', {
    farmerId: { $in: farmers.map((f) => f._id) },
    status: { $in: FILED_SUBMISSION_STATUSES },
    createdAt: { $gte: deadline.seasonStart },
  });

  const filed = new Set(filedFarmerIds.map((id) => id.toString()));
  return farmers.filter((farmer) => !filed.has(farmer._id.toString()));
}

/** Builds the deadline reminder body in the farmer's preferred language. */
function buildReminderBody(deadline, language, now = new Date()) {
  const daysLeft = Math.max(daysBetween(now, deadline.deadlineDate), 0);

  return getMessage('DEADLINE_REMINDER', language, {
    season: getMessage(`SEASON_${deadline.season}`, language),
    year: deadline.year,
    date: formatDeadlineDate(deadline.deadlineDate),
    days: daysLeft,
  });
}

/**
 * Scans active scheme deadlines and reminds every farmer with no filing for the
 * season. Safe to run repeatedly — see dispatchNotification for de-duplication.
 *
 * @returns {Promise<Object>} counts plus a per-deadline breakdown
 */
async function runDeadlineReminders({ now = new Date() } = {}) {
  const summary = {
    deadlinesDue: 0,
    remindersSent: 0,
    skipped: 0,
    failed: 0,
    deadlines: [],
  };

  const deadlines = await SchemeDeadline.find({ isActive: true }).sort({ deadlineDate: 1 });

  for (const deadline of deadlines) {
    const offsetDays = dueReminderOffset(deadline, now);
    if (offsetDays === null) continue;

    summary.deadlinesDue += 1;

    const farmers = await findFarmersNeedingReminder(deadline);
    const detail = {
      deadlineId: deadline._id.toString(),
      season: deadline.season,
      year: deadline.year,
      offsetDays,
      candidates: farmers.length,
      sent: 0,
      skipped: 0,
      failed: 0,
    };

    for (const farmer of farmers) {
      const language = farmer.preferredLanguage || 'mr';
      const result = await dispatchNotification({
        phoneNumber: farmer.phoneNumber,
        farmerId: farmer._id,
        type: NOTIFICATION_TYPES.DEADLINE_REMINDER,
        dedupeKey: `${deadline._id.toString()}:${offsetDays}`,
        language,
        body: buildReminderBody(deadline, language, now),
      });

      if (result.status === 'SENT') {
        detail.sent += 1;
        summary.remindersSent += 1;
      } else if (result.status === 'FAILED') {
        detail.failed += 1;
        summary.failed += 1;
      } else {
        detail.skipped += 1;
        summary.skipped += 1;
      }
    }

    summary.deadlines.push(detail);
  }

  return summary;
}

module.exports = {
  runDeadlineReminders,
  sendAwarenessIntro,
  dispatchNotification,
  findFarmersNeedingReminder,
  dueReminderOffset,
  buildReminderBody,
  toWhatsAppAddress,
  daysBetween,
  formatDeadlineDate,
};
