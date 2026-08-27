/**
 * Turns free-form text — typed by a farmer or transcribed from a voice note —
 * into a canonical crop name.
 *
 * Since Phase 7 the recognition itself lives in services/crops/cropMatcher.js,
 * which handles script folding and misspellings against the shared catalogue.
 * This module's remaining job is the contract the WhatsApp flow and the voice
 * service were built against: `{declaredCrop, reason, candidates}`, where every
 * non-SUCCESS reason has a message the bot can send back.
 */

const { CROP_DICTIONARY } = require('../crops/cropCatalogue');
const { matchCrop, MATCH_STATUS } = require('../crops/cropMatcher');

/**
 * Extracts a normalized crop from free-form text.
 *
 * @param {string} transcriptText - The raw text from the user or STT
 * @returns {Object} declaredCrop (string|null), reason, and — where the farmer
 *   needs to choose or confirm — candidates, plus the match confidence and the
 *   words the match came from for logging.
 */
function extractCrop(transcriptText) {
  const match = matchCrop(transcriptText);

  switch (match.status) {
    case MATCH_STATUS.MATCHED:
      return {
        declaredCrop: match.crop,
        reason: 'SUCCESS',
        matchConfidence: match.confidence,
        matchMethod: match.method,
        matchedText: match.matchedText,
      };

    case MATCH_STATUS.MULTIPLE:
      return {
        declaredCrop: null,
        reason: 'MULTIPLE_CROPS_DETECTED',
        candidates: match.candidates,
      };

    // Something close to a crop name, but not close enough to record silently.
    // The flow asks the farmer to confirm rather than guessing on their behalf.
    case MATCH_STATUS.NEEDS_CONFIRMATION:
      return {
        declaredCrop: null,
        reason: 'LOW_MATCH_CONFIDENCE',
        candidates: match.candidates,
        matchConfidence: match.confidence,
        matchedText: match.matchedText,
      };

    case MATCH_STATUS.EMPTY:
      return { declaredCrop: null, reason: 'EMPTY_TRANSCRIPT' };

    default:
      return { declaredCrop: null, reason: 'UNSUPPORTED_CROP' };
  }
}

module.exports = {
  extractCrop,
  // Re-exported so the pre-Phase-7 import path keeps working. The dictionary
  // itself now comes from services/crops/cropCatalogue.js.
  CROP_DICTIONARY,
};
