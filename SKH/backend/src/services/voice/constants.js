const { CROP_DICTIONARY } = require('./cropExtraction');

// Kept here rather than on the providers so nothing has to import a provider
// just to read a constant, mirroring services/notifications/constants.js and
// services/relief/constants.js.
const STT_PROVIDERS = {
  MOCK: 'mock',
  GEMINI: 'gemini',
};

// Below this we do not treat the transcript as a crop declaration.
//
// The crop validator already asks for 0.85 to confirm an image match and 0.90 to
// reject one — it takes more certainty to reject a farmer than to accept them.
// Speech sits lower on purpose: field audio is noisy, the speaker may be
// standing in wind next to a tractor, and the cost of being wrong here is only
// one extra message asking them to type the name. What we will not do is act on
// a guess and put a crop the farmer never said onto a record they are
// accountable for.
const DEFAULT_MIN_CONFIDENCE = 0.70;

// Why a voice note did not produce a crop. Every one of these routes the farmer
// to the same escape hatch — type the name — because a farmer stuck at the crop
// step has no other way forward.
const VOICE_FALLBACK_REASONS = {
  // The provider itself failed: network, quota, bad audio container. Our fault.
  STT_ERROR: 'STT_ERROR',
  // Transcribed to nothing. Usually a half-second misfire of the record button.
  EMPTY_TRANSCRIPT: 'EMPTY_TRANSCRIPT',
  // Words came back, but not confidently enough to act on.
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  // Heard clearly, but no crop we know was named.
  UNSUPPORTED_CROP: 'UNSUPPORTED_CROP',
  // More than one crop named; the record holds exactly one.
  MULTIPLE_CROPS_DETECTED: 'MULTIPLE_CROPS_DETECTED',
};

const VOICE_SUCCESS_REASON = 'SUCCESS';

// The canonical crop list, derived from the same dictionary the text path and the
// vision layer use — one list, so voice can never accept a crop the rest of the
// system does not recognise.
const SUPPORTED_CROPS = [...new Set(Object.values(CROP_DICTIONARY))];

function minConfidence() {
  const configured = Number.parseFloat(process.env.STT_MIN_CONFIDENCE);
  return Number.isFinite(configured) && configured >= 0 && configured <= 1
    ? configured
    : DEFAULT_MIN_CONFIDENCE;
}

module.exports = {
  STT_PROVIDERS,
  DEFAULT_MIN_CONFIDENCE,
  VOICE_FALLBACK_REASONS,
  VOICE_SUCCESS_REASON,
  SUPPORTED_CROPS,
  minConfidence,
};
