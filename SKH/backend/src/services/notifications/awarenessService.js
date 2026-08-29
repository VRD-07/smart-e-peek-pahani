const Farmer = require('../../models/Farmer');
const Gat = require('../../models/Gat');
const Submission = require('../../models/Submission');
const SchemeDeadline = require('../../models/SchemeDeadline');
const NotificationLog = require('../../models/NotificationLog');
const { getMessage } = require('../whatsapp/messages');
const {
  escalateNotification,
  runEscalation,
  sendOnChannel,
  summarizeAttempts,
} = require('./escalationService');
const {
  toWhatsAppAddress,
  daysBetween,
  formatDeadlineDate,
} = require('./addressing');
const { findFarmerByPhone } = require('../farmers/farmerLookup');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUS,
  CHANNELS,
  ESCALATION_ORDER,
  ESCALATION_ACTIONS,
  FILED_SUBMISSION_STATUSES,
  DEDUPE_KEYS,
} = require('./constants');

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
 * The single-channel path, for notifications that have no business waking someone
 * with a phone call: the first-contact intro and the calamity-relief notice. The
 * escalating path is escalateFarmerReminder.
 *
 * De-duplicates on (phoneNumber, type, dedupeKey, WHATSAPP): an existing SENT row
 * short circuits, so re-running the job — or running it manually mid-demo — will
 * not message the same farmer twice. A FAILED row stays retryable.
 *
 * @returns {Promise<{status: 'SENT'|'FAILED'|'SKIPPED', reason?: string}>}
 */
async function dispatchNotification({ phoneNumber, farmerId = null, type, dedupeKey, language = 'mr', body }) {
  const existing = await NotificationLog.findOne({
    phoneNumber,
    type,
    dedupeKey,
    channel: CHANNELS.WHATSAPP,
  });
  if (existing && existing.status === NOTIFICATION_STATUS.SENT) {
    return { status: 'SKIPPED', reason: 'ALREADY_SENT' };
  }

  const result = await sendOnChannel({
    channel: CHANNELS.WHATSAPP,
    phoneNumber,
    farmerId,
    type,
    dedupeKey,
    language,
    body,
  });

  return result.status === ESCALATION_ACTIONS.SENT
    ? { status: 'SENT' }
    : { status: result.status, reason: result.reason };
}

/**
 * One-time "what is E-Peek Pahani and why it matters" message.
 *
 * Called on first contact from an unknown number, so it also reaches people who
 * are not registered farmers yet — which is the point, since the farmers who
 * miss out on relief are the ones who never filed at all. WhatsApp only: someone
 * who has just messaged the bot is demonstrably on WhatsApp, so there is nothing
 * for the ladder to escalate to.
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
 * The same reminder cut down to what survives an SMS.
 *
 * Not a truncation of the WhatsApp body: it drops the explanation and keeps the
 * deadline, the consequence and the one action, because a Devanagari SMS gets
 * 70 characters per segment.
 */
function buildSmsReminderBody(deadline, language) {
  return getMessage('SMS_DEADLINE_REMINDER', language, {
    season: getMessage(`SEASON_${deadline.season}`, language),
    year: deadline.year,
    date: formatDeadlineDate(deadline.deadlineDate),
  });
}

/** The dedupe key that identifies one reminder bucket for one deadline. */
function reminderDedupeKey(deadline, offsetDays) {
  const id = deadline._id ? deadline._id.toString() : String(deadline);
  return `${id}:${offsetDays}`;
}

/**
 * Advances one farmer's reminder down the WhatsApp → SMS → voice ladder.
 *
 * A reusable service function rather than logic living inside the cron job,
 * because three callers need it: the daily sweep, the officer-facing manual
 * trigger, and the internal demo panel.
 *
 * @param {boolean} [options.force] - Ignore the elapsed-time windows so the whole
 *   ladder can be walked now instead of over two days.
 */
async function escalateFarmerReminder(farmer, deadline, offsetDays, { now = new Date(), force = false } = {}) {
  const language = farmer.preferredLanguage || 'mr';

  return escalateNotification({
    phoneNumber: farmer.phoneNumber,
    farmerId: farmer._id,
    type: NOTIFICATION_TYPES.DEADLINE_REMINDER,
    dedupeKey: reminderDedupeKey(deadline, offsetDays),
    language,
    bodies: {
      [CHANNELS.WHATSAPP]: buildReminderBody(deadline, language, now),
      [CHANNELS.SMS]: buildSmsReminderBody(deadline, language),
      // VOICE carries no text — it plays the pre-recorded asset for this
      // notification type. See voiceMessages.js.
    },
    now,
    force,
  });
}

