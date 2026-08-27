const { successResponse, errorResponse } = require('../utils/response');
const Farmer = require('../models/Farmer');

const createFarmer = async (req, res) => {
  try {
    const { name, phoneNumber, preferredLanguage, associatedGats } = req.body;
    let farmer = await Farmer.findOne({ phoneNumber });
    if (farmer) {
      farmer.name = name || farmer.name;
      farmer.preferredLanguage = preferredLanguage || farmer.preferredLanguage;
      farmer.associatedGats = associatedGats || farmer.associatedGats;
      await farmer.save();
      return successResponse(res, 'Farmer updated', farmer);
    }

    farmer = await Farmer.create({ name, phoneNumber, preferredLanguage, associatedGats });
    return successResponse(res, 'Farmer created', farmer, 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Farmer already exists', 'DUPLICATE_ERROR', 409);
    }
    throw error;
  }
};

const getMe = async (req, res) => {
  const farmerId = req.user?.farmerId;

  if (!farmerId) {
    return errorResponse(res, 'Not authorized, no farmerId in token', 'UNAUTHORIZED', 401);
  }

  const farmer = await Farmer.findById(farmerId);
  if (!farmer) {
    return errorResponse(res, 'Farmer not registered', 'FARMER_NOT_REGISTERED', 404);
  }

  if (!farmer.associatedGats || farmer.associatedGats.length === 0) {
    return errorResponse(res, 'Farmer Gat not configured', 'FARMER_GAT_NOT_CONFIGURED', 400);
  }

  await farmer.populate('associatedGats');

  // Filter out any populated Gats that might be null (if they were deleted)
  farmer.associatedGats = farmer.associatedGats.filter(gat => gat != null);

  if (farmer.associatedGats.length === 0) {
    return errorResponse(res, 'Associated Gats not found or deleted', 'GAT_NOT_FOUND', 404);
  }

  return successResponse(res, 'Farmer fetched successfully', farmer);
};

const getFarmer = async (req, res) => {
  const { id } = req.params;
  const farmer = await Farmer.findById(id).populate('associatedGats');
  if (!farmer) {
    return errorResponse(res, 'Farmer not found', 'FARMER_NOT_FOUND', 404);
  }
  return successResponse(res, 'Farmer fetched successfully', farmer);
};

const FieldPlanting = require('../models/FieldPlanting');
const Submission = require('../models/Submission');

const createPlanting = async (req, res) => {
  try {
    const farmerId = req.user?.farmerId;
    const { gatId, plantingType, count, approximateLocation } = req.body;

    if (!farmerId) {
      return errorResponse(res, 'Not authorized', 'UNAUTHORIZED', 401);
    }
    if (!gatId || !plantingType) {
      return errorResponse(res, 'Missing gatId or plantingType', 'VALIDATION_ERROR', 400);
    }

    const planting = await FieldPlanting.create({
      farmerId,
      gatId,
      plantingType,
      count: count ? Number(count) : undefined,
      approximateLocation,
      source: 'WEB',
    });

    return successResponse(res, 'Planting registered successfully', planting, 201);
  } catch (error) {
    throw error;
  }
};

const getPlantings = async (req, res) => {
  try {
    const farmerId = req.user?.farmerId;
    const { gatId } = req.query;

    const query = { farmerId };
    if (gatId) query.gatId = gatId;

    const plantings = await FieldPlanting.find(query).sort({ createdAt: -1 });
    return successResponse(res, 'Plantings fetched successfully', plantings);
  } catch (error) {
    throw error;
  }
};

const getGatHistory = async (req, res) => {
  try {
    const farmerId = req.user?.farmerId;
    const { gatId } = req.params;

    if (!farmerId) {
      return errorResponse(res, 'Not authorized', 'UNAUTHORIZED', 401);
    }

    const submissions = await Submission.find({ farmerId, gatId })
      .populate('validationResultId')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Gat submission history fetched', submissions);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createFarmer,
  getFarmer,
  getMe,
  createPlanting,
  getPlantings,
  getGatHistory,
};
