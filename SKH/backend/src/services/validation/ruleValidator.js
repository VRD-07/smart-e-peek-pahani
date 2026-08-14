const validateIdentity = (farmer, session) => {
  if (!farmer) {
    return { status: 'FAIL', reason: 'Farmer not found' };
  }
  // In a real scenario, we might verify session mapping
  return { status: 'PASS' };
};

const validateRequiredFields = (submission) => {
  const missing = [];
  if (!submission.clientSubmissionId) missing.push('clientSubmissionId');
  if (!submission.farmerId) missing.push('farmerId');
  if (!submission.source) missing.push('source');
  if (!submission.gatId) missing.push('gatId');
  if (!submission.crop || !submission.crop.declaredCrop) missing.push('crop');
  if (!submission.location || typeof submission.location.latitude !== 'number') missing.push('location');
  if (!submission.image || !submission.image.url) missing.push('image');

  if (missing.length > 0) {
    return { status: 'FAIL', reason: `Missing fields: ${missing.join(', ')}` };
  }
  return { status: 'PASS' };
};

const validateTimestamp = (timestamp) => {
  if (!timestamp) return { status: 'FAIL', reason: 'Missing timestamp' };

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return { status: 'FAIL', reason: 'Invalid timestamp' };
  }

  // Example rule: cannot be in the future
  if (date > new Date()) {
    return { status: 'FAIL', reason: 'Timestamp in future' };
  }

  return { status: 'PASS' };
};

module.exports = {
  validateIdentity,
  validateRequiredFields,
  validateTimestamp
};
