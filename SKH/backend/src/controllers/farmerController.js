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

module.exports = {
  createFarmer,
  getFarmer,
  getMe,
};
