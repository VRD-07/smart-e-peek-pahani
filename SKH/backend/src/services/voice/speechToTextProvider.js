/**
 * Abstract interface for Speech-to-Text processing.
 * Isolates the WhatsApp application from specific AI vendors.
 */
class SpeechToTextProvider {
  /**
   * Transcribe an audio file into text.
   * @param {Object} mediaObject - The normalized media object containing URL/MIME type.
   * @returns {Promise<{text?: string, error?: string, message?: string}>}
   */
  async transcribe(mediaObject) {
    throw new Error('transcribe() must be implemented by the provider');
  }
}

module.exports = SpeechToTextProvider;
