const { successResponse, errorResponse } = require('../utils/response');
const {
  reminderReachStats,
  escalateForFarmer,
} = require('../services/notifications/awarenessService');
const { CHANNELS } = require('../services/notifications/constants');

/**
 * Reach breakdown for the current reminder cycle, for the Officer Dashboard.
 *
 * GET /api/notifications/escalation-stats
 */
const getEscalationStats = async (req, res) => {
  const stats = await reminderReachStats({ now: new Date() });
  return successResponse(res, 'Escalation stats fetched successfully', stats);
};

/**
 * Fires the escalation ladder for one farmer immediately, skipping the real
 * confirmation windows.
 *
 * POST /api/notifications/escalate
 * Body: { farmerId? , phoneNumber?, upToChannel?: 'WHATSAPP'|'SMS'|'VOICE' }
 *
 * The endpoint is a thin wrapper: all the behaviour lives in escalateForFarmer so
 * the cron sweep, this endpoint and the internal demo panel share one code path.
 */
const triggerEscalation = async (req, res) => {
  const { farmerId, phoneNumber, upToChannel } = req.body || {};

  if (!farmerId && !phoneNumber) {
    return errorResponse(res, 'Provide farmerId or phoneNumber', 'VALIDATION_ERROR', 400);
  }

  if (upToChannel && !Object.values(CHANNELS).includes(upToChannel)) {
    return errorResponse(
      res,
      `upToChannel must be one of ${Object.values(CHANNELS).join(', ')}`,
      'VALIDATION_ERROR',
      400
    );
  }

  const result = await escalateForFarmer({
    farmerId,
    phoneNumber,
    upToChannel: upToChannel || CHANNELS.VOICE,
    // A manual trigger exists precisely to not wait 24 hours per rung.
    force: true,
  });

  if (result.error === 'FARMER_NOT_FOUND') {
    return errorResponse(res, 'Farmer not found', 'FARMER_NOT_FOUND', 404);
  }

  if (result.error === 'NO_ACTIVE_DEADLINE') {
    return errorResponse(
      res,
      'No active scheme deadline to remind about. Seed one with scripts/seedDemoSchemeDeadlines.js.',
      'NO_ACTIVE_DEADLINE',
      409
    );
  }

  return successResponse(res, 'Escalation triggered', result);
};

module.exports = {
  getEscalationStats,
  triggerEscalation,
};
