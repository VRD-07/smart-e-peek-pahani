/**
 * Abstract interface for Vision (Image Classification) providers.
 * Isolates the backend validation logic from specific AI SDKs.
 */
class VisionProvider {
  /**
   * Classifies an agricultural crop from an image.
   *
   * @param {Object} imageObject - The normalized image object (contains url, mimeType, etc.)
   * @returns {Promise<{detectedCrop?: string, confidence?: number, error?: string, message?: string}>}
   */
  async classify(imageObject) {
    throw new Error('classify() must be implemented by the provider');
  }
}

module.exports = VisionProvider;
