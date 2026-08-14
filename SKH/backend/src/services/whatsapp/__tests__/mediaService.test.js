const axios = require('axios');
const fs = require('fs');
const { Readable } = require('stream');
const { processMedia, MAX_SIZE_BYTES } = require('../mediaService');

jest.mock('axios');

describe('mediaService', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    process.env.TWILIO_ACCOUNT_SID = 'test-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockResponse(mimeType, length, dataChunks) {
    const stream = new Readable({
      read() {
        dataChunks.forEach(chunk => this.push(chunk));
        this.push(null);
      }
    });

    stream.destroy = jest.fn();

    return {
      headers: {
        'content-type': mimeType,
        'content-length': length.toString()
      },
      data: stream
    };
  }

  it('should download a valid JPEG image successfully', async () => {
    const mockRes = createMockResponse('image/jpeg', 100, [Buffer.from('fake-image-data')]);
    axios.mockResolvedValue(mockRes);

    const result = await processMedia('http://example.com/img', 'image/');

    expect(result.url).toMatch(/^file:\/\/.*spp_media_/);
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.size).toBe(15); // 'fake-image-data'.length

    // Clean up temp file
    const filePath = result.url.replace('file://', '');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('should download a valid PNG image successfully', async () => {
    const mockRes = createMockResponse('image/png', 100, [Buffer.from('png-data')]);
    axios.mockResolvedValue(mockRes);

    const result = await processMedia('http://example.com/img', 'image/');

    expect(result.mimeType).toBe('image/png');

    const filePath = result.url.replace('file://', '');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('should download a valid voice MIME type successfully', async () => {
    const mockRes = createMockResponse('audio/ogg', 100, [Buffer.from('audio-data')]);
    axios.mockResolvedValue(mockRes);

    const result = await processMedia('http://example.com/voice', 'audio/');

    expect(result.mimeType).toBe('audio/ogg');

    const filePath = result.url.replace('file://', '');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('should reject unsupported MIME type', async () => {
    const mockRes = createMockResponse('video/mp4', 100, [Buffer.from('video-data')]);
    axios.mockResolvedValue(mockRes);

    await expect(processMedia('http://example.com/vid', 'image/'))
      .rejects.toThrow('Unexpected content type: video/mp4');
  });

  it('should reject if missing MediaUrl', async () => {
    await expect(processMedia(null, 'image/'))
      .rejects.toThrow('Missing URL or expected MIME type');
  });

  it('should reject if missing expected MIME type', async () => {
    await expect(processMedia('http://example.com', null))
      .rejects.toThrow('Missing URL or expected MIME type');
  });

  it('should reject if Content-Length header is too large', async () => {
    const mockRes = createMockResponse('image/jpeg', MAX_SIZE_BYTES + 100, [Buffer.from('too-big')]);
    axios.mockResolvedValue(mockRes);

    await expect(processMedia('http://example.com/img', 'image/'))
      .rejects.toThrow('Media file too large (exceeds Content-Length)');
  });

  it('should reject if streamed data exceeds max size', async () => {
    // Content-length header might be small or missing, but stream sends too much
    const largeBuffer = Buffer.alloc(MAX_SIZE_BYTES + 10);
    const mockRes = createMockResponse('image/jpeg', 0, [largeBuffer]);
    axios.mockResolvedValue(mockRes);

    await expect(processMedia('http://example.com/img', 'image/'))
      .rejects.toThrow('Media file exceeds max size during stream');

    // Verify stream was destroyed
    expect(mockRes.data.destroy).toHaveBeenCalled();
  });

  it('should reject if HTTP request fails (4xx/5xx)', async () => {
    axios.mockRejectedValue(new Error('Request failed with status code 404'));

    await expect(processMedia('http://example.com/404', 'image/'))
      .rejects.toThrow('Media download failed: Request failed with status code 404');
  });

  it('should use authenticated media request', async () => {
    const mockRes = createMockResponse('image/jpeg', 100, [Buffer.from('data')]);
    axios.mockResolvedValue(mockRes);

    const result = await processMedia('http://example.com/img', 'image/');

    expect(axios).toHaveBeenCalledWith(expect.objectContaining({
      auth: {
        username: 'test-sid',
        password: 'test-token'
      }
    }));

    const filePath = result.url.replace('file://', '');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('should fail if Twilio credentials are missing', async () => {
    delete process.env.TWILIO_ACCOUNT_SID;

    await expect(processMedia('http://example.com/img', 'image/'))
      .rejects.toThrow('Missing Twilio credentials for media download');
  });
});
