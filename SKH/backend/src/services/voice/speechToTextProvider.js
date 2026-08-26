/**
 * Abstract interface for Speech-to-Text processing.
 * Isolates the WhatsApp application from specific AI vendors.
 */
class SpeechToTextProvider {
  /**
   * Transcribe an audio file into text.
   *
   * A provider reports how sure it is, so the caller can decide whether the
   * transcript is worth acting on. Omitting `confidence` means "no opinion" —
   * voiceCropService treats that as usable rather than inventing a number, since
   * a fabricated score would be worse than an absent one.
   *
   * @param {Object} mediaObject - The normalized media object containing URL/MIME type.
   * @returns {Promise<{text?: string, confidence?: number, language?: string, error?: string, message?: string}>}
   */
  async transcribe(mediaObject) {
    throw new Error('transcribe() must be implemented by the provider');
  }
}

module.exports = SpeechToTextProvider;