/**
 * Scans active scheme deadlines and reminds every farmer with no filing for the
 * season, one rung of the escalation ladder per sweep.
 *
 * Safe to run repeatedly: a farmer whose WhatsApp reminder is still inside its
 * confirmation window is left alone rather than re-messaged, so the daily cron is
 * what paces the ladder.
 *
 * @returns {Promise<Object>} counts plus a per-deadline breakdown
 */
async function runDeadlineReminders({ now = new Date(), force = false } = {}) {
  const summary = {
    deadlinesDue: 0,
    remindersSent: 0,
    skipped: 0,
    failed: 0,
    exhausted: 0,
    byChannel: { [CHANNELS.WHATSAPP]: 0, [CHANNELS.SMS]: 0, [CHANNELS.VOICE]: 0 },
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
      exhausted: 0,
    };

    for (const farmer of farmers) {
      const result = await escalateFarmerReminder(farmer, deadline, offsetDays, { now, force });

      if (result.action === ESCALATION_ACTIONS.SENT) {
        detail.sent += 1;
        summary.remindersSent += 1;
        summary.byChannel[result.channel] += 1;
      } else if (result.action === ESCALATION_ACTIONS.FAILED) {
        detail.failed += 1;
        summary.failed += 1;
      } else if (result.action === ESCALATION_ACTIONS.EXHAUSTED) {
        // Every channel tried, none confirmed. Counted separately from `failed`
        // so the sweep's own errors stay distinguishable from farmers we simply
        // could not reach.
        detail.exhausted += 1;
        summary.exhausted += 1;
      } else {
        // REACHED (already confirmed) or WAITING (window still open).
        detail.skipped += 1;
        summary.skipped += 1;
      }
    }

    summary.deadlines.push(detail);
  }

  return summary;
}

/**
 * Fires the escalation ladder for one farmer immediately.
 *
 * Backs the officer-facing manual trigger and, in Phase 8, the demo panel's
 * SMS/voice buttons — which is why it takes `upToChannel`: "show me the SMS
 * fallback" should not also place a phone call.
 *
 * @param {Object} params
 * @param {string} [params.farmerId] - Either this or phoneNumber.
 * @param {string} [params.phoneNumber]
 * @param {boolean} [params.force=true] - Defaults to true: the entire point of a
 *   manual trigger is to skip the real time windows.
 * @param {string} [params.upToChannel] - Stop after this rung.
 */
async function escalateForFarmer({
  farmerId = null,
  phoneNumber = null,
  upToChannel = CHANNELS.VOICE,
  force = true,
  now = new Date(),
} = {}) {
  const farmer = farmerId
    ? await Farmer.findById(farmerId)
    : await findFarmerByPhone(phoneNumber);

  if (!farmer) return { error: 'FARMER_NOT_FOUND' };

  // The bucket the farmer would be reminded about right now. Falling back to the
  // nearest active deadline keeps the trigger usable outside a reminder window,
  // which is where a demo usually sits.
  const deadlines = await SchemeDeadline.find({ isActive: true }).sort({ deadlineDate: 1 });
  if (deadlines.length === 0) return { error: 'NO_ACTIVE_DEADLINE' };

  let deadline = null;
  let offsetDays = null;

  for (const candidate of deadlines) {
    const due = dueReminderOffset(candidate, now);
    if (due !== null) {
      deadline = candidate;
      offsetDays = due;
      break;
    }
  }

  if (!deadline) {
    deadline = deadlines[0];
    // No bucket is due, so label the attempt with the tightest configured offset
    // rather than inventing one. The dedupe key stays honest about which bucket
    // this belongs to.
    const offsets = (deadline.reminderOffsetsDays || []).filter(Number.isFinite).sort((a, b) => a - b);
    offsetDays = offsets.length > 0 ? offsets[0] : 0;
  }

  const language = farmer.preferredLanguage || 'mr';

  const result = await runEscalation({
    phoneNumber: farmer.phoneNumber,
    farmerId: farmer._id,
    type: NOTIFICATION_TYPES.DEADLINE_REMINDER,
    dedupeKey: reminderDedupeKey(deadline, offsetDays),
    language,
    bodies: {
      [CHANNELS.WHATSAPP]: buildReminderBody(deadline, language, now),
      [CHANNELS.SMS]: buildSmsReminderBody(deadline, language),
    },
    now,
    force,
  }, { upToChannel });

  return {
    farmer: {
      id: farmer._id.toString(),
      name: farmer.name,
      phoneNumber: farmer.phoneNumber,
      preferredLanguage: language,
    },
    deadline: {
      id: deadline._id.toString(),
      season: deadline.season,
      year: deadline.year,
      offsetDays,
    },
    ...result,
  };
}

