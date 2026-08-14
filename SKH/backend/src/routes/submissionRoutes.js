const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createSubmission, getSubmission } = require('../controllers/submissionController');

router.post('/', protect, createSubmission);
router.get('/:id', protect, getSubmission);

module.exports = router;
