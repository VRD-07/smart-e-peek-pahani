const StorageProvider = require('./storageProvider');

class MockStorageProvider extends StorageProvider {
  async uploadImage(media, publicId) {
    if (!media || !media.url) {
      throw new Error('Invalid media object provided for upload.');
    }
    const safePublicId = publicId || 'mock-public-id';
    return {
      url: "https://res.cloudinary.com/mock-cloud/image/upload/v12345/" + safePublicId + ".jpg",
      publicId: safePublicId,
      mimeType: media.mimeType || 'image/jpeg',
      size: media.size || 1024
    };
  }
}

module.exports = MockStorageProvider;
