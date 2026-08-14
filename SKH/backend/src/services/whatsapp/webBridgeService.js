const crypto = require('crypto');
const WebBridgeToken = require('../../models/WebBridgeToken');

/**
 * Creates a SHA-256 hash of the raw token.
 * This ensures the database/memory never stores the raw bearer credential.
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generates a secure Web Bridge URL for the given WhatsApp session.
 *
 * @param {string} sessionId - The identifier for the WhatsApp session (e.g. phone number)
 * @param {string} submissionId - The submission ID
 * @returns {Promise<Object>} { token, url, expiresAt }
 */
async function createBridgeToken(sessionId, submissionId) {
  if (!sessionId) {
    throw new Error('Session ID is required to create a bridge token');
  }

  // Generate 32 bytes of cryptographically secure randomness
  // base64url encoding is safe for URLs
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);

  const ttlSeconds = parseInt(process.env.WEB_BRIDGE_TOKEN_TTL_SECONDS || '900', 10);
  const now = Date.now();
  const expiresAt = new Date(now + ttlSeconds * 1000);

  await WebBridgeToken.create({
    tokenHash,
    sessionId,
    submissionId,
    expiresAt,
    used: false
  });

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const url = `${baseUrl}/submit?token=${rawToken}`;

  return {
    token: rawToken,
    url,
    expiresAt: expiresAt.toISOString()
  };
}

/**
 * Consumes a raw token and exchanges it for the WhatsApp session ID.
 * Enforces one-time use and strict expiration atomically.
 *
 * @param {string} rawToken - The token retrieved from the URL
 * @returns {Promise<Object>} { sessionId } on success, or { error, reason } on failure
 */
async function consumeBridgeToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return { error: true, reason: 'INVALID_TOKEN' };
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  // Atomically find a valid, unused token and mark it used
  const record = await WebBridgeToken.findOneAndUpdate(
    {
      tokenHash,
      used: false,
      expiresAt: { $gt: now }
    },
    {
      $set: { used: true }
    },
    {
      returnDocument: 'after'
    }
  );

  if (!record) {
    // Determine the reason for failure (used, expired, or doesn't exist)
    const existing = await WebBridgeToken.findOne({ tokenHash });
    if (!existing) {
      return { error: true, reason: 'INVALID_TOKEN' };
    }
    if (existing.used) {
      return { error: true, reason: 'USED_TOKEN' };
    }
    if (existing.expiresAt <= now) {
      return { error: true, reason: 'EXPIRED_TOKEN' };
    }
    return { error: true, reason: 'INVALID_TOKEN' };
  }

  return { sessionId: record.sessionId, submissionId: record.submissionId };
}

/**
 * Helper to clear the store during test suites.
 */
async function _clearStore() {
  await WebBridgeToken.deleteMany({});
}

/**
 * Internal access to store size for testing token uniqueness.
 */
async function _getStoreSize() {
  return await WebBridgeToken.countDocuments({});
}

module.exports = {
  createBridgeToken,
  consumeBridgeToken,
  _clearStore,
  _getStoreSize
};
