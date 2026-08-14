/**
 * Dictionary mapping regional and informal crop names to the canonical English form.
 */
const CROP_DICTIONARY = {
  // English
  'soybean': 'soybean',
  'soy': 'soybean',
  'soyabean': 'soybean',
  'cotton': 'cotton',

  // Marathi
  'सोयाबीन': 'soybean',
  'कापूस': 'cotton',
  'kapus': 'cotton',

  // Hindi
  'कपास': 'cotton',
  'सोया': 'soybean'
};

/**
 * Extracts a normalized crop from free-form text.
 *
 * @param {string} transcriptText - The raw text from the user or STT
 * @returns {Object} Result containing declaredCrop (string|null), reason, and optionally candidates.
 */
function extractCrop(transcriptText) {
  if (!transcriptText || transcriptText.trim() === '') {
    return { declaredCrop: null, reason: 'EMPTY_TRANSCRIPT' };
  }

  // Tokenize and normalize: lower case, remove basic punctuation
  const text = transcriptText.toLowerCase().replace(/[.,?!।]/g, ' ');
  const words = text.split(/\s+/);

  const foundCrops = new Set();

  for (const word of words) {
    if (CROP_DICTIONARY[word]) {
      foundCrops.add(CROP_DICTIONARY[word]);
    }
  }

  const cropsArray = Array.from(foundCrops);

  if (cropsArray.length === 0) {
    return { declaredCrop: null, reason: 'UNSUPPORTED_CROP' };
  }

  if (cropsArray.length > 1) {
    return {
      declaredCrop: null,
      reason: 'MULTIPLE_CROPS_DETECTED',
      candidates: cropsArray
    };
  }

  return { declaredCrop: cropsArray[0], reason: 'SUCCESS' };
}

module.exports = {
  extractCrop,
  CROP_DICTIONARY
};
