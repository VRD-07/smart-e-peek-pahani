/**
 * Abstract Storage Provider contract.
 */
class StorageProvider {
  /**
   * Uploads an image to the persistent storage.
   *
   * @param {Object} media - The media object.
   * @param {string} media.url - Local file path (file://...) or temporary URL
   * @param {string} media.mimeType - The MIME type
   * @param {number} media.size - The file size in bytes
   * @param {string} publicId - Optional stable identifier for idempotency
   * @returns {Promise<Object>} The uploaded image details { url, publicId, mimeType, size }
   */
  async uploadImage(media, publicId) {
    throw new Error('Not implemented');
  }
}

module.exports = StorageProvider;
