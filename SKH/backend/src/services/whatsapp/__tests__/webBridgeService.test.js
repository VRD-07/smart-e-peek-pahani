const {
  createBridgeToken,
  consumeBridgeToken,
  _clearStore,
  _getStoreSize
} = require('../webBridgeService');

describe('Web Bridge Service', () => {
  const originalEnv = process.env;

  let mongoServer;
  beforeAll(async () => {
    const mongoose = require('mongoose');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
    process.env = originalEnv;
  });

  beforeEach(async () => {
    process.env = { ...originalEnv };
    const { _clearStore } = require('../webBridgeService');
    await _clearStore();
  });

  describe('Token Generation', () => {
    it('should generate a token with sufficient entropy and correct URL', async () => {
      process.env.FRONTEND_URL = 'https://myapp.com';
      const { createBridgeToken } = require('../webBridgeService');
      const bridge = await createBridgeToken('session_123');

      expect(bridge.token).toBeDefined();
      expect(typeof bridge.token).toBe('string');
      // 32 bytes in base64url is 43 characters
      expect(bridge.token.length).toBeGreaterThanOrEqual(43);

      expect(bridge.url).toBe(`https://myapp.com/submit?token=${bridge.token}`);
      expect(bridge.expiresAt).toBeDefined();
    });

    it('should generate unique tokens', async () => {
      const { createBridgeToken, _getStoreSize } = require('../webBridgeService');
      const bridge1 = await createBridgeToken('session_123');
      const bridge2 = await createBridgeToken('session_123');

      expect(bridge1.token).not.toBe(bridge2.token);
      expect(await _getStoreSize()).toBe(2);
    });

    it('should not embed session data or phone number in the raw token', async () => {
      const { createBridgeToken } = require('../webBridgeService');
      const sessionId = '+919999999999';
      const bridge = await createBridgeToken(sessionId);

      expect(bridge.token).not.toContain('919999999999');
      expect(bridge.token).not.toContain(sessionId);
      // Verify no direct base64 encoding of session id exists inside the token
      const decoded = Buffer.from(bridge.token, 'base64url').toString();
      expect(decoded).not.toContain(sessionId);
    });
  });

  describe('Token Consumption & Lifecycle', () => {
    it('should consume a valid token and return the correct session ID', async () => {
      const { createBridgeToken, consumeBridgeToken } = require('../webBridgeService');
      const bridge = await createBridgeToken('session_abc');

      const result = await consumeBridgeToken(bridge.token);
      expect(result.error).toBeUndefined();
      expect(result.sessionId).toBe('session_abc');
    });

    it('should reject invalid or malformed tokens', async () => {
      const { consumeBridgeToken } = require('../webBridgeService');
      expect((await consumeBridgeToken('random_garbage')).reason).toBe('INVALID_TOKEN');
      expect((await consumeBridgeToken('')).reason).toBe('INVALID_TOKEN');
      expect((await consumeBridgeToken(null)).reason).toBe('INVALID_TOKEN');
      expect((await consumeBridgeToken(123)).reason).toBe('INVALID_TOKEN');
    });

    it('should enforce one-time use (USED_TOKEN)', async () => {
      const { createBridgeToken, consumeBridgeToken } = require('../webBridgeService');
      const bridge = await createBridgeToken('session_abc');

      // First use succeeds
      const result1 = await consumeBridgeToken(bridge.token);
      expect(result1.sessionId).toBe('session_abc');

      // Second use fails
      const result2 = await consumeBridgeToken(bridge.token);
      expect(result2.error).toBe(true);
      expect(result2.reason).toBe('USED_TOKEN');
    });
  });

  describe('Token Expiration', () => {
    it('should reject expired tokens', async () => {
      // 15 minute TTL
      process.env.WEB_BRIDGE_TOKEN_TTL_SECONDS = '900';
      const { createBridgeToken, consumeBridgeToken } = require('../webBridgeService');
      const bridge = await createBridgeToken('session_abc');

      // Manually modify expiresAt in DB to simulate expiration
      const WebBridgeToken = require('../../../models/WebBridgeToken');
      await WebBridgeToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

      const result = await consumeBridgeToken(bridge.token);
      expect(result.error).toBe(true);
      expect(result.reason).toBe('EXPIRED_TOKEN');
    });

    it('should accept tokens just before expiration', async () => {
      // 15 minute TTL
      process.env.WEB_BRIDGE_TOKEN_TTL_SECONDS = '900';
      const { createBridgeToken, consumeBridgeToken } = require('../webBridgeService');
      const bridge = await createBridgeToken('session_abc');

      // Manually modify expiresAt in DB to simulate almost expired
      const WebBridgeToken = require('../../../models/WebBridgeToken');
      await WebBridgeToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() + 1000) } });

      const result = await consumeBridgeToken(bridge.token);
      expect(result.error).toBeUndefined();
      expect(result.sessionId).toBe('session_abc');
    });
  });
});
