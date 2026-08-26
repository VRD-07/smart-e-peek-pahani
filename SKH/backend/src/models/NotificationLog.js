const mongoose = require('mongoose');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUS,
} = require('../services/notifications/constants');

/**
 * Audit trail for every outbound WhatsApp notification.
 *
 * Doubles as the de-duplication ledger: the awareness job checks for an
 * existing SENT row before dispatching, so re-running the cron (or running it
 * manually during a demo) does not message the same farmer twice. A FAILED row
 * is left retryable and upgraded to SENT on a later run.
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
    enum: ['WHATSAPP'],
    default: 'WHATSAPP',
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

notificationLogSchema.index({ phoneNumber: 1, type: 1, dedupeKey: 1 }, { unique: true });

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);

module.exports = NotificationLog;
