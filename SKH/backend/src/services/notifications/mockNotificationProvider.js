const NotificationProvider = require('./notificationProvider');
const { CHANNELS } = require('./constants');

/**
 * Deterministic mock sender for local development, tests, and demos without
 * live Twilio credentials. Messages, texts and calls are logged to the console
 * and retained in memory so a demo can show exactly what each farmer would have
 * received on each channel.
 *
 * DEMO MODE — nothing leaves the machine. Set NOTIFICATION_PROVIDER=twilio with
 * WhatsApp sandbox credentials to send for real.
 */
class MockNotificationProvider extends NotificationProvider {
  constructor() {
    super();
    this.sent = [];
    this.calls = [];
    this.counter = 0;
    // Delivery states the demo/test has decided each provider id should report,
    // keyed by messageId/callId. Without an entry, getDeliveryStatus answers
    // 'sent' (accepted, unconfirmed) — the realistic default, and the state that
    // makes the escalation windows matter.
    this.deliveryStates = new Map();
  }

  get name() {
    return 'mock';
  }

  /** Shared plumbing: the three send paths differ only in what they record. */
  _record(kind, to, payload) {
    if (!to) {
      return { error: 'INVALID_RECIPIENT', message: 'Missing recipient number' };
    }
    if (!payload) {
      return { error: 'EMPTY_BODY', message: 'Missing message body' };
    }

    // Lets tests exercise the failure path without stubbing the provider.
    if (to.includes('fail')) {
      return { error: 'PROVIDER_ERROR', message: 'Simulated send failure' };
    }

    this.counter += 1;
    const id = `mock_${kind}_${this.counter}`;

    if (kind === 'call') {
      this.calls.push({ to, twiml: payload, callId: id });
    } else {
      this.sent.push({ to, body: payload, messageId: id, channel: kind === 'sms' ? CHANNELS.SMS : CHANNELS.WHATSAPP });
    }

    // Kept quiet under test so the suite output stays readable; the send is
    // still recorded above and assertable via the getters below.
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Notifications][MOCK][${kind.toUpperCase()}] -> ${to}\n${payload}\n`);
    }

    return kind === 'call' ? { callId: id } : { messageId: id };
  }

  async sendMessage(to, body) {
    // Keeps the id prefix as `mock_msg_` so existing assertions still read true.
    return this._record('msg', to, body);
  }

  async sendSms(to, body) {
    return this._record('sms', to, body);
  }

  async placeVoiceCall(to, twiml) {
    return this._record('call', to, twiml);
  }

  async getDeliveryStatus(providerId, channel) {
    if (!providerId) {
      return { error: 'INVALID_ID', message: 'Missing provider message id' };
    }

    if (this.deliveryStates.has(providerId)) {
      return { status: this.deliveryStates.get(providerId) };
    }

    // Accepted by the "carrier", not confirmed by the handset.
    return { status: channel === CHANNELS.VOICE ? 'queued' : 'sent' };
  }

  /**
   * Demo/test helper: force what a given send will report next time it is polled.
   * This is how the demo panel makes a WhatsApp message look unread without
   * waiting 24 hours for a real handset to stay silent.
   */
  setDeliveryStatus(providerId, status) {
    this.deliveryStates.set(providerId, status);
  }

  /** Test/demo helper: everything this provider instance has "sent". */
  getSentMessages() {
    return this.sent;
  }

  /** Test/demo helper: every call this provider instance has "placed". */
  getPlacedCalls() {
    return this.calls;
  }

  reset() {
    this.sent = [];
    this.calls = [];
    this.counter = 0;
    this.deliveryStates.clear();
  }
}

module.exports = MockNotificationProvider;
