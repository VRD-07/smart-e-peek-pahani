const NotificationLog = require('../../models/NotificationLog');
const { getNotificationProvider } = require('./notificationFactory');
const { buildVoiceTwiml } = require('./voiceMessages');
const {
  toWhatsAppAddress,
  toSmsAddress,
  toVoiceAddress,
  hoursBetween,
} = require('./addressing');
const {
  NOTIFICATION_STATUS,
  CHANNELS,
  ESCALATION_ORDER,
  CHANNEL_STATES,
  MAX_CHANNEL_SEND_ATTEMPTS,
  ESCALATION_ACTIONS,
  DELIVERED_STATUSES,
  UNDELIVERED_STATUSES,
  escalationWindowHours,
  whatsappRequiresRead,
} = require('./constants');

/**
 * Multi-channel escalation for business-initiated notifications.
 *
 * WhatsApp first, because it is the richest and cheapest channel and the one the
 * bot already talks over. If it goes unconfirmed past its window, a shortened SMS.
 * If that also goes unconfirmed, an automated voice call playing a pre-recorded
 * message. Each rung is more intrusive and more expensive than the last, so the
 * ladder only descends when the rung above went unanswered.
 *
 * This is one notification system with three transports, not three systems: the
 * same NotificationLog rows, the same dedupe key, the same Twilio account.
 *
 * What it does NOT do is guarantee delivery. A farmer with a dead handset is
 * unreachable on all three channels, and the ladder's job is then to say so
 * plainly on the dashboard rather than to imply everyone was contacted.
 */

/** The recipient address a given channel needs. */
function addressFor(channel, phoneNumber) {
  if (channel === CHANNELS.WHATSAPP) return toWhatsAppAddress(phoneNumber);
  if (channel === CHANNELS.SMS) return toSmsAddress(phoneNumber);
  return toVoiceAddress(phoneNumber);
}

/**
 * Has this channel's send been confirmed as reaching the farmer?
 *
 * WhatsApp is held to 'read' by default rather than 'delivered' — see
 * whatsappRequiresRead() for why, and for the cost of that choice.
 */
function isDelivered(channel, deliveryStatus) {
  if (!deliveryStatus) return false;

  const status = deliveryStatus.toLowerCase();

  if (channel === CHANNELS.WHATSAPP && whatsappRequiresRead()) {
    return status === 'read';
  }

  return DELIVERED_STATUSES.includes(status);
}

function isUndelivered(deliveryStatus) {
  return !!deliveryStatus && UNDELIVERED_STATUSES.includes(deliveryStatus.toLowerCase());
}

/**
 * Refreshes a log row's delivery state from the provider.
 *
 * Called before deciding whether to escalate, because the ladder's whole
 * judgement rests on this value. A lookup failure leaves the stored state alone:
 * treating "we could not ask Twilio" as "undelivered" would escalate a message
 * that may well have landed.
 */
async function refreshDeliveryStatus(log) {
  if (!log || log.status !== NOTIFICATION_STATUS.SENT || !log.providerMessageId) return log;

  // Terminal states never change; don't spend an API call re-asking.
  if (isDelivered(log.channel, log.deliveryStatus) || isUndelivered(log.deliveryStatus)) return log;

  const result = await getNotificationProvider().getDeliveryStatus(log.providerMessageId, log.channel);
  if (result.error) return log;

  log.deliveryStatus = result.status;
  log.deliveryCheckedAt = new Date();
  await log.save();

  return log;
}

/**
 * Where this channel stands for this message.
 *
 * @returns {string} one of CHANNEL_STATES
 */
function channelState(log) {
  if (!log) return CHANNEL_STATES.NOT_ATTEMPTED;

  // The send itself was rejected — nothing was ever handed to a carrier, so this
  // says nothing about the farmer. Worth one more go before writing the channel
  // off, because the usual cause is a transient provider error.
  if (log.status === NOTIFICATION_STATUS.FAILED) {
    return (log.attempts || 0) < MAX_CHANNEL_SEND_ATTEMPTS
      ? CHANNEL_STATES.RETRYABLE
      : CHANNEL_STATES.UNREACHED;
  }

  if (isDelivered(log.channel, log.deliveryStatus)) return CHANNEL_STATES.REACHED;
  if (isUndelivered(log.deliveryStatus)) return CHANNEL_STATES.UNREACHED;

  return CHANNEL_STATES.UNCONFIRMED;
}

