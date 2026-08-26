const express = require('express');
const router = express.Router();
const { requestOtp, verifyOtp, officerLogin } = require('../controllers/authController');

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/officer/login', officerLogin);

module.exports = router;
