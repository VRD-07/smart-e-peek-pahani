const { extractCrop } = require('../cropExtraction');

describe('Crop Extraction Service', () => {
  it('should extract canonical English crop names', () => {
    expect(extractCrop('I planted soybean here').declaredCrop).toBe('soybean');
    expect(extractCrop('Cotton is what I have').declaredCrop).toBe('cotton');
    expect(extractCrop('soy').declaredCrop).toBe('soybean');
    expect(extractCrop('soyabean').declaredCrop).toBe('soybean');
  });

  it('should extract Marathi crop names and normalize to English', () => {
    expect(extractCrop('माझ्या शेतात सोयाबीन आहे').declaredCrop).toBe('soybean');
    expect(extractCrop('कापूस लावला आहे').declaredCrop).toBe('cotton');
    expect(extractCrop('kapus').declaredCrop).toBe('cotton');
  });

  it('should extract Hindi crop names and normalize to English', () => {
    expect(extractCrop('मैंने यहाँ कपास लगाया है').declaredCrop).toBe('cotton');
    expect(extractCrop('सोया लगाया है').declaredCrop).toBe('soybean');
  });

  it('should handle missing, empty, or undefined text', () => {
    expect(extractCrop('').reason).toBe('EMPTY_TRANSCRIPT');
    expect(extractCrop('   ').reason).toBe('EMPTY_TRANSCRIPT');
    expect(extractCrop(null).reason).toBe('EMPTY_TRANSCRIPT');
  });

  it('should reject unsupported crops gracefully', () => {
    const result = extractCrop('I planted wheat and sugarcane');
    expect(result.declaredCrop).toBeNull();
    expect(result.reason).toBe('UNSUPPORTED_CROP');
  });

  it('should detect multiple crops and return candidates', () => {
    const result = extractCrop('I have soybean and cotton in my field');
    expect(result.declaredCrop).toBeNull();
    expect(result.reason).toBe('MULTIPLE_CROPS_DETECTED');
    expect(result.candidates).toContain('soybean');
    expect(result.candidates).toContain('cotton');
    expect(result.candidates.length).toBe(2);
  });

  it('should handle punctuation and noise gracefully', () => {
    // Punctuations attached to the word
    expect(extractCrop('soybean, cotton!').reason).toBe('MULTIPLE_CROPS_DETECTED');
    expect(extractCrop('what about...cotton?').declaredCrop).toBe('cotton');
    expect(extractCrop('सोयाबीन.').declaredCrop).toBe('soybean');
  });

  it('should handle case differences', () => {
    expect(extractCrop('SOYBEAN').declaredCrop).toBe('soybean');
    expect(extractCrop('CoTtOn').declaredCrop).toBe('cotton');
  });
});