/** Existing attempts for one message, keyed by channel. */
async function findAttempts({ phoneNumber, type, dedupeKey }) {
  const logs = await NotificationLog.find({ phoneNumber, type, dedupeKey });
  return logs.reduce((acc, log) => {
    acc[log.channel] = log;
    return acc;
  }, {});
}

/** Dispatches on one channel and upserts the audit row for it. */
async function sendOnChannel({
  channel,
  phoneNumber,
  farmerId = null,
  type,
  dedupeKey,
  language = 'mr',
  body,
}) {
  const to = addressFor(channel, phoneNumber);
  if (!to) {
    return { status: ESCALATION_ACTIONS.SKIPPED, reason: 'INVALID_RECIPIENT' };
  }

  const provider = getNotificationProvider();
  let result;
  let recordedBody = body;

  if (channel === CHANNELS.WHATSAPP) {
    if (!body) return { status: ESCALATION_ACTIONS.SKIPPED, reason: 'EMPTY_BODY' };
    result = await provider.sendMessage(to, body);
  } else if (channel === CHANNELS.SMS) {
    if (!body) return { status: ESCALATION_ACTIONS.SKIPPED, reason: 'EMPTY_BODY' };
    result = await provider.sendSms(to, body);
  } else {
    const twiml = buildVoiceTwiml(type);
    if (!twiml) {
      return { status: ESCALATION_ACTIONS.SKIPPED, reason: 'NO_VOICE_ASSET' };
    }
    // The audit row keeps the TwiML, not a transcript: it is the exact document
    // Twilio was asked to play, which is the auditable artefact.
    recordedBody = twiml;
    result = await provider.placeVoiceCall(to, twiml);
  }

  const providerId = result.messageId || result.callId;
  const sent = !result.error;

  const logEntry = {
    farmerId,
    language,
    provider: provider.name,
    body: recordedBody,
    status: sent ? NOTIFICATION_STATUS.SENT : NOTIFICATION_STATUS.FAILED,
    providerMessageId: sent ? providerId : undefined,
    error: sent ? undefined : `${result.error}: ${result.message || ''}`.trim(),
    sentAt: sent ? new Date() : undefined,
    deliveryStatus: undefined,
    deliveryCheckedAt: undefined,
  };

  const log = await NotificationLog.findOneAndUpdate(
    { phoneNumber, type, dedupeKey, channel },
    { $set: logEntry, $inc: { attempts: 1 } },
    { upsert: true, returnDocument: 'after' }
  );

  return sent
    ? { status: ESCALATION_ACTIONS.SENT, channel, log }
    : { status: ESCALATION_ACTIONS.FAILED, channel, reason: result.error, log };
}

/**
 * Advances the ladder by at most one rung.
 *
 * Deliberately one rung per call rather than a loop: the daily awareness sweep is
 * the clock. Day one sends WhatsApp, day two — if nothing came back — sends the
 * SMS, day three places the call. Nothing needs its own scheduler, and a farmer
 * cannot be hit by all three in an afternoon just because a cron ran twice.
 *
 * @param {Object} params
 * @param {Object} params.bodies - Per-channel text, e.g. { WHATSAPP, SMS }. VOICE
 *   is built from the pre-recorded asset for `type`, so it needs no entry.
 * @param {boolean} [params.force=false] - Demo/manual path: ignore the elapsed-time
 *   windows AND treat an unconfirmed rung as unreached, so the whole ladder can be
 *   walked in seconds instead of two days.
 * @returns {Promise<{action: string, channel?: string, reachedVia?: string, reason?: string}>}
 */
