const GeminiSpeechToTextProvider = require('../geminiSpeechToTextProvider');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const axios = require('axios');

jest.mock('@google/genai');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));
jest.mock('axios');

describe('Gemini Speech-to-Text Provider', () => {
  let provider;
  let mockGenerateContent;

  beforeEach(() => {
    mockGenerateContent = jest.fn();

    GoogleGenAI.mockImplementation(() => {
      return {
        models: {
          generateContent: mockGenerateContent
        }
      };
    });

    provider = new GeminiSpeechToTextProvider();

    // Default audio loading mock
    fs.promises.readFile.mockResolvedValue(Buffer.from('fake-audio-data'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the transcript, confidence and language', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ transcript: 'माझ्या शेतात सोयाबीन आहे', confidence: 0.94, language: 'mr' })
    });

    const res = await provider.transcribe({ url: 'file:///tmp/voice.ogg' });

    expect(res.text).toBe('माझ्या शेतात सोयाबीन आहे');
    expect(res.confidence).toBe(0.94);
    expect(res.language).toBe('mr');
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('should return the words verbatim without mapping them to a crop', async () => {
    // Crop identity is decided by our own dictionary downstream, never here. A
    // provider that also guessed the crop could smuggle in a value the rest of
    // the system does not recognise.
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ transcript: 'इथे गहू लावला आहे', confidence: 0.91, language: 'mr' })
    });

    const res = await provider.transcribe({ url: 'file:///tmp/voice.ogg' });

    expect(res.text).toBe('इथे गहू लावला आहे');
    expect(res).not.toHaveProperty('declaredCrop');
  });

  it('should default language to null when the model does not report one', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ transcript: 'cotton', confidence: 0.8 })
    });

    const res = await provider.transcribe({ url: 'file:///tmp/voice.ogg' });

    expect(res.language).toBeNull();
  });

  it('should return an empty string when the transcript is null', async () => {
    // Nothing intelligible on the recording. The empty string is what
    // voiceCropService turns into EMPTY_TRANSCRIPT and an ask-to-type reply.
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ transcript: null, confidence: 0.1, language: null })
    });

    const res = await provider.transcribe({ url: 'file:///tmp/voice.ogg' });

    expect(res.text).toBe('');
    expect(res.error).toBeUndefined();
  });

  it('should return error for malformed JSON response', async () => {
    mockGenerateContent.mockResolvedValue({
      text: "Here is your response:\n```json\n{ transcript: 'cotton' }\n```" // Not clean JSON
    });

    const res = await provider.transcribe({ url: 'file:///tmp/voice.ogg' });

    expect(res.error).toBe('MALFORMED_RESPONSE');
  });

  it('should return error for empty response', async () => {
    mockGenerateContent.mockResolvedValue({
      text: "null"
    });

    const res = await provider.transcribe({ url: 'file:///tmp/voice.ogg' });

    expect(res.error).toBe('EMPTY_RESPONSE');
  });

  it('should return error for invalid confidence', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ transcript: 'cotton', confidence: 1.5 })
    });

    const res = await provider.transcribe({ url: 'file:///tmp/voice.ogg' });

    expect(res.error).toBe('INVALID_CONFIDENCE');
  });

  it('should return error for API failure', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Rate limit exceeded'));

    const res = await provider.transcribe({ url: 'file:///tmp/voice.ogg' });

    expect(res.error).toBe('PROVIDER_ERROR');
    expect(res.message).toContain('Rate limit exceeded');
  });

  it('should return error if media object is missing', async () => {
    const res = await provider.transcribe(null);
    expect(res.error).toBe('INVALID_INPUT');
  });

  it('should return error for an unsupported media shape', async () => {
    const res = await provider.transcribe({ mimeType: 'audio/ogg' });
    expect(res.error).toBe('PROVIDER_ERROR');
    expect(res.message).toContain('Unsupported audio format');
  });

  it('should load audio from HTTP URL', async () => {
    axios.get.mockResolvedValue({ data: Buffer.from('http-audio') });
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ transcript: 'कापूस', confidence: 0.88, language: 'mr' })
    });

    const res = await provider.transcribe({ url: 'http://example.com/voice.ogg' });

    expect(axios.get).toHaveBeenCalledWith('http://example.com/voice.ogg', { responseType: 'arraybuffer' });
    expect(res.text).toBe('कापूस');
  });

  it('should handle raw buffer directly', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ transcript: 'soybean', confidence: 0.99, language: 'en' })
    });

    const res = await provider.transcribe({ buffer: Buffer.from('raw-audio') });

    expect(res.text).toBe('soybean');
  });

  it('should default the mime type to audio/ogg for WhatsApp voice notes', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ transcript: 'cotton', confidence: 0.9, language: 'en' })
    });

    await provider.transcribe({ buffer: Buffer.from('raw-audio') });

    const audioPart = mockGenerateContent.mock.calls[0][0].contents[1];
    expect(audioPart.inlineData.mimeType).toBe('audio/ogg');
  });

  it('should pass through the mime type the parser actually saw', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ transcript: 'cotton', confidence: 0.9, language: 'en' })
    });

    await provider.transcribe({ buffer: Buffer.from('raw-audio'), mimeType: 'audio/mpeg' });

    const audioPart = mockGenerateContent.mock.calls[0][0].contents[1];
    expect(audioPart.inlineData.mimeType).toBe('audio/mpeg');
  });

  it('should never throw, so a transcription failure cannot 500 the webhook', async () => {
    mockGenerateContent.mockImplementation(() => { throw new Error('synchronous explosion'); });

    await expect(provider.transcribe({ buffer: Buffer.from('raw-audio') })).resolves.toMatchObject({
      error: 'PROVIDER_ERROR'
    });
  });
});
