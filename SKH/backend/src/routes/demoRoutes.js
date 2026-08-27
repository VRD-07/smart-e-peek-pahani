const express = require('express');
const router = express.Router();
const {
  handleSeedGat,
  handleTriggerSubmission,
  handleTriggerEscalation,
  handleChaos
} = require('../controllers/demoController');

// Internal demo panel endpoints
router.post('/seed-gat', handleSeedGat);
router.post('/trigger-submission', handleTriggerSubmission);
router.post('/trigger-escalation', handleTriggerEscalation);
router.post('/chaos', handleChaos);

module.exports = router;

