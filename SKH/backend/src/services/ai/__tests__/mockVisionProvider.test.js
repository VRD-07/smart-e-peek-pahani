const MockVisionProvider = require('../mockVisionProvider');

describe('Mock Vision Provider', () => {
  let provider;

  beforeEach(() => {
    provider = new MockVisionProvider();
  });

  it('should return soybean match', async () => {
    const res = await provider.classify({ url: 'file:///tmp/soybean_match.jpg' });
    expect(res.detectedCrop).toBe('soybean');
    expect(res.confidence).toBe(0.95);
  });

  it('should return cotton match', async () => {
    const res = await provider.classify({ url: 'file:///tmp/cotton_match.jpg' });
    expect(res.detectedCrop).toBe('cotton');
    expect(res.confidence).toBe(0.92);
  });

  it('should return mismatch (cotton for declared soybean)', async () => {
    const res = await provider.classify({ url: 'file:///tmp/cotton_mismatch.jpg' });
    expect(res.detectedCrop).toBe('cotton');
    expect(res.confidence).toBe(0.89);
  });

  it('should return low confidence result', async () => {
    const res = await provider.classify({ url: 'file:///tmp/low_confidence.jpg' });
    expect(res.detectedCrop).toBe('soybean');
    expect(res.confidence).toBe(0.45);
  });

  it('should return unsupported crop (sugarcane)', async () => {
    const res = await provider.classify({ url: 'file:///tmp/unsupported_crop.jpg' });
    expect(res.detectedCrop).toBe('sugarcane'); // Mocks returning an un-normalized crop intentionally
    expect(res.confidence).toBe(0.99);
  });

  it('should return PROVIDER_ERROR when configured', async () => {
    const res = await provider.classify({ url: 'file:///tmp/error.jpg' });
    expect(res.error).toBe('PROVIDER_ERROR');
    expect(res.message).toBe('Simulated AI API failure');
  });

  it('should fail if image is missing', async () => {
    const res = await provider.classify(null);
    expect(res.error).toBe('PROVIDER_ERROR');
  });
});
