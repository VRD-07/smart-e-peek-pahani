const MockSpeechToTextProvider = require('./mockSpeechToTextProvider');
const GeminiSpeechToTextProvider = require('./geminiSpeechToTextProvider');
const { STT_PROVIDERS } = require('./constants');

/**
 * Factory to return the configured Speech-to-Text Provider.
 *
 * Mirrors visionFactory: same env-var shape, same case-insensitive match, same
 * refusal to silently fall back to the mock on a typo — a misconfigured
 * STT_PROVIDER in production must be loud, not quietly demo-mode.
 *
 * Defaults to 'mock' so the voice flow is demoable with no API key at all.
 */
function getSpeechToTextProvider() {
  const providerType = (process.env.STT_PROVIDER || STT_PROVIDERS.MOCK).toLowerCase();

  if (providerType === STT_PROVIDERS.GEMINI) {
    return new GeminiSpeechToTextProvider();
  } else if (providerType === STT_PROVIDERS.MOCK) {
    return new MockSpeechToTextProvider();
  }

  throw new Error(`Unknown STT_PROVIDER configured: ${providerType}`);
}

module.exports = { getSpeechToTextProvider };
