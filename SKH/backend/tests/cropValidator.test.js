const { validateCrop } = require('../src/services/validation/cropValidator');

describe('cropValidator', () => {
  it('1. Valid Gemini response: existing normal validation behavior (PASS)', () => {
    const aiResult = { detectedCrop: 'soybean', confidence: 0.99 };
    const result = validateCrop('soybean', aiResult);
    expect(result.status).toBe('PASS');
    expect(result.declaredCrop).toBe('soybean');
    expect(result.detectedCrop).toBe('soybean');
  });

  it('2. aiResult === null -> REVIEW, no crash', () => {
    const result = validateCrop('soybean', null);
    expect(result.status).toBe('REVIEW');
    expect(result.detectedCrop).toBeNull();
    expect(result.reason).toContain('AI service unavailable');
  });

  it('3. aiResult === undefined -> REVIEW, no crash', () => {
    const result = validateCrop('soybean', undefined);
    expect(result.status).toBe('REVIEW');
    expect(result.detectedCrop).toBeNull();
    expect(result.reason).toContain('AI service unavailable');
  });

  it('4. aiResult = { error: "PROVIDER_ERROR", message: "AI service unavailable" } -> REVIEW, no crash', () => {
    const aiResult = { error: 'PROVIDER_ERROR', message: 'Gemini API failed: network error' };
    const result = validateCrop('soybean', aiResult);
    expect(result.status).toBe('REVIEW');
    expect(result.detectedCrop).toBeNull();
    expect(result.reason).toContain('Gemini API failed: network error');
  });

  it('5. aiResult = { detectedCrop: undefined, confidence: undefined } -> REVIEW, no crash', () => {
    const aiResult = { detectedCrop: undefined, confidence: undefined };
    const result = validateCrop('soybean', aiResult);
    expect(result.status).toBe('REVIEW');
    expect(result.detectedCrop).toBeNull();
    expect(result.reason).toContain('AI service unavailable');
  });

  it('6. aiResult = { detectedCrop: null, confidence: 0.5 } -> REVIEW, no crash', () => {
    const aiResult = { detectedCrop: null, confidence: 0.5 };
    const result = validateCrop('soybean', aiResult);
    expect(result.status).toBe('REVIEW');
    expect(result.detectedCrop).toBeNull();
    expect(result.reason).toContain('AI service unavailable');
  });

  it('7. Existing crop mismatch behavior must remain unchanged', () => {
    const aiResult = { detectedCrop: 'cotton', confidence: 0.95 };
    const result = validateCrop('soybean', aiResult);
    expect(result.status).toBe('FAIL');
    expect(result.declaredCrop).toBe('soybean');
    expect(result.detectedCrop).toBe('cotton');
    expect(result.reason).toBe('Definite crop mismatch');
  });
});
