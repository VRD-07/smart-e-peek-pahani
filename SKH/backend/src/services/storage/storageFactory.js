const CloudinaryStorageProvider = require('./cloudinaryStorageProvider');
const MockStorageProvider = require('./mockStorageProvider');
const env = require('../../config/env');

/**
 * Storage Factory to resolve the active storage provider.
 */
class StorageFactory {
  static getStorageProvider() {
    if (env.storageProvider === 'cloudinary') {
      return new CloudinaryStorageProvider();
    }
    return new MockStorageProvider();
  }
}

module.exports = StorageFactory;
