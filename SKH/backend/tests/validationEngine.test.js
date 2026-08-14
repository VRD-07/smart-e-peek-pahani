const { runValidationEngine } = require('../src/services/validation/validationEngine');
const ValidationResult = require('../src/models/ValidationResult');
const Submission = require('../src/models/Submission');
const { getVisionProvider } = require('../src/services/ai/visionFactory');

jest.mock('../src/models/ValidationResult');
jest.mock('../src/models/Submission');
jest.mock('../src/services/ai/visionFactory');

const mockVisionProvider = { classify: jest.fn() };

describe('Validation Engine', () => {
  let mockSubmission;
  let mockFarmer;
  let mockGat;

  beforeEach(() => {
    mockSubmission = {
      _id: 'sub123',
      clientSubmissionId: 'client123',
      farmerId: 'farmer123',
      source: 'WEB',
      gatId: 'gat123',
      crop: { declaredCrop: 'soybean' },
      location: { latitude: 19.1235, longitude: 74.1235, receivedAt: new Date() },
      image: { url: 'http://example.com/image.jpg', mimeType: 'image/jpeg', size: 1024 },
      save: jest.fn().mockResolvedValue(true)
    };

    mockFarmer = { _id: 'farmer123' };

    // Polygon for 19.1235, 74.1235
    mockGat = {
      _id: 'gat123',
      boundary: {
        type: 'Polygon',
        coordinates: [[
          [74.1230, 19.1230],
          [74.1240, 19.1230],
          [74.1240, 19.1240],
          [74.1230, 19.1240],
          [74.1230, 19.1230]
        ]]
      }
    };

    ValidationResult.create.mockImplementation(async (data) => ({ _id: 'val123', ...data }));
    getVisionProvider.mockReturnValue(mockVisionProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('valid submission should PASS', async () => {
    mockVisionProvider.classify.mockResolvedValue({ detectedCrop: 'soybean', confidence: 0.95 });

    const result = await runValidationEngine(mockSubmission, mockFarmer, mockGat);

    expect(result.overallStatus).toBe('PASS');
    expect(result.checks.location.status).toBe('PASS');
    expect(result.checks.location.insideGat).toBe(true);
    expect(result.checks.crop.status).toBe('PASS');
  });

  it('missing coordinates should FAIL', async () => {
    mockSubmission.location.latitude = null;
    mockVisionProvider.classify.mockResolvedValue({ detectedCrop: 'soybean', confidence: 0.95 });

    const result = await runValidationEngine(mockSubmission, mockFarmer, mockGat);

    expect(result.overallStatus).toBe('FAIL');
    expect(result.checks.location.status).toBe('FAIL');
  });

  it('out-of-range coordinates should FAIL', async () => {
    mockSubmission.location.latitude = 100;
    mockVisionProvider.classify.mockResolvedValue({ detectedCrop: 'soybean', confidence: 0.95 });

    const result = await runValidationEngine(mockSubmission, mockFarmer, mockGat);

    expect(result.overallStatus).toBe('FAIL');
    expect(result.checks.location.status).toBe('FAIL');
  });

  it('outside Gat should FAIL', async () => {
    // move point outside
    mockSubmission.location.latitude = 19.2;
    mockSubmission.location.longitude = 74.2;
    mockVisionProvider.classify.mockResolvedValue({ detectedCrop: 'soybean', confidence: 0.95 });

    const result = await runValidationEngine(mockSubmission, mockFarmer, mockGat);

    expect(result.overallStatus).toBe('FAIL');
    expect(result.checks.location.status).toBe('FAIL');
    expect(result.checks.location.insideGat).toBe(false);
    expect(result.checks.location.distanceFromBoundary).toBeGreaterThan(0);
  });

  it('crop mismatch should FAIL or REVIEW depending on confidence', async () => {
    mockVisionProvider.classify.mockResolvedValue({ detectedCrop: 'cotton', confidence: 0.92 });

    const result = await runValidationEngine(mockSubmission, mockFarmer, mockGat);

    expect(result.overallStatus).toBe('FAIL');
    expect(result.checks.crop.status).toBe('FAIL');

    mockVisionProvider.classify.mockResolvedValue({ detectedCrop: 'cotton', confidence: 0.88 });
    const result2 = await runValidationEngine(mockSubmission, mockFarmer, mockGat);

    expect(result2.overallStatus).toBe('REVIEW');
    expect(result2.checks.crop.status).toBe('REVIEW');
  });

  it('unsupported/unidentifiable AI crop (low confidence) should REVIEW', async () => {
    mockVisionProvider.classify.mockResolvedValue({ detectedCrop: 'unknown', confidence: 0.4 });

    const result = await runValidationEngine(mockSubmission, mockFarmer, mockGat);

    expect(result.overallStatus).toBe('REVIEW');
    expect(result.checks.crop.status).toBe('REVIEW');
  });

  it('missing AI evidence (null) should REVIEW', async () => {
    mockVisionProvider.classify.mockResolvedValue(null);

    const result = await runValidationEngine(mockSubmission, mockFarmer, mockGat);

    expect(result.overallStatus).toBe('REVIEW');
    expect(result.checks.crop.status).toBe('REVIEW');
  });

  it('AI provider failure should REVIEW and not crash', async () => {
    mockVisionProvider.classify.mockRejectedValue(new Error('Network error'));

    const result = await runValidationEngine(mockSubmission, mockFarmer, mockGat);

    expect(result.overallStatus).toBe('REVIEW');
    expect(result.checks.crop.status).toBe('REVIEW');
    expect(result.checks.crop.reason).toContain('failed');
  });

  it('missing image should FAIL', async () => {
    mockSubmission.image = null;

    const result = await runValidationEngine(mockSubmission, mockFarmer, mockGat);

    expect(result.overallStatus).toBe('FAIL');
    expect(result.checks.image.status).toBe('FAIL');
  });

  it('invalid image MIME type should FAIL', async () => {
    mockSubmission.image.mimeType = 'application/pdf';

    const result = await runValidationEngine(mockSubmission, mockFarmer, mockGat);

    expect(result.overallStatus).toBe('FAIL');
    expect(result.checks.image.status).toBe('FAIL');
  });

  it('oversized image should FAIL', async () => {
    mockSubmission.image.size = 10 * 1024 * 1024; // 10MB

    const result = await runValidationEngine(mockSubmission, mockFarmer, mockGat);

    expect(result.overallStatus).toBe('FAIL');
    expect(result.checks.image.status).toBe('FAIL');
  });
});
