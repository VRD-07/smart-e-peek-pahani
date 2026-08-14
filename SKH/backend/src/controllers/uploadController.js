const fs = require('fs');
const { successResponse, errorResponse } = require('../utils/response');
const StorageFactory = require('../services/storage/storageFactory');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

const uploadImage = async (req, res) => {
  // If multer rejected due to size, error is thrown before this,
  // but if multer is just missing the file:
  if (!req.file) {
    return errorResponse(res, 'No image file provided', 'MISSING_FILE', 400);
  }

  const tempFilePath = req.file.path;

  try {
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return errorResponse(res, 'Unsupported MIME type', 'INVALID_MIME_TYPE', 400);
    }

    // Double check size in case multer limits are bypassed or configured differently
    if (req.file.size > 5 * 1024 * 1024) {
      return errorResponse(res, 'Image file too large (max 5MB)', 'FILE_TOO_LARGE', 400);
    }

    const media = {
      url: `file://${tempFilePath}`,
      mimeType: req.file.mimetype,
      size: req.file.size
    };

    const storageProvider = StorageFactory.getStorageProvider();
    const result = await storageProvider.uploadImage(media);

    return successResponse(res, 'Image uploaded successfully', {
      url: result.url,
      publicId: result.publicId,
      mimeType: result.mimeType,
      size: result.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    return errorResponse(res, 'Failed to upload image', 'UPLOAD_ERROR', 500);
  } finally {
    fs.unlink(tempFilePath, (err) => {
      if (err) {
        console.error('Failed to cleanup temp file:', err);
      }
    });
  }
};

module.exports = {
  uploadImage
};
