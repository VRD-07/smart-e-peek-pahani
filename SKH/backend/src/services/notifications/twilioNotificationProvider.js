const twilio = require('twilio');
const env = require('../../config/env');
const NotificationProvider = require('./notificationProvider');
const { CHANNELS } = require('./constants');

/**
 * Outbound WhatsApp, SMS and voice, all on the one Twilio account already
 * configured for the bot.
 *
 * Verified against the Twilio **sandbox**, where the farmer must have joined the
 * WhatsApp sandbox from their own handset first, and where SMS and voice only
 * reach numbers verified on the account. Moving to a production WhatsApp Business
 * sender requires Meta's business verification and approved message templates,
 * which is an external approval process — hence the mock provider remains the
 * default.
 *
 * Each channel needs its own sender: the WhatsApp sandbox number cannot send SMS
 * and cannot place calls. Missing senders are reported per send rather than at
 * construction, so a deployment configured for WhatsApp only still works for
 * WhatsApp instead of failing to boot.
 */
class TwilioNotificationProvider extends NotificationProvider {
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
    this.smsFrom = env.twilioSmsNumber;
    this.voiceFrom = env.twilioVoiceNumber;
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
      console.error('[Notifications][Twilio] WhatsApp send failed:', error.message);
      return { error: 'PROVIDER_ERROR', message: error.message };
    }
  }

  async sendSms(to, body) {
    if (!to) {
      return { error: 'INVALID_RECIPIENT', message: 'Missing recipient number' };
    }
    if (!body) {
      return { error: 'EMPTY_BODY', message: 'Missing message body' };
    }
    if (!this.smsFrom) {
      return {
        error: 'SENDER_NOT_CONFIGURED',
        message: 'Missing TWILIO_SMS_NUMBER — SMS fallback is not configured',
      };
    }

    try {
      const message = await this.client.messages.create({
        from: this.smsFrom,
        to: to.replace(/^whatsapp:/, ''),
        body,
      });

      return { messageId: message.sid };
    } catch (error) {
      console.error('[Notifications][Twilio] SMS send failed:', error.message);
      return { error: 'PROVIDER_ERROR', message: error.message };
    }
  }

  async placeVoiceCall(to, twiml, options = {}) {
    if (!to) {
      return { error: 'INVALID_RECIPIENT', message: 'Missing recipient number' };
    }
    if (!twiml) {
      return { error: 'EMPTY_BODY', message: 'Missing TwiML for the call' };
    }
    if (!this.voiceFrom) {
      return {
        error: 'SENDER_NOT_CONFIGURED',
        message: 'Missing TWILIO_VOICE_NUMBER — voice fallback is not configured',
      };
    }

    try {
      const callParams = {
        from: this.voiceFrom,
        to: to.replace(/^whatsapp:/, ''),
      };

      // Twilio Trial accounts forbid inline `twiml` parameters and require a hosted webhook `url`.
      // When VOICE_AUDIO_BASE_URL is configured, use the hosted TwiML URL to avoid trial restrictions.
      if (env.voiceAudioBaseUrl && options.type) {
        callParams.url = `${env.voiceAudioBaseUrl.replace(/\/+$/, '')}/twiml?type=${encodeURIComponent(options.type)}`;
      } else {
        callParams.twiml = twiml;
      }

      const call = await this.client.calls.create(callParams);

      return { callId: call.sid };
    } catch (error) {
      console.error('[Notifications][Twilio] Voice call failed:', error.message);
      return { error: 'PROVIDER_ERROR', message: error.message };
    }
  }

  async getDeliveryStatus(providerId, channel) {
    if (!providerId) {
      return { error: 'INVALID_ID', message: 'Missing provider message id' };
    }

    try {
      const resource = channel === CHANNELS.VOICE
        ? await this.client.calls(providerId).fetch()
        : await this.client.messages(providerId).fetch();

      return { status: resource.status };
    } catch (error) {
      console.error('[Notifications][Twilio] Status lookup failed:', error.message);
      return { error: 'PROVIDER_ERROR', message: error.message };
    }
  }
}

module.exports = TwilioNotificationProvider;
