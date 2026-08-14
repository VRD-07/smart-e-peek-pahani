const express = require('express');
const router = express.Router();
const { consumeBridgeToken } = require('../services/whatsapp/webBridgeService');
const Submission = require('../models/Submission');
const ValidationResult = require('../models/ValidationResult');

/**
 * GET /api/bridge/verify
 * Query parameters:
 *  - token: The raw opaque token
 */
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    // Attempt to consume the bridge token
    const result = await consumeBridgeToken(token);

    if (result.error) {
      // Return 401 or 403 based on reason, but 400 is fine for all token errors
      return res.status(400).json({ success: false, error: result.reason });
    }

    const { sessionId, submissionId } = result;

    if (!submissionId) {
      return res.status(404).json({ success: false, error: 'Submission ID not found in token' });
    }

    const submission = await Submission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    let validationResult = null;
    if (submission.validationResultId) {
      validationResult = await ValidationResult.findById(submission.validationResultId);
    }

    // Return only what frontend needs. Do NOT return sensitive farmer data or raw tokens.
    return res.json({
      success: true,
      data: {
        submission: {
          id: submission._id,
          status: submission.status,
          crop: submission.crop,
          location: submission.location,
          image: submission.image,
          source: submission.source,
          createdAt: submission.createdAt
        },
        validation: validationResult ? {
          overallStatus: validationResult.overallStatus,
          checks: validationResult.checks,
          reasons: validationResult.reasons
        } : null
      }
    });

  } catch (error) {
    console.error('Bridge verification error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
