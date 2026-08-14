const VisionProvider = require('./visionProvider');

/**
 * Mock deterministic Vision Provider.
 * Allows safe, offline, and consistent unit/integration testing without making real API calls.
 */
class MockVisionProvider extends VisionProvider {
  async classify(imageObject) {
    if (!imageObject || !imageObject.url) {
      return { error: 'PROVIDER_ERROR', message: 'Missing image object or url' };
    }

    const url = imageObject.url.toLowerCase();

    if (url.includes('soybean_match')) {
      return { detectedCrop: 'soybean', confidence: 0.95 };
    }
    if (url.includes('cotton_match')) {
      return { detectedCrop: 'cotton', confidence: 0.92 };
    }
    if (url.includes('soybean_mismatch')) {
      // e.g. Farmer declared cotton but image is soybean
      return { detectedCrop: 'soybean', confidence: 0.88 };
    }
    if (url.includes('cotton_mismatch')) {
      // e.g. Farmer declared soybean but image is cotton
      return { detectedCrop: 'cotton', confidence: 0.89 };
    }
    if (url.includes('low_confidence')) {
      return { detectedCrop: 'soybean', confidence: 0.45 };
    }
    if (url.includes('unsupported_crop')) {
      // e.g. Provider returns a crop not in our dictionary, or explicitly null
      return { detectedCrop: 'sugarcane', confidence: 0.99 };
    }
    if (url.includes('error')) {
      return { error: 'PROVIDER_ERROR', message: 'Simulated AI API failure' };
    }
    if (url.includes('invalid_confidence')) {
      return { detectedCrop: 'soybean', confidence: 1.5 };
    }

    // Default to a solid match if nothing specified
    return { detectedCrop: 'soybean', confidence: 0.90 };
  }
}

module.exports = MockVisionProvider;
