const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const {
  createSubmission,
  getSubmission,
  listSubmissions,
  updateSubmissionStatus,
} = require('../controllers/submissionController');

router.post('/', protect, createSubmission);
// Officer Dashboard: global listing across all farmers and Gats.
router.get('/', protect, requireRole('officer'), listSubmissions);
// Officer override of a validation outcome — approve or reject by hand.
router.patch('/:id/status', protect, requireRole('officer'), updateSubmissionStatus);
router.get('/:id', protect, getSubmission);

module.exports = router;
