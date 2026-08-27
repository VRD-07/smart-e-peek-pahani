const mongoose = require('mongoose');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUS,
  CHANNELS,
} = require('../services/notifications/constants');

/**
 * Audit trail for every outbound notification attempt, on every channel.
 *
 * One row per (number, message, channel). A single deadline reminder that
 * escalates all the way therefore leaves three rows sharing a dedupeKey — that
 * grouping is what the Officer Dashboard's reach stat block reads, and what tells
 * an auditor which channel actually got through.
 *
 * Doubles as the de-duplication ledger: the awareness job checks for an existing
 * SENT row before dispatching, so re-running the cron (or running it manually
 * during a demo) does not message the same farmer twice on the same channel. A
 * FAILED row is left retryable and upgraded to SENT on a later run.
 */
const notificationLogSchema = new mongoose.Schema({
  // Stored in the same 'whatsapp:+91...' form Twilio uses for inbound webhooks,
  // so intro messages can be logged before a Farmer record exists.
  phoneNumber: {
    type: String,
    required: true,
    index: true,
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    default: null,
  },
  type: {
    type: String,
    enum: Object.values(NOTIFICATION_TYPES),
    required: true,
  },
  // Identifies the specific thing being notified about, e.g.
  // '<deadlineId>:7' for the 7-day reminder or 'FIRST_CONTACT' for the intro.
  // Shared across channels for one message, which is what makes an escalation
  // ladder groupable.
  dedupeKey: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    enum: ['mr', 'hi', 'en'],
    default: 'mr',
  },
  channel: {
    type: String,
    enum: Object.values(CHANNELS),
    default: CHANNELS.WHATSAPP,
  },
  provider: {
    type: String,
  },
  status: {
    type: String,
    enum: Object.values(NOTIFICATION_STATUS),
    required: true,
  },
  providerMessageId: {
    type: String,
  },
  // How many times we have handed this channel to the provider. A rejected send
  // is retried on the next sweep rather than escalated past, so the ladder needs
  // to know when to stop retrying — see MAX_CHANNEL_SEND_ATTEMPTS.
  attempts: {
    type: Number,
    default: 0,
  },
  // The provider's own last-known delivery state ('sent', 'delivered', 'read',
  // 'undelivered', 'no-answer', ...) rather than a normalized enum, so the audit
  // row records what Twilio actually said. Deliberately not an enum: a new
  // provider status must not be able to throw and take a sweep down with it.
  deliveryStatus: {
    type: String,
  },
  deliveryCheckedAt: {
    type: Date,
  },
  body: {
    type: String,
  },
  error: {
    type: String,
  },
  sentAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Channel is part of the key: an SMS fallback for a reminder already tried on
// WhatsApp is a separate attempt, not a duplicate of it.
notificationLogSchema.index({ phoneNumber: 1, type: 1, dedupeKey: 1, channel: 1 }, { unique: true });

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);

module.exports = NotificationLog;
