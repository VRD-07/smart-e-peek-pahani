const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const {
  getEscalationStats,
  triggerEscalation,
} = require('../controllers/notificationController');

// Officer-only: both read a cross-farmer view and, in the case of the trigger,
// send real messages and place real calls.
router.get('/escalation-stats', protect, requireRole('officer'), getEscalationStats);
router.post('/escalate', protect, requireRole('officer'), triggerEscalation);

module.exports = router;
