const MockSpeechToTextProvider = require('../mockSpeechToTextProvider');

describe('Mock Speech-to-Text Provider', () => {
  let provider;

  beforeEach(() => {
    provider = new MockSpeechToTextProvider();
  });

  it('should return default English transcript', async () => {
    const result = await provider.transcribe({ url: 'http://example.com/audio.ogg' });
    expect(result.text).toBe('I planted soybean here.');
  });

  it('should return Marathi transcript based on URL keyword', async () => {
    const result = await provider.transcribe({ url: 'http://example.com/marathi_soybean.ogg' });
    expect(result.text).toBe('माझ्या शेतात सोयाबीन आहे');
  });

  it('should return Hindi transcript based on URL keyword', async () => {
    const result = await provider.transcribe({ url: 'http://example.com/hindi_cotton.ogg' });
    expect(result.text).toBe('मैंने यहाँ कपास लगाया है');
  });

  it('should return empty transcript', async () => {
    const result = await provider.transcribe({ url: 'http://example.com/empty_audio.ogg' });
    expect(result.text).toBe('');
  });

  it('should return STT provider error', async () => {
    const result = await provider.transcribe({ url: 'http://example.com/error_sim.ogg' });
    expect(result.error).toBe('PROVIDER_ERROR');
    expect(result.message).toBe('Simulated STT failure');
  });

  it('should handle missing media URL safely', async () => {
    const result = await provider.transcribe({});
    expect(result.error).toBe('PROVIDER_ERROR');
  });
});
