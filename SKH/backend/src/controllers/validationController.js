const { successResponse, errorResponse } = require('../utils/response');
const Submission = require('../models/Submission');
const Farmer = require('../models/Farmer');
const Gat = require('../models/Gat');
const ValidationResult = require('../models/ValidationResult');
const { runValidationEngine } = require('../services/validation/validationEngine');

const triggerValidation = async (req, res) => {
  const { id } = req.params;

  const submission = await Submission.findById(id);
  if (!submission) {
    return errorResponse(res, 'Submission not found', 'SUBMISSION_NOT_FOUND', 404);
  }

  const farmer = await Farmer.findById(submission.farmerId);
  const gat = await Gat.findById(submission.gatId);

  const result = await runValidationEngine(submission, farmer, gat);

  return successResponse(res, 'Validation completed', result);
};

const getValidationResult = async (req, res) => {
  const { id } = req.params;
  const submission = await Submission.findById(id).populate('validationResultId');

  if (!submission) {
    return errorResponse(res, 'Submission not found', 'SUBMISSION_NOT_FOUND', 404);
  }

  if (!submission.validationResultId) {
    return errorResponse(res, 'Validation not performed yet', 'VALIDATION_NOT_FOUND', 404);
  }

  return successResponse(res, 'Validation result fetched successfully', submission.validationResultId);
};

module.exports = {
  triggerValidation,
  getValidationResult,
};
