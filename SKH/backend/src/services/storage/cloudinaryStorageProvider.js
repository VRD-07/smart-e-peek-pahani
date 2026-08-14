const cloudinary = require('cloudinary').v2;
const StorageProvider = require('./storageProvider');
const env = require('../../config/env');

class CloudinaryStorageProvider extends StorageProvider {
  constructor() {
    super();
    if (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
      cloudinary.config({
        cloud_name: env.cloudinaryCloudName,
        api_key: env.cloudinaryApiKey,
        api_secret: env.cloudinaryApiSecret,
        secure: true
      });
    }
  }

  async uploadImage(media, publicId) {
    if (!media || !media.url) {
      throw new Error('Invalid media object provided for upload.');
    }

    if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
      throw new Error('Missing Cloudinary credentials. Cannot upload image persistently.');
    }

    const localPath = media.url.startsWith('file://') ? media.url.replace('file://', '') : media.url;

    try {
      const options = {
        resource_type: 'image',
        overwrite: true
      };
      if (publicId) {
        options.public_id = publicId;
      }

      const result = await cloudinary.uploader.upload(localPath, options);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        mimeType: media.mimeType,
        size: result.bytes
      };
    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }
}

module.exports = CloudinaryStorageProvider;
