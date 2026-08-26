/**
 * Abstract interface for sending outbound WhatsApp notifications.
 *
 * The inbound bot replies over TwiML inside the webhook response; awareness
 * reminders and calamity alerts are business-initiated, so they need a real
 * outbound send. Isolating that behind this interface keeps the awareness
 * service testable and lets the demo run without live credentials.
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
   * Provider name recorded on the NotificationLog row for auditing.
   * @returns {string}
   */
  get name() {
    return 'unknown';
  }
}

module.exports = NotificationProvider;
