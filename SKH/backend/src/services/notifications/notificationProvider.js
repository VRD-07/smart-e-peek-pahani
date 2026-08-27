/**
 * Abstract interface for business-initiated outbound notifications.
 *
 * The inbound bot replies over TwiML inside the webhook response; awareness
 * reminders and calamity alerts are business-initiated, so they need a real
 * outbound send. Isolating that behind this interface keeps the awareness
 * service testable and lets the demo run without live credentials.
 *
 * All three channels live on one interface on purpose. They are three products
 * on one Twilio account, escalated between by one ladder — splitting them into
 * separate provider hierarchies would mean two notification systems to keep in
 * step.
 */
class NotificationProvider {
  /**
   * Send a plain-text WhatsApp message.
   * @param {string} to - Recipient in 'whatsapp:+91...' form.
   * @param {string} body - Message text, already translated.
   * @returns {Promise<{messageId?: string, error?: string, message?: string}>}
   */
  async sendMessage(to, body) {
    throw new Error('sendMessage() must be implemented by the provider');
  }

  /**
   * Send a plain-text SMS.
   * @param {string} to - Recipient in E.164 form.
   * @param {string} body - Shortened message text, already translated. Plain
   *   text only: SMS has no formatting and a 160-character billing unit.
   * @returns {Promise<{messageId?: string, error?: string, message?: string}>}
   */
  async sendSms(to, body) {
    throw new Error('sendSms() must be implemented by the provider');
  }

  /**
   * Place an automated voice call.
   * @param {string} to - Recipient in E.164 form.
   * @param {string} twiml - TwiML document describing what to play.
   * @returns {Promise<{callId?: string, error?: string, message?: string}>}
   */
  async placeVoiceCall(to, twiml) {
    throw new Error('placeVoiceCall() must be implemented by the provider');
  }

  /**
   * Current delivery state of a previously sent message or call.
   *
   * Returns the provider's own vocabulary ('delivered', 'read', 'undelivered',
   * 'no-answer', ...) rather than a normalized enum, so the raw provider answer
   * is what lands on the audit log. The escalation ladder does the normalizing.
   *
   * @param {string} providerId - messageId or callId from an earlier send.
   * @param {string} channel - One of CHANNELS.
   * @returns {Promise<{status?: string, error?: string, message?: string}>}
   */
  async getDeliveryStatus(providerId, channel) {
    throw new Error('getDeliveryStatus() must be implemented by the provider');
  }

  /**
   * Provider name recorded on the NotificationLog row for auditing.
   * @returns {string}
   */
  get name() {
    return 'unknown';
  }
}

module.exports = NotificationProvider;
