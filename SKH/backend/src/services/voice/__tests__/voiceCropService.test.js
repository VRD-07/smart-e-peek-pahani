// Wrap the real factory in a jest.fn so individual tests can substitute a
// provider for one call (mockReturnValueOnce), while every other test exercises
// the genuine factory + mock provider path end to end.
jest.mock('../speechToTextFactory', () => {
  const actual = jest.requireActual('../speechToTextFactory');
  return { getSpeechToTextProvider: jest.fn(actual.getSpeechToTextProvider) };
});

const { transcribeCrop } = require('../voiceCropService');
const { getSpeechToTextProvider } = require('../speechToTextFactory');
const { VOICE_FALLBACK_REASONS, VOICE_SUCCESS_REASON, DEFAULT_MIN_CONFIDENCE } = require('../constants');

// A normalized media object as mediaService.processMedia would hand it over. The
// mock STT provider routes on the URL, so the URL is what selects the scenario.
const voiceNote = (url) => ({ url, mimeType: 'audio/ogg', size: 4096 });

describe('Voice Crop Service', () => {
  const originalEnv = process.env;
  let consoleErrorSpy;

  beforeAll(() => {
    // The degrade paths log on purpose; keep the expected noise out of the report.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.STT_PROVIDER = 'mock';
    delete process.env.STT_MIN_CONFIDENCE;
  });

  afterAll(() => {
    process.env = originalEnv;
    consoleErrorSpy.mockRestore();
  });

  describe('Successful transcription', () => {
    it('1. should map a Marathi voice note to the canonical crop', async () => {
      const result = await transcribeCrop(voiceNote('http://demo/marathi_soybean.ogg'));

      expect(result.declaredCrop).toBe('soybean');
      expect(result.reason).toBe(VOICE_SUCCESS_REASON);
      expect(result.transcript).toContain('सोयाबीन');
      expect(result.confidence).toBe(0.94);
      expect(result.language).toBe('mr');
    });

    it('2. should map a Marathi cotton voice note', async () => {
      const result = await transcribeCrop(voiceNote('http://demo/marathi_cotton.ogg'));

      expect(result.declaredCrop).toBe('cotton');
      expect(result.reason).toBe(VOICE_SUCCESS_REASON);
      expect(result.language).toBe('mr');
    });

    it('3. should map a Hindi voice note', async () => {
      const result = await transcribeCrop(voiceNote('http://demo/hindi_cotton.ogg'));

      expect(result.declaredCrop).toBe('cotton');
      expect(result.reason).toBe(VOICE_SUCCESS_REASON);
      expect(result.language).toBe('hi');
    });

    it('4. should map an English voice note', async () => {
      const result = await transcribeCrop(voiceNote('http://demo/english_cotton.ogg'));

      expect(result.declaredCrop).toBe('cotton');
      expect(result.reason).toBe(VOICE_SUCCESS_REASON);
      expect(result.language).toBe('en');
    });

    it('5. should produce the same declaredCrop shape a typed message would', async () => {
      // The spoken channel is an easier way in, not a looser one: same field,
      // same crop list, same canonical value as typing the name.
      const { extractCrop } = require('../cropExtraction');
      const spoken = await transcribeCrop(voiceNote('http://demo/marathi_soybean.ogg'));
      const typed = extractCrop('soyabean');

      expect(spoken.declaredCrop).toBe(typed.declaredCrop);
    });
  });

  describe('Low confidence falls back to typing', () => {
    it('6. should refuse a crop it heard below the confidence threshold', async () => {
      // The transcript here IS a valid crop name. We still do not act on it.
      // This is the whole safe-degrade property: an uncertain hearing becomes a
      // question to the farmer, never a declaration made on their behalf.
      const result = await transcribeCrop(voiceNote('http://demo/lowconf.ogg'));

      expect(result.declaredCrop).toBeNull();
      expect(result.reason).toBe(VOICE_FALLBACK_REASONS.LOW_CONFIDENCE);
      expect(result.transcript).toBe('सोयाबीन');
      expect(result.confidence).toBe(0.31);
    });

    it('7. should accept the same audio once the threshold is lowered', async () => {
      process.env.STT_MIN_CONFIDENCE = '0.2';
      const result = await transcribeCrop(voiceNote('http://demo/lowconf.ogg'));

      expect(result.declaredCrop).toBe('soybean');
      expect(result.reason).toBe(VOICE_SUCCESS_REASON);
    });

    it('8. should reject a normally-good transcript once the threshold is raised', async () => {
      process.env.STT_MIN_CONFIDENCE = '0.99';
      const result = await transcribeCrop(voiceNote('http://demo/marathi_soybean.ogg'));

      expect(result.declaredCrop).toBeNull();
      expect(result.reason).toBe(VOICE_FALLBACK_REASONS.LOW_CONFIDENCE);
    });

    it('9. should ignore an unparseable STT_MIN_CONFIDENCE and use the default', async () => {
      process.env.STT_MIN_CONFIDENCE = 'not-a-number';
      const result = await transcribeCrop(voiceNote('http://demo/lowconf.ogg'));

      expect(DEFAULT_MIN_CONFIDENCE).toBe(0.7);
      expect(result.reason).toBe(VOICE_FALLBACK_REASONS.LOW_CONFIDENCE);
    });

    it('10. should ignore an out-of-range STT_MIN_CONFIDENCE and use the default', async () => {
      // A threshold above 1 would reject every voice note; a negative one would
      // accept every voice note. Neither is a configuration we honour.
      process.env.STT_MIN_CONFIDENCE = '5';
      const result = await transcribeCrop(voiceNote('http://demo/marathi_soybean.ogg'));

      expect(result.declaredCrop).toBe('soybean');
    });

    it('11. should treat a missing confidence as no opinion, not as zero', async () => {
      // Some engines simply do not report a score. Inventing one to compare
      // against the threshold would be worse than having none.
      const result = await transcribeCrop(voiceNote('http://demo/noconf.ogg'));

      expect(result.declaredCrop).toBe('cotton');
      expect(result.reason).toBe(VOICE_SUCCESS_REASON);
      expect(result.confidence).toBeNull();
    });
  });

  describe('Transcript the crop list cannot resolve', () => {
    it('12. should report UNSUPPORTED_CROP for confident but unrecognised speech', async () => {
      const result = await transcribeCrop(voiceNote('http://demo/unclear.ogg'));

      expect(result.declaredCrop).toBeNull();
      expect(result.reason).toBe(VOICE_FALLBACK_REASONS.UNSUPPORTED_CROP);
      expect(result.confidence).toBe(0.88);
    });

    it('13. should report MULTIPLE_CROPS_DETECTED with the candidates it heard', async () => {
      const result = await transcribeCrop(voiceNote('http://demo/english_multiple.ogg'));

      expect(result.declaredCrop).toBeNull();
      expect(result.reason).toBe(VOICE_FALLBACK_REASONS.MULTIPLE_CROPS_DETECTED);
      expect(result.candidates).toEqual(expect.arrayContaining(['soybean', 'cotton']));
    });

    it('14. should never return a crop outside the shared dictionary', async () => {
      // The transcription model is asked for words only. Crop identity is a
      // lookup against our own list, so the model cannot introduce a crop the
      // rest of the system would not recognise.
      const { SUPPORTED_CROPS } = require('../constants');
      const urls = ['marathi_soybean', 'marathi_cotton', 'hindi_cotton', 'hindi_soybean',
        'english_cotton', 'noconf', 'unclear'];

      for (const url of urls) {
        const result = await transcribeCrop(voiceNote(`http://demo/${url}.ogg`));
        if (result.declaredCrop) {
          expect(SUPPORTED_CROPS).toContain(result.declaredCrop);
        }
      }
    });
  });

  describe('Provider failure degrades instead of breaking the survey', () => {
    it('15. should report STT_ERROR when the provider returns an error object', async () => {
      const result = await transcribeCrop(voiceNote('http://demo/error.ogg'));

      expect(result.declaredCrop).toBeNull();
      expect(result.reason).toBe(VOICE_FALLBACK_REASONS.STT_ERROR);
      expect(result.transcript).toBeNull();
    });

    it('16. should report EMPTY_TRANSCRIPT when nothing was heard', async () => {
      const result = await transcribeCrop(voiceNote('http://demo/empty.ogg'));

      expect(result.declaredCrop).toBeNull();
      expect(result.reason).toBe(VOICE_FALLBACK_REASONS.EMPTY_TRANSCRIPT);
    });

    it('17. should report EMPTY_TRANSCRIPT for whitespace-only speech', async () => {
      getSpeechToTextProvider.mockReturnValueOnce({
        transcribe: jest.fn().mockResolvedValue({ text: '   \n  ', confidence: 0.99 })
      });

      const result = await transcribeCrop(voiceNote('http://demo/blank.ogg'));

      expect(result.reason).toBe(VOICE_FALLBACK_REASONS.EMPTY_TRANSCRIPT);
    });

    it('18. should degrade to STT_ERROR when the provider is misconfigured', async () => {
      // The factory throws on an unknown provider. A deployment typo must not
      // strand a farmer who is already halfway through a filing.
      process.env.STT_PROVIDER = 'whisper-that-does-not-exist';

      const result = await transcribeCrop(voiceNote('http://demo/marathi_soybean.ogg'));

      expect(result.reason).toBe(VOICE_FALLBACK_REASONS.STT_ERROR);
    });

    it('19. should degrade to STT_ERROR when the provider throws', async () => {
      getSpeechToTextProvider.mockReturnValueOnce({
        transcribe: jest.fn().mockRejectedValue(new Error('socket hang up'))
      });

      const result = await transcribeCrop(voiceNote('http://demo/marathi_soybean.ogg'));

      expect(result.reason).toBe(VOICE_FALLBACK_REASONS.STT_ERROR);
    });

    it('20. should degrade to STT_ERROR when the provider returns nothing at all', async () => {
      getSpeechToTextProvider.mockReturnValueOnce({
        transcribe: jest.fn().mockResolvedValue(null)
      });

      const result = await transcribeCrop(voiceNote('http://demo/marathi_soybean.ogg'));

      expect(result.reason).toBe(VOICE_FALLBACK_REASONS.STT_ERROR);
    });

    it('21. should always return a reason, never throw', async () => {
      // Every branch is answerable. The caller relies on a reason existing to
      // pick a reply, so an unreasoned result would silently become a generic
      // "I did not understand" the farmer cannot act on.
      const urls = ['marathi_soybean', 'lowconf', 'noconf', 'unclear', 'empty',
        'error', 'english_multiple'];

      for (const url of urls) {
        const result = await transcribeCrop(voiceNote(`http://demo/${url}.ogg`));
        expect(typeof result.reason).toBe('string');
        expect(result.reason.length).toBeGreaterThan(0);
      }
    });
  });
});
