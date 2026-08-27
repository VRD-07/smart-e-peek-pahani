const GeminiVisionProvider = require('../geminiVisionProvider');
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

describe('Gemini Vision Provider', () => {
  let provider;
  let mockGenerateContent;

  beforeEach(() => {
    mockGenerateContent = jest.fn();

    // Mock the GoogleGenAI constructor
    GoogleGenAI.mockImplementation(() => {
      return {
        models: {
          generateContent: mockGenerateContent
        }
      };
    });

    provider = new GeminiVisionProvider();

    // Default image loading mock
    fs.promises.readFile.mockResolvedValue(Buffer.from('fake-image-data'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return valid structured response with canonical crop', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ detectedCrop: 'Soybean', confidence: 0.93 })
    });

    const res = await provider.classify({ url: 'file:///tmp/test.jpg' });

    expect(res.detectedCrop).toBe('soybean'); // Normalizes
    expect(res.confidence).toBe(0.93);
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('should return valid structured response with unsupported crop resulting in null', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ detectedCrop: 'Dragonfruit', confidence: 0.90 })
    });

    const res = await provider.classify({ url: 'file:///tmp/test.jpg' });

    // "Dragonfruit" is not in the dictionary, so normalization returns null
    expect(res.detectedCrop).toBeNull();
    expect(res.confidence).toBe(0.90);
  });

  it('should return error for malformed JSON response', async () => {
    mockGenerateContent.mockResolvedValue({
      text: "Here is your response:\n```json\n{ detectedCrop: 'soybean' }\n```" // Not clean JSON
    });

    const res = await provider.classify({ url: 'file:///tmp/test.jpg' });

    expect(res.error).toBe('MALFORMED_RESPONSE');
  });

  it('should return error for empty response', async () => {
    mockGenerateContent.mockResolvedValue({
      text: "null"
    });

    const res = await provider.classify({ url: 'file:///tmp/test.jpg' });

    expect(res.error).toBe('EMPTY_RESPONSE');
  });

  it('should return error for invalid confidence', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ detectedCrop: 'soybean', confidence: 1.5 })
    });

    const res = await provider.classify({ url: 'file:///tmp/test.jpg' });

    expect(res.error).toBe('INVALID_CONFIDENCE');
  });

  it('should return error for API failure', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Rate limit exceeded'));

    const res = await provider.classify({ url: 'file:///tmp/test.jpg' });

    expect(res.error).toBe('PROVIDER_ERROR');
    expect(res.message).toContain('Rate limit exceeded');
  });

  it('should return error if image object is missing', async () => {
    const res = await provider.classify(null);
    expect(res.error).toBe('INVALID_INPUT');
  });

  it('should load image from HTTP URL', async () => {
    axios.get.mockResolvedValue({ data: Buffer.from('http-data') });
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ detectedCrop: 'cotton', confidence: 0.88 })
    });

    const res = await provider.classify({ url: 'http://example.com/test.jpg' });

    expect(axios.get).toHaveBeenCalledWith('http://example.com/test.jpg', { responseType: 'arraybuffer' });
    expect(res.detectedCrop).toBe('cotton');
  });

  it('should handle raw buffer directly', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ detectedCrop: 'soybean', confidence: 0.99 })
    });

    const res = await provider.classify({ buffer: Buffer.from('raw-buffer') });

    expect(res.detectedCrop).toBe('soybean');
  });
});
