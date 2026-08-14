const SpeechToTextProvider = require('./speechToTextProvider');

/**
 * Deterministic Mock STT Provider for unit testing and local development.
 * It returns predefined transcripts based on keywords in the media URL.
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
    if (url.includes('unclear')) {
      return { text: 'xyz blabla unintelligible noise' };
    }
    if (url.includes('marathi_soybean')) {
      return { text: 'माझ्या शेतात सोयाबीन आहे' };
    }
    if (url.includes('marathi_cotton')) {
      return { text: 'कापूस लावला आहे' };
    }
    if (url.includes('hindi_cotton')) {
      return { text: 'मैंने यहाँ कपास लगाया है' };
    }
    if (url.includes('hindi_soybean')) {
      return { text: 'सोया लगाया है' };
    }
    if (url.includes('english_multiple')) {
      return { text: 'I planted soybean and cotton.' };
    }
    if (url.includes('english_cotton')) {
      return { text: 'I have cotton.' };
    }

    // Default fallback
    return { text: 'I planted soybean here.' };
  }
}

module.exports = MockSpeechToTextProvider;
