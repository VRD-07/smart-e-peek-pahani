const { successResponse, errorResponse } = require('../utils/response');
const {
  seedNewGat,
  triggerSubmissionScenario,
  triggerEscalationDemo,
  triggerChaosMode
} = require('../services/demo/demoService');

const handleSeedGat = async (req, res) => {
  try {
    const { gatNumber, village, district, coordinates, registeredArea, cropTypes, farmerPhoneNumber } = req.body;
    if (!coordinates) {
      return errorResponse(res, 'Coordinates required for polygon creation', 'VALIDATION_ERROR', 400);
    }
    const result = await seedNewGat({
      gatNumber,
      village,
      district,
      coordinates,
      registeredArea,
      cropTypes,
      farmerPhoneNumber
    });
    return successResponse(res, 'New Gat registered and seeded successfully', result, 201);
  } catch (error) {
    return errorResponse(res, error.message, 'SEED_GAT_ERROR', 400);
  }
};

const handleTriggerSubmission = async (req, res) => {
  try {
    const { scenario, gatId, crop, area } = req.body;
    const result = await triggerSubmissionScenario({ scenario, gatId, crop, area });
    return successResponse(res, `Triggered ${scenario} submission scenario successfully`, result);
  } catch (error) {
    return errorResponse(res, error.message, 'TRIGGER_SUBMISSION_ERROR', 400);
  }
};

const handleTriggerEscalation = async (req, res) => {
  try {
    const { channel, phoneNumber, type, language } = req.body;
    const result = await triggerEscalationDemo({ channel, phoneNumber, type, language });
    return successResponse(res, `Triggered escalation up to ${channel || 'VOICE'}`, result);
  } catch (error) {
    return errorResponse(res, error.message, 'TRIGGER_ESCALATION_ERROR', 400);
  }
};

const handleChaos = async (req, res) => {
  try {
    const result = await triggerChaosMode();
    return successResponse(res, 'Chaos mode triggered: multiple randomized submissions generated', result);
  } catch (error) {
    return errorResponse(res, error.message, 'CHAOS_ERROR', 500);
  }
};

module.exports = {
  handleSeedGat,
  handleTriggerSubmission,
  handleTriggerEscalation,
  handleChaos
};
