const twilio = require('twilio');
const env = require('../../config/env');
const NotificationProvider = require('./notificationProvider');

/**
 * Outbound WhatsApp sender backed by the Twilio API.
 *
 * Verified against the Twilio WhatsApp **sandbox**, where the farmer must have
 * joined the sandbox from their own handset first. Moving to a production
 * WhatsApp Business sender requires Meta's business verification and approved
 * message templates, which is an external approval process — hence the mock
 * provider remains the default.
 */
class TwilioWhatsAppProvider extends NotificationProvider {
  constructor() {
    super();

    if (!env.twilioAccountSid || !env.twilioAuthToken) {
      throw new Error('Missing Twilio credentials for outbound notifications');
    }
    if (!env.twilioWhatsappNumber) {
      throw new Error('Missing TWILIO_WHATSAPP_NUMBER for outbound notifications');
    }

    this.client = twilio(env.twilioAccountSid, env.twilioAuthToken);
    this.from = env.twilioWhatsappNumber;
  }

  get name() {
    return 'twilio';
  }

  async sendMessage(to, body) {
    if (!to) {
      return { error: 'INVALID_RECIPIENT', message: 'Missing recipient number' };
    }
    if (!body) {
      return { error: 'EMPTY_BODY', message: 'Missing message body' };
    }

    try {
      const message = await this.client.messages.create({
        from: this.from,
        to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
        body,
      });

      return { messageId: message.sid };
    } catch (error) {
      console.error('[Notifications][Twilio] Send failed:', error.message);
      return { error: 'PROVIDER_ERROR', message: error.message };
    }
  }
}

module.exports = TwilioWhatsAppProvider;
