const { successResponse, errorResponse } = require('../utils/response');
const Submission = require('../models/Submission');
const ValidationResult = require('../models/ValidationResult');
const Farmer = require('../models/Farmer');
const { validateSubmission } = require('../services/validation/validationService');

const createSubmission = async (req, res) => {
  try {
    const { clientSubmissionId, source, gatId, crop, location, image } = req.body;

    // 2. AUTHENTICATED FARMER ID (ignore req.body.farmerId)
    const farmerId = req.user?.farmerId;

    if (!farmerId) {
      return errorResponse(res, 'Not authorized, no token', 'UNAUTHORIZED', 401);
    }

    if (!gatId) {
      return errorResponse(res, 'Missing gatId', 'VALIDATION_ERROR', 400);
    }

    // 3. FARMER LOOKUP
    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return errorResponse(res, 'Farmer not registered', 'FARMER_NOT_REGISTERED', 404);
    }

    // 4. GAT AUTHORIZATION
    if (!farmer.associatedGats || farmer.associatedGats.length === 0) {
      return errorResponse(res, 'Farmer Gat not configured', 'FARMER_GAT_NOT_CONFIGURED', 400);
    }

    const hasGat = farmer.associatedGats.some(gId => gId.toString() === gatId);
    if (!hasGat) {
      return errorResponse(res, 'Requested Gat does not match Farmer Gat', 'FARMER_GAT_MISMATCH', 403);
    }

    // 5. SUBMISSION CREATION
    const submission = await Submission.create({
      clientSubmissionId,
      farmerId,
      source,
      gatId,
      crop,
      location,
      image,
      status: 'PENDING_VALIDATION',
    });

    // Run Validation Engine synchronously for WEB client
    const validatedSubmission = await validateSubmission(submission._id);

    return successResponse(res, 'Submission created', validatedSubmission, 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Submission already exists', 'DUPLICATE_SUBMISSION', 409);
    }
    throw error;
  }
};

const getSubmission = async (req, res) => {
  const { id } = req.params;
  const submission = await Submission.findById(id).populate('validationResultId');
  if (!submission) {
    return errorResponse(res, 'Submission not found', 'SUBMISSION_NOT_FOUND', 404);
  }
  return successResponse(res, 'Submission fetched successfully', submission);
};

module.exports = {
  createSubmission,
  getSubmission,
};
