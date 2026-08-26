const NotificationProvider = require('./notificationProvider');

/**
 * Deterministic mock sender for local development, tests, and demos without
 * live Twilio credentials. Messages are logged to the console and retained in
 * memory so a demo can show exactly what each farmer would have received.
 *
 * DEMO MODE — nothing leaves the machine. Set NOTIFICATION_PROVIDER=twilio with
 * WhatsApp sandbox credentials to send for real.
 */
class MockWhatsAppProvider extends NotificationProvider {
  constructor() {
    super();
    this.sent = [];
    this.counter = 0;
  }

  get name() {
    return 'mock';
  }

  async sendMessage(to, body) {
    if (!to) {
      return { error: 'INVALID_RECIPIENT', message: 'Missing recipient number' };
    }
    if (!body) {
      return { error: 'EMPTY_BODY', message: 'Missing message body' };
    }

    // Lets tests exercise the failure path without stubbing the provider.
    if (to.includes('fail')) {
      return { error: 'PROVIDER_ERROR', message: 'Simulated send failure' };
    }

    this.counter += 1;
    const messageId = `mock_msg_${this.counter}`;
    this.sent.push({ to, body, messageId });

    // Kept quiet under test so the suite output stays readable; the message is
    // still recorded above and assertable via getSentMessages().
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Notifications][MOCK] -> ${to}\n${body}\n`);
    }

    return { messageId };
  }

  /** Test/demo helper: everything this provider instance has "sent". */
  getSentMessages() {
    return this.sent;
  }

  reset() {
    this.sent = [];
    this.counter = 0;
  }
}

module.exports = MockWhatsAppProvider;
