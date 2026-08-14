const { successResponse, errorResponse } = require('../utils/response');
const Gat = require('../models/Gat');

const getGats = async (req, res) => {
  const gats = await Gat.find({}).select('-__v');
  return successResponse(res, 'Gats fetched successfully', gats);
};

const getGatById = async (req, res) => {
  const { id } = req.params;
  const gat = await Gat.findById(id).select('-__v');
  if (!gat) {
    return errorResponse(res, 'Gat not found', 'GAT_NOT_FOUND', 404);
  }
  return successResponse(res, 'Gat fetched successfully', gat);
};

module.exports = {
  getGats,
  getGatById,
};
