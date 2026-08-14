const MockVisionProvider = require('./mockVisionProvider');
const GeminiVisionProvider = require('./geminiVisionProvider');

/**
 * Factory to return the configured Vision Provider.
 */
function getVisionProvider() {
  const providerType = (process.env.VISION_PROVIDER || 'mock').toLowerCase();

  if (providerType === 'gemini') {
    return new GeminiVisionProvider();
  } else if (providerType === 'mock') {
    return new MockVisionProvider();
  }

  throw new Error(`Unknown VISION_PROVIDER configured: ${providerType}`);
}

module.exports = { getVisionProvider };