/**
 * The reminder bucket each active deadline is currently on.
 *
 * Prefers the bucket that is due right now. Outside a reminder window it falls
 * back to the most recent bucket that actually produced log rows, so the
 * dashboard keeps showing the last cycle's outcome instead of going blank.
 */
async function currentReminderCycles(now = new Date()) {
  const deadlines = await SchemeDeadline.find({ isActive: true }).sort({ deadlineDate: 1 });
  const cycles = [];

  for (const deadline of deadlines) {
    const id = deadline._id.toString();
    const due = dueReminderOffset(deadline, now);
    let dedupeKey = due === null ? null : reminderDedupeKey(deadline, due);
    let offsetDays = due;

    if (!dedupeKey) {
      const latest = await NotificationLog.findOne({
        type: NOTIFICATION_TYPES.DEADLINE_REMINDER,
        dedupeKey: new RegExp(`^${id}:`),
      }).sort({ createdAt: -1 });

      if (!latest) continue;
      dedupeKey = latest.dedupeKey;
      offsetDays = Number.parseInt(dedupeKey.split(':')[1], 10);
    }

    cycles.push({
      deadlineId: id,
      season: deadline.season,
      year: deadline.year,
      offsetDays,
      dedupeKey,
    });
  }

  return cycles;
}

/**
 * Which channel reached each farmer in the current reminder cycle.
 *
 * Reads the stored delivery status rather than polling the provider: this backs a
 * dashboard the officer may refresh repeatedly, and one API call per log row per
 * refresh is not a trade worth making. The statuses are refreshed by the daily
 * sweep, which is the thing that acts on them.
 *
 * `reached` counts confirmed delivery per channel. `attempted` counts sends,
 * confirmed or not — reported separately because most sends sit unconfirmed for a
 * while, and a block showing only `reached` would read as though nothing had been
 * sent at all.
 */
async function reminderReachStats({ now = new Date() } = {}) {
  const cycles = await currentReminderCycles(now);

  const stats = {
    cycles,
    total: 0,
    reached: { [CHANNELS.WHATSAPP]: 0, [CHANNELS.SMS]: 0, [CHANNELS.VOICE]: 0 },
    attempted: { [CHANNELS.WHATSAPP]: 0, [CHANNELS.SMS]: 0, [CHANNELS.VOICE]: 0 },
    unreached: 0,
    pending: 0,
  };

  if (cycles.length === 0) return stats;

  const logs = await NotificationLog.find({
    type: NOTIFICATION_TYPES.DEADLINE_REMINDER,
    dedupeKey: { $in: cycles.map((c) => c.dedupeKey) },
  });

  // One farmer may appear under several deadlines; group per (number, cycle) so
  // each reminder is judged on its own ladder.
  const groups = new Map();
  for (const log of logs) {
    const key = `${log.phoneNumber}|${log.dedupeKey}`;
    if (!groups.has(key)) groups.set(key, {});
    groups.get(key)[log.channel] = log;
  }

  for (const attempts of groups.values()) {
    const outcome = summarizeAttempts(attempts);
    stats.total += 1;

    for (const channel of ESCALATION_ORDER) {
      if (attempts[channel]) stats.attempted[channel] += 1;
    }

    if (outcome.reachedVia) stats.reached[outcome.reachedVia] += 1;
    else if (outcome.unreached) stats.unreached += 1;
    else stats.pending += 1;
  }

  return stats;
}

module.exports = {
  runDeadlineReminders,
  sendAwarenessIntro,
  dispatchNotification,
  findFarmersNeedingReminder,
  dueReminderOffset,
  buildReminderBody,
  buildSmsReminderBody,
  reminderDedupeKey,
  escalateFarmerReminder,
  escalateForFarmer,
  currentReminderCycles,
  reminderReachStats,
  // Re-exported from addressing.js, which they moved to when SMS and voice
  // needed them too. Kept here so existing callers do not have to change.
  toWhatsAppAddress,
  daysBetween,
  formatDeadlineDate,
};
