const { getSpeechToTextProvider } = require('../speechToTextFactory');
const MockSpeechToTextProvider = require('../mockSpeechToTextProvider');
const GeminiSpeechToTextProvider = require('../geminiSpeechToTextProvider');

describe('Speech-to-Text Factory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return MockSpeechToTextProvider by default if no env var is set', () => {
    delete process.env.STT_PROVIDER;
    expect(getSpeechToTextProvider()).toBeInstanceOf(MockSpeechToTextProvider);
  });

  it('should return MockSpeechToTextProvider when STT_PROVIDER=mock', () => {
    process.env.STT_PROVIDER = 'mock';
    expect(getSpeechToTextProvider()).toBeInstanceOf(MockSpeechToTextProvider);
  });

  it('should return MockSpeechToTextProvider case-insensitively', () => {
    process.env.STT_PROVIDER = 'MOCK';
    expect(getSpeechToTextProvider()).toBeInstanceOf(MockSpeechToTextProvider);
  });

  it('should return GeminiSpeechToTextProvider when STT_PROVIDER=gemini', () => {
    process.env.STT_PROVIDER = 'gemini';
    expect(getSpeechToTextProvider()).toBeInstanceOf(GeminiSpeechToTextProvider);
  });

  it('should throw Error when STT_PROVIDER is invalid', () => {
    // Loud rather than a silent downgrade to the mock: a production deployment
    // that quietly stopped transcribing would look like it was working.
    process.env.STT_PROVIDER = 'invalid';
    expect(() => getSpeechToTextProvider()).toThrow('Unknown STT_PROVIDER configured: invalid');
  });
});
