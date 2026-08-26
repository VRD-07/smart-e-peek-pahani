const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const { createSubmission, getSubmission, listSubmissions } = require('../controllers/submissionController');

router.post('/', protect, createSubmission);
// Officer Dashboard: global listing across all farmers and Gats.
router.get('/', protect, requireRole('officer'), listSubmissions);
router.get('/:id', protect, getSubmission);

module.exports = router;
