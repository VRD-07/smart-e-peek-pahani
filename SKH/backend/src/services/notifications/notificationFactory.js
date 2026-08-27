const env = require('../../config/env');
const MockNotificationProvider = require('./mockNotificationProvider');
const TwilioNotificationProvider = require('./twilioNotificationProvider');

// The mock provider keeps an in-memory log of what it "sent", so the factory
// hands back a single shared instance rather than a fresh one per call.
let mockInstance = null;
let twilioInstance = null;

/**
 * Factory to return the configured outbound notification provider.
 * Mirrors visionFactory / storageFactory.
 *
 * One provider covers WhatsApp, SMS and voice: they are three products on the
 * same Twilio account, and the escalation ladder moves between them.
 */
function getNotificationProvider() {
  const providerType = (env.notificationProvider || 'mock').toLowerCase();

  if (providerType === 'twilio') {
    if (!twilioInstance) twilioInstance = new TwilioNotificationProvider();
    return twilioInstance;
  }

  if (providerType === 'mock') {
    if (!mockInstance) mockInstance = new MockNotificationProvider();
    return mockInstance;
  }

  throw new Error(`Unknown NOTIFICATION_PROVIDER configured: ${providerType}`);
}

/** Test helper: drops cached instances so a new env value takes effect. */
function resetNotificationProvider() {
  mockInstance = null;
  twilioInstance = null;
}

module.exports = { getNotificationProvider, resetNotificationProvider };
