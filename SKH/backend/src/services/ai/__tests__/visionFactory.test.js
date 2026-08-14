const { getVisionProvider } = require('../visionFactory');
const MockVisionProvider = require('../mockVisionProvider');
const GeminiVisionProvider = require('../geminiVisionProvider');

describe('Vision Factory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return MockVisionProvider by default if no env var is set', () => {
    delete process.env.VISION_PROVIDER;
    const provider = getVisionProvider();
    expect(provider).toBeInstanceOf(MockVisionProvider);
  });

  it('should return MockVisionProvider when VISION_PROVIDER=mock', () => {
    process.env.VISION_PROVIDER = 'mock';
    const provider = getVisionProvider();
    expect(provider).toBeInstanceOf(MockVisionProvider);
  });

  it('should return MockVisionProvider case-insensitively', () => {
    process.env.VISION_PROVIDER = 'MOCK';
    const provider = getVisionProvider();
    expect(provider).toBeInstanceOf(MockVisionProvider);
  });

  it('should return GeminiVisionProvider when VISION_PROVIDER=gemini', () => {
    process.env.VISION_PROVIDER = 'gemini';
    const provider = getVisionProvider();
    expect(provider).toBeInstanceOf(GeminiVisionProvider);
  });

  it('should throw Error when VISION_PROVIDER is invalid', () => {
    process.env.VISION_PROVIDER = 'invalid';
    expect(() => getVisionProvider()).toThrow('Unknown VISION_PROVIDER configured: invalid');
  });
});
