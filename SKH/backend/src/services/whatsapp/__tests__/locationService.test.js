const { processLocation } = require('../locationService');

describe('locationService', () => {
  it('should process valid coordinates', () => {
    const loc = processLocation('19.123', '74.123');
    expect(loc).not.toBeNull();
    expect(loc.latitude).toBe(19.123);
    expect(loc.longitude).toBe(74.123);
    expect(loc.source).toBe('WHATSAPP');
    expect(loc.receivedAt).toBeDefined();
  });

  it('should accept numerical bounds (latitude -90 and 90, longitude -180 and 180)', () => {
    expect(processLocation('-90', '180')).not.toBeNull();
    expect(processLocation('90', '-180')).not.toBeNull();
  });

  it('should reject missing latitude or longitude', () => {
    expect(processLocation(undefined, '74.123')).toBeNull();
    expect(processLocation('19.123', null)).toBeNull();
    expect(processLocation(null, null)).toBeNull();
  });

  it('should reject empty string coordinates', () => {
    expect(processLocation('', '74.123')).toBeNull();
    expect(processLocation('19.123', '  ')).toBeNull();
  });

  it('should reject non-numeric coordinates', () => {
    expect(processLocation('abc', '74.123')).toBeNull();
    expect(processLocation('19.123', 'xyz')).toBeNull();
  });

  it('should reject NaN and Infinity', () => {
    expect(processLocation(NaN, '74.123')).toBeNull();
    expect(processLocation('19.123', Infinity)).toBeNull();
  });

  it('should reject invalid coordinate ranges', () => {
    expect(processLocation('91', '74.123')).toBeNull(); // lat > 90
    expect(processLocation('-91', '74.123')).toBeNull(); // lat < -90
    expect(processLocation('19.123', '181')).toBeNull(); // lon > 180
    expect(processLocation('19.123', '-181')).toBeNull(); // lon < -180
  });

  it('should preserve source as WHATSAPP', () => {
    const loc = processLocation('19.123', '74.123');
    expect(loc.source).toBe('WHATSAPP');
  });

  it('should generate a valid ISO timestamp', () => {
    const loc = processLocation('19.123', '74.123');
    const timestamp = new Date(loc.receivedAt).getTime();
    expect(isNaN(timestamp)).toBe(false);
  });
});
