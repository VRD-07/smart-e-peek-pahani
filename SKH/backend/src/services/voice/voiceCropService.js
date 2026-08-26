const { getSpeechToTextProvider } = require('./speechToTextFactory');
const { extractCrop } = require('./cropExtraction');
const {
  VOICE_FALLBACK_REASONS,
  VOICE_SUCCESS_REASON,
  minConfidence,
} = require('./constants');

/**
 * Turns a WhatsApp voice note into a crop declaration, or into a reason it
 * could not become one.
 *
 * This is the whole point of the voice channel: a farmer who cannot type
 * Devanagari on a feature phone can say the crop out loud. It is an *easier* way
 * in, not a looser one — a voice note produces exactly the same declaredCrop
 * field, checked against exactly the same crop list, as a typed message. There
 * is no separate, lower bar for the spoken channel.
 *
 * Every failure path returns a reason instead of a guess, and the caller turns
 * every reason into the same escape hatch: type the name. That mirrors the
 * Gemini image check, which routes uncertainty to human review rather than
 * approving blind.
 *
 * @param {Object} media - Normalized media object (url/mimeType/buffer).
 * @returns {Promise<{declaredCrop: string|null, reason: string, transcript: string|null,
 *                    confidence: number|null, language: string|null, candidates?: string[]}>}
 */
async function transcribeCrop(media) {
  const empty = {
    declaredCrop: null,
    transcript: null,
    confidence: null,
    language: null,
  };

  let result;
  try {
    const provider = getSpeechToTextProvider();
    result = await provider.transcribe(media);
  } catch (error) {
    // A misconfigured provider or a thrown SDK error must not take down the
    // survey. The farmer is mid-flow; they get a prompt, not a dead end.
    console.error('[Voice] Transcription threw:', error.message);
    return { ...empty, reason: VOICE_FALLBACK_REASONS.STT_ERROR };
  }

  if (!result || result.error) {
    return { ...empty, reason: VOICE_FALLBACK_REASONS.STT_ERROR };
  }

  const transcript = typeof result.text === 'string' ? result.text.trim() : '';
  if (!transcript) {
    return { ...empty, reason: VOICE_FALLBACK_REASONS.EMPTY_TRANSCRIPT };
  }

  // A provider that reports no confidence gets the benefit of the doubt rather
  // than a number we made up; the crop-list lookup below is still a hard gate.
  const confidence = typeof result.confidence === 'number' ? result.confidence : null;
  const language = result.language || null;

  if (confidence !== null && confidence < minConfidence()) {
    return {
      declaredCrop: null,
      reason: VOICE_FALLBACK_REASONS.LOW_CONFIDENCE,
      transcript,
      confidence,
      language,
    };
  }

  const extraction = extractCrop(transcript);

  if (extraction.declaredCrop) {
    return {
      declaredCrop: extraction.declaredCrop,
      reason: VOICE_SUCCESS_REASON,
      transcript,
      confidence,
      language,
    };
  }

  // extractCrop already distinguishes "no crop named" from "several named"; both
  // are real outcomes worth telling apart, because the advice differs.
  const reason = VOICE_FALLBACK_REASONS[extraction.reason]
    || VOICE_FALLBACK_REASONS.UNSUPPORTED_CROP;

  return {
    declaredCrop: null,
    reason,
    transcript,
    confidence,
    language,
    ...(extraction.candidates ? { candidates: extraction.candidates } : {}),
  };
}

module.exports = { transcribeCrop };