async function escalateNotification({
  phoneNumber,
  farmerId = null,
  type,
  dedupeKey,
  language = 'mr',
  bodies = {},
  now = new Date(),
  force = false,
}) {
  const attempts = await findAttempts({ phoneNumber, type, dedupeKey });

  for (const channel of ESCALATION_ORDER) {
    let log = attempts[channel];

    if (log) log = await refreshDeliveryStatus(log);

    const state = channelState(log);

    if (state === CHANNEL_STATES.REACHED) {
      return { action: ESCALATION_ACTIONS.REACHED, channel, reachedVia: channel };
    }

    if (state === CHANNEL_STATES.UNCONFIRMED) {
      const waited = hoursBetween(log.sentAt || log.createdAt, now);
      if (!force && waited < escalationWindowHours(channel)) {
        return {
          action: ESCALATION_ACTIONS.WAITING,
          channel,
          waitedHours: Number(waited.toFixed(2)),
          windowHours: escalationWindowHours(channel),
        };
      }
      // Past its window: drop to the next channel.
      continue;
    }

    if (state === CHANNEL_STATES.UNREACHED) continue;

    // Forcing the ladder means walking past a channel that has already failed
    // rather than retrying it, so a demo does not stall on a bad number.
    if (state === CHANNEL_STATES.RETRYABLE && force) continue;

    // NOT_ATTEMPTED, or RETRYABLE on a normal sweep.
    const result = await sendOnChannel({
      channel,
      phoneNumber,
      farmerId,
      type,
      dedupeKey,
      language,
      body: bodies[channel],
    });

    if (result.status === ESCALATION_ACTIONS.SENT) {
      return { action: ESCALATION_ACTIONS.SENT, channel };
    }

    if (force) continue;

    // A rejected send is reported as-is rather than escalated past. The provider,
    // not the farmer, is what went wrong, so the next sweep retries this same
    // channel — and only gives up on it once MAX_CHANNEL_SEND_ATTEMPTS is spent.
    return { action: result.status, channel, reason: result.reason };
  }

  return { action: ESCALATION_ACTIONS.EXHAUSTED };
}

/**
 * Walks the ladder repeatedly until it settles.
 *
 * Used by the manual trigger and the demo panel with force=true, where the point
 * is to see all three channels fire now rather than over two days.
 *
 * @param {Object} [options]
 * @param {string} [options.upToChannel] - Stop after sending on this channel, so
 *   "trigger the SMS fallback" does not also place a call.
 */
async function runEscalation(params, { upToChannel = CHANNELS.VOICE } = {}) {
  const limit = ESCALATION_ORDER.indexOf(upToChannel);
  const steps = [];
  let outcome = null;

  // One iteration per rung, plus one to observe the settled state. Bounded by the
  // ladder's own length rather than a while(true) with a guard.
  for (let i = 0; i <= ESCALATION_ORDER.length; i += 1) {
    const result = await escalateNotification(params);
    steps.push(result);
    outcome = result;

    if (result.action !== ESCALATION_ACTIONS.SENT) break;
    if (ESCALATION_ORDER.indexOf(result.channel) >= limit) break;
  }

  const reached = steps.find((step) => step.action === ESCALATION_ACTIONS.REACHED);

  return {
    steps,
    channelsAttempted: steps.filter((s) => s.action === ESCALATION_ACTIONS.SENT).map((s) => s.channel),
    reachedVia: reached ? reached.reachedVia : null,
    exhausted: outcome?.action === ESCALATION_ACTIONS.EXHAUSTED,
    finalAction: outcome?.action || null,
  };
}

/**
 * How one message ended up, across every channel it was tried on.
 *
 * `reachedVia` is the channel that confirmed delivery; null means none did.
 * `unreached` is only true once every channel has been tried and every one of them
 * came back undelivered — a message still working its way down the ladder is
 * `pending`, because calling it a failure while an SMS is still in flight would
 * overstate what we know.
 */
function summarizeAttempts(attempts) {
  const states = ESCALATION_ORDER.reduce((acc, channel) => {
    acc[channel] = channelState(attempts[channel]);
    return acc;
  }, {});

  const reachedVia = ESCALATION_ORDER.find((channel) => (
    states[channel] === CHANNEL_STATES.REACHED
  )) || null;

  const attemptedChannels = ESCALATION_ORDER.filter((channel) => (
    states[channel] !== CHANNEL_STATES.NOT_ATTEMPTED
  ));
  const allUnreached = ESCALATION_ORDER.every((channel) => (
    states[channel] === CHANNEL_STATES.UNREACHED
  ));

  return {
    reachedVia,
    states,
    attemptedChannels,
    pending: !reachedVia && !allUnreached,
    unreached: !reachedVia && allUnreached,
  };
}

/** summarizeAttempts for a single message, reading the log rows itself. */
async function escalationOutcome({ phoneNumber, type, dedupeKey }) {
  return summarizeAttempts(await findAttempts({ phoneNumber, type, dedupeKey }));
}

module.exports = {
  escalateNotification,
  runEscalation,
  sendOnChannel,
  refreshDeliveryStatus,
  channelState,
  findAttempts,
  summarizeAttempts,
  escalationOutcome,
  isDelivered,
  isUndelivered,
  addressFor,
};
