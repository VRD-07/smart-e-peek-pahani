const express = require('express');
const router = express.Router();
const multer = require('multer');
const os = require('os');
const { protect } = require('../middleware/auth');
const { uploadImage } = require('../controllers/uploadController');
const { errorResponse } = require('../utils/response');

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

// Middleware to handle multer errors gracefully
const multerHandler = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return errorResponse(res, 'Image file too large (max 5MB)', 'FILE_TOO_LARGE', 400);
      }
      return errorResponse(res, err.message, 'UPLOAD_ERROR', 400);
    }
    next();
  });
};

const optionalAuth = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  next();
};

router.post('/image', protect, multerHandler, uploadImage);

module.exports = router;
