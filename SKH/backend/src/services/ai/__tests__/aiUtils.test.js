const { normalizeCrop, validateConfidence } = require('../aiUtils');

describe('AI Utils', () => {
  describe('normalizeCrop', () => {
    it('should extract canonical English crop names', () => {
      expect(normalizeCrop('soybean')).toBe('soybean');
      expect(normalizeCrop('Cotton')).toBe('cotton');
      expect(normalizeCrop('soy')).toBe('soybean');
      expect(normalizeCrop('soyabean')).toBe('soybean');
    });

    it('should map Marathi crop names to English canonicals', () => {
      expect(normalizeCrop('सोयाबीन')).toBe('soybean');
      expect(normalizeCrop('कापूस')).toBe('cotton');
      expect(normalizeCrop('kapus')).toBe('cotton');
    });

    it('should handle undefined or empty input', () => {
      expect(normalizeCrop(null)).toBeNull();
      expect(normalizeCrop('')).toBeNull();
      expect(normalizeCrop(123)).toBeNull();
    });

    it('should return null for unsupported crops', () => {
      expect(normalizeCrop('dragonfruit')).toBeNull();
      expect(normalizeCrop('kiwi')).toBeNull();
    });
  });

  describe('validateConfidence', () => {
    it('should validate 0 and 1 inclusive boundaries', () => {
      expect(validateConfidence(0)).toBe(true);
      expect(validateConfidence(1)).toBe(true);
      expect(validateConfidence(0.5)).toBe(true);
    });

    it('should invalidate out of bounds or negative numbers', () => {
      expect(validateConfidence(-0.1)).toBe(false);
      expect(validateConfidence(-1)).toBe(false);
      expect(validateConfidence(1.01)).toBe(false);
      expect(validateConfidence(2)).toBe(false);
    });

    it('should invalidate NaN, Infinity or non-numbers', () => {
      expect(validateConfidence(NaN)).toBe(false);
      expect(validateConfidence(Infinity)).toBe(false);
      expect(validateConfidence(-Infinity)).toBe(false);
      expect(validateConfidence('0.5')).toBe(false);
      expect(validateConfidence(null)).toBe(false);
      expect(validateConfidence(undefined)).toBe(false);
    });
  });
});
