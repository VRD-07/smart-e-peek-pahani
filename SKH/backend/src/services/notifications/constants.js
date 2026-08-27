const env = require('../../config/env');

const NOTIFICATION_TYPES = {
  // One-time "what is E-Peek Pahani and why it matters" message, sent the first
  // time an unknown number contacts the bot.
  AWARENESS_INTRO: 'AWARENESS_INTRO',
  // Filing-deadline nudge for a farmer with nothing on file this season.
  DEADLINE_REMINDER: 'DEADLINE_REMINDER',
  // Calamity zone overlaps the farmer's registered Gat (Phase 3).
  CALAMITY_RELIEF: 'CALAMITY_RELIEF',
  // A filing was routed to a human instead of auto-approved, so the farmer knows
  // it is not lost and does not re-file over the top of it.
  SUBMISSION_REVIEW: 'SUBMISSION_REVIEW',
};

const NOTIFICATION_STATUS = {
  SENT: 'SENT',
  FAILED: 'FAILED',
};

/**
 * The three channels, in escalation order: richest and cheapest first.
 *
 * WhatsApp carries the full message, works offline-ish, and costs the least.
 * SMS reaches a handset with no WhatsApp or no data. A voice call reaches someone
 * who cannot read the SMS at all. Every rung down is more intrusive and more
 * expensive, which is why the ladder only descends when the rung above went
 * unanswered.
 */
const CHANNELS = {
  WHATSAPP: 'WHATSAPP',
  SMS: 'SMS',
  VOICE: 'VOICE',
};

const ESCALATION_ORDER = [CHANNELS.WHATSAPP, CHANNELS.SMS, CHANNELS.VOICE];

/**
 * What one channel attempt tells us about whether the farmer actually got it.
 *
 * UNCONFIRMED is the common case and the reason the windows exist: Twilio has
 * accepted the message but the handset has not confirmed anything yet. Escalating
 * on UNCONFIRMED immediately would triple-message everyone; never escalating on
 * it would mean a farmer whose phone was off never hears from us again.
 *
 * RETRYABLE is deliberately distinct from UNREACHED. A send our own API call
 * failed on says nothing about the farmer — it is usually a transient provider
 * error — so the same channel is tried again on the next sweep rather than
 * treated as a rung the farmer ignored. Only once a channel has burned through
 * MAX_CHANNEL_SEND_ATTEMPTS does it become UNREACHED and let the ladder descend.
 */
const CHANNEL_STATES = {
  NOT_ATTEMPTED: 'NOT_ATTEMPTED',
  REACHED: 'REACHED',
  UNCONFIRMED: 'UNCONFIRMED',
  RETRYABLE: 'RETRYABLE',
  UNREACHED: 'UNREACHED',
};

// How many times one channel may fail to hand off to the provider before the
// ladder gives up on it. Two, because the first failure is usually noise and the
// second is usually the number.
const MAX_CHANNEL_SEND_ATTEMPTS = 2;

/** What one call to the ladder did. */
const ESCALATION_ACTIONS = {
  SENT: 'SENT',
  // Already confirmed delivered on an earlier rung — nothing to do.
  REACHED: 'REACHED',
  // The rung above is unconfirmed and its window has not elapsed yet.
  WAITING: 'WAITING',
  // The provider rejected the send. Same channel is retried next sweep.
  FAILED: 'FAILED',
  // All three channels attempted, none confirmed.
  EXHAUSTED: 'EXHAUSTED',
  // No dialable number, or nothing to send.
  SKIPPED: 'SKIPPED',
};

// Twilio's own delivery vocabulary, normalized into the two buckets the ladder
// cares about. Anything not listed (queued, sending, sent, ringing, in-progress)
// is UNCONFIRMED — accepted by the carrier, unconfirmed by the handset.
const DELIVERED_STATUSES = ['delivered', 'read', 'completed'];
const UNDELIVERED_STATUSES = ['undelivered', 'failed', 'busy', 'no-answer', 'canceled'];

// Hours to wait for a confirmation on a channel before dropping to the next one.
// Defaults chosen so a farmer messaged at 08:00 gets an SMS the following morning
// and a call the morning after that — not three notifications in one afternoon.
const DEFAULT_ESCALATION_WINDOW_HOURS = {
  [CHANNELS.WHATSAPP]: 24,
  [CHANNELS.SMS]: 24,
  // Nothing escalates past voice; kept for completeness so windowHours() never
  // returns undefined.
  [CHANNELS.VOICE]: 24,
};

/**
 * The configured wait before escalating off `channel`, in hours.
 *
 * Read from config rather than hardcoded so a demo can set both windows to 0 and
 * walk the whole ladder in one sweep. Unparseable or negative values fall back to
 * the default instead of silently collapsing the window to zero.
 */
function escalationWindowHours(channel) {
  const configured = channel === CHANNELS.SMS
    ? env.escalationSmsWindowHours
    : env.escalationWhatsappWindowHours;

  const parsed = Number.parseFloat(configured);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_ESCALATION_WINDOW_HOURS[channel];
}

/**
 * Whether a WhatsApp message has to be *read* — not merely delivered — to count
 * as reaching the farmer.
 *
 * Defaults to true, which is the stricter reading: an unread message has not done
 * its job. The cost is that farmers who switch WhatsApp read receipts off never
 * produce a 'read' status, so they will always be escalated to SMS and then to a
 * call. Set ESCALATION_WHATSAPP_REQUIRE_READ=false to accept 'delivered' instead
 * and stop over-contacting that group.
 */
function whatsappRequiresRead() {
  return String(env.escalationWhatsappRequireRead ?? 'true').toLowerCase() !== 'false';
}

// Statuses that mean the farmer already has a filing on record for the season.
// DRAFT (never left the device) and INVALID (rejected, nothing counts as filed)
// are deliberately excluded — those are exactly the farmers who end up with no
// record when relief is assessed, so they still get a reminder.
const FILED_SUBMISSION_STATUSES = [
  'PENDING_VALIDATION',
  'VALID',
  'REVIEW',
  'SYNC_PENDING',
  'SYNCED',
];

const DEDUPE_KEYS = {
  FIRST_CONTACT: 'FIRST_CONTACT',
};

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUS,
  CHANNELS,
  ESCALATION_ORDER,
  CHANNEL_STATES,
  MAX_CHANNEL_SEND_ATTEMPTS,
  ESCALATION_ACTIONS,
  DELIVERED_STATUSES,
  UNDELIVERED_STATUSES,
  DEFAULT_ESCALATION_WINDOW_HOURS,
  escalationWindowHours,
  whatsappRequiresRead,
  FILED_SUBMISSION_STATUSES,
  DEDUPE_KEYS,
};
