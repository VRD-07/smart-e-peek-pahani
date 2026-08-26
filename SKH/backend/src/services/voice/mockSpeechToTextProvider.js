const SpeechToTextProvider = require('./speechToTextProvider');

/**
 * Deterministic Mock STT Provider for unit testing and local development.
 * It returns predefined transcripts based on keywords in the media URL.
 *
 * Confidence is included so the low-confidence fallback path is exercisable
 * without a live provider: a URL containing 'lowconf' returns a usable
 * transcript with a score below the threshold, which is the one failure mode you
 * cannot reproduce by feeding in bad audio.
 */
class MockSpeechToTextProvider extends SpeechToTextProvider {
  async transcribe(mediaObject) {
    if (!mediaObject || !mediaObject.url) {
      return { error: 'PROVIDER_ERROR', message: 'Invalid media object' };
    }

    const url = mediaObject.url.toLowerCase();

    if (url.includes('error')) {
      return { error: 'PROVIDER_ERROR', message: 'Simulated STT failure' };
    }
    if (url.includes('empty')) {
      return { text: '' };
    }
    if (url.includes('lowconf')) {
      // Heard a crop, but not clearly enough to put it on the record.
      return { text: 'सोयाबीन', confidence: 0.31, language: 'mr' };
    }
    if (url.includes('noconf')) {
      // A provider that reports no confidence at all — treated as usable.
      return { text: 'I planted cotton.' };
    }
    if (url.includes('unclear')) {
      return { text: 'xyz blabla unintelligible noise', confidence: 0.88 };
    }
    if (url.includes('marathi_soybean')) {
      return { text: 'माझ्या शेतात सोयाबीन आहे', confidence: 0.94, language: 'mr' };
    }
    if (url.includes('marathi_cotton')) {
      return { text: 'कापूस लावला आहे', confidence: 0.92, language: 'mr' };
    }
    if (url.includes('hindi_cotton')) {
      return { text: 'मैंने यहाँ कपास लगाया है', confidence: 0.91, language: 'hi' };
    }
    if (url.includes('hindi_soybean')) {
      return { text: 'सोया लगाया है', confidence: 0.90, language: 'hi' };
    }
    if (url.includes('english_multiple')) {
      return { text: 'I planted soybean and cotton.', confidence: 0.95, language: 'en' };
    }
    if (url.includes('english_cotton')) {
      return { text: 'I have cotton.', confidence: 0.96, language: 'en' };
    }

    // Default fallback
    return { text: 'I planted soybean here.', confidence: 0.93, language: 'en' };
  }
}

module.exports = MockSpeechToTextProvider;
