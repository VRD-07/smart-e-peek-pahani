const express = require('express');
const { handleWebhook } = require('../controllers/whatsappController');
const validateTwilioRequest = require('../middleware/validateTwilio');

const router = express.Router();

// Mount the webhook route.
// Member 1 will eventually mount this router under '/api/whatsapp'
// Note: Twilio webhooks require URL-encoded payloads, so `express.urlencoded` must be configured globally or here.
router.post('/webhook', validateTwilioRequest, handleWebhook);

module.exports = router;
