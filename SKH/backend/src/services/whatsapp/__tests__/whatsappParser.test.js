const { parseMessage } = require('../whatsappParser');
const { MESSAGE_TYPES } = require('../constants');

describe('whatsappParser', () => {
  it('should parse TEXT messages', () => {
    const payload = { Body: 'Hello world' };
    const result = parseMessage(payload);
    expect(result.type).toBe(MESSAGE_TYPES.TEXT);
    expect(result.data.text).toBe('Hello world');
  });

  it('should parse LOCATION messages correctly and normalize them', () => {
    const payload = { Latitude: '19.123', Longitude: '74.123', Address: 'Some Address' };
    const result = parseMessage(payload);
    expect(result.type).toBe(MESSAGE_TYPES.LOCATION);
    expect(result.data.rawLatitude).toBe('19.123');
    expect(result.data.rawLongitude).toBe('74.123');
  });

  it('should extract raw malformed coordinates', () => {
    // Latitude out of bounds (will be caught by locationService later)
    const payload1 = { Latitude: '100.123', Longitude: '74.123' };
    const result1 = parseMessage(payload1);
    expect(result1.type).toBe(MESSAGE_TYPES.LOCATION);
    expect(result1.data.rawLatitude).toBe('100.123');

    // Not a number
    const payload2 = { Latitude: 'abc', Longitude: '74.123' };
    const result2 = parseMessage(payload2);
    expect(result2.type).toBe(MESSAGE_TYPES.LOCATION);
  });

  it('should parse IMAGE media messages (first media only)', () => {
    const payload = {
      NumMedia: '1',
      MediaUrl0: 'https://example.com/image.jpg',
      MediaContentType0: 'image/jpeg'
    };
    const result = parseMessage(payload);
    expect(result.type).toBe(MESSAGE_TYPES.IMAGE);
    expect(result.data.url).toBe('https://example.com/image.jpg');
    expect(result.data.mimeType).toBe('image/jpeg');
  });

  it('should parse VOICE media messages', () => {
    const payload = {
      NumMedia: '1',
      MediaUrl0: 'https://example.com/voice.ogg',
      MediaContentType0: 'audio/ogg'
    };
    const result = parseMessage(payload);
    expect(result.type).toBe(MESSAGE_TYPES.VOICE);
    expect(result.data.url).toBe('https://example.com/voice.ogg');
    expect(result.data.mimeType).toBe('audio/ogg');
  });

  it('should parse multiple media fields by picking the first one', () => {
    const payload = {
      NumMedia: '2',
      MediaUrl0: 'https://example.com/img1.jpg',
      MediaContentType0: 'image/jpeg',
      MediaUrl1: 'https://example.com/img2.png',
      MediaContentType1: 'image/png'
    };
    const result = parseMessage(payload);
    expect(result.type).toBe(MESSAGE_TYPES.IMAGE);
    expect(result.data.url).toBe('https://example.com/img1.jpg');
  });

  it('should return UNKNOWN for missing/invalid fields', () => {
    const result = parseMessage(null);
    expect(result.type).toBe(MESSAGE_TYPES.UNKNOWN);

    const emptyResult = parseMessage({});
    expect(emptyResult.type).toBe(MESSAGE_TYPES.UNKNOWN);
  });
});
