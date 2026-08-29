const express = require('express');
const router = express.Router();
const {
  handleSeedGat,
  handleTriggerSubmission,
  handleTriggerEscalation,
  handleChaos,
  handleSimulateBlackout,
  handleRestoreSnapshot,
  handleCreateSnapshot,
  handleListSnapshots,
  handleCheckSystemHealth
} = require('../controllers/demoController');

// Internal demo panel endpoints
router.post('/seed-gat', handleSeedGat);
router.post('/trigger-submission', handleTriggerSubmission);
router.post('/trigger-escalation', handleTriggerEscalation);
router.post('/chaos', handleChaos);

// Blackout Resilience & Recovery Endpoints
router.post('/blackout', handleSimulateBlackout);
router.post('/simulate-blackout', handleSimulateBlackout);
router.post('/restore', handleRestoreSnapshot);
router.post('/snapshot', handleCreateSnapshot);
router.post('/backup', handleCreateSnapshot);
router.get('/snapshots', handleListSnapshots);
router.get('/health', handleCheckSystemHealth);
router.get('/system-health', handleCheckSystemHealth);

module.exports = router;

