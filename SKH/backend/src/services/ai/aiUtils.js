const { CROP_DICTIONARY } = require('../voice/cropExtraction');

/**
 * Normalizes an AI provider's crop output into the backend's canonical format.
 */
function normalizeCrop(crop) {
  if (!crop || typeof crop !== 'string') return null;
  const token = crop.toLowerCase().trim();
  return CROP_DICTIONARY[token] || null;
}

/**
 * Validates that a confidence score is a valid number between 0 and 1.
 */
function validateConfidence(confidence) {
  if (typeof confidence !== 'number') return false;
  if (isNaN(confidence) || !isFinite(confidence)) return false;
  if (confidence < 0 || confidence > 1) return false;
  return true;
}

module.exports = {
  normalizeCrop,
  validateConfidence
};
