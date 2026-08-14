const validateImage = (image) => {
  if (!image || !image.url) {
    return {
      status: 'FAIL',
      validFormat: false,
      sizeValid: false,
      quality: 'POOR',
      reason: 'Missing image'
    };
  }

  const allowedFormats = ['image/jpeg', 'image/png', 'image/webp'];
  const validFormat = allowedFormats.includes(image.mimeType);
  const maxSize = 5 * 1024 * 1024; // 5MB
  const sizeValid = image.size <= maxSize;

  if (!validFormat || !sizeValid) {
    return {
      status: 'FAIL',
      validFormat,
      sizeValid,
      quality: 'POOR',
      reason: !validFormat ? 'Unsupported format' : 'Image too large'
    };
  }

  return {
    status: 'PASS',
    validFormat,
    sizeValid,
    quality: 'GOOD'
  };
};

module.exports = { validateImage };
