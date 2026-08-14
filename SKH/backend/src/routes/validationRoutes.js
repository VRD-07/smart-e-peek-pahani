const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { triggerValidation, getValidationResult } = require('../controllers/validationController');

router.post('/:id/validate', protect, triggerValidation);
router.get('/:id/validation', protect, getValidationResult);

module.exports = router;
