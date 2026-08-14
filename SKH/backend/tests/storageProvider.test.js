const CloudinaryStorageProvider = require('../src/services/storage/cloudinaryStorageProvider');
const MockStorageProvider = require('../src/services/storage/mockStorageProvider');
const StorageFactory = require('../src/services/storage/storageFactory');
const env = require('../src/config/env');

jest.mock('../src/config/env', () => ({
  storageProvider: 'cloudinary',
  nodeEnv: 'development'
}));

describe('Storage Provider Configuration (Phase 3B Checks)', () => {

  it('StorageFactory selects Cloudinary by default when env.storageProvider is cloudinary', () => {
    env.storageProvider = 'cloudinary';
    const provider = StorageFactory.getStorageProvider();
    expect(provider).toBeInstanceOf(CloudinaryStorageProvider);
  });

  it('StorageFactory selects MockStorageProvider explicitly when configured', () => {
    env.storageProvider = 'mock';
    const provider = StorageFactory.getStorageProvider();
    expect(provider).toBeInstanceOf(MockStorageProvider);
  });

  it('CloudinaryStorageProvider throws Error if credentials missing (No fake URL fallback)', async () => {
    // Clear credentials
    env.cloudinaryCloudName = undefined;
    env.cloudinaryApiKey = undefined;
    env.cloudinaryApiSecret = undefined;

    const provider = new CloudinaryStorageProvider();
    await expect(provider.uploadImage({ url: 'file://tmp/test.jpg', mimeType: 'image/jpeg', size: 100 }, 'sid_123'))
      .rejects.toThrow('Missing Cloudinary credentials. Cannot upload image persistently.');
  });

  it('MockStorageProvider successfully returns mock HTTPS url', async () => {
    const provider = new MockStorageProvider();
    const result = await provider.uploadImage({ url: 'file://tmp/test.jpg', mimeType: 'image/jpeg', size: 100 }, 'sid_456');
    expect(result.url).toBe('https://res.cloudinary.com/mock-cloud/image/upload/v12345/sid_456.jpg');
    expect(result.mimeType).toBe('image/jpeg');
  });

});
