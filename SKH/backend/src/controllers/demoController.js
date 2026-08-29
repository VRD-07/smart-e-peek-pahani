const { successResponse, errorResponse } = require('../utils/response');
const {
  seedNewGat,
  triggerSubmissionScenario,
  triggerEscalationDemo,
  triggerChaosMode
} = require('../services/demo/demoService');

const {
  createSnapshot,
  listSnapshots,
  restoreFromSnapshot,
  simulateBlackout,
  checkSystemHealth
} = require('../services/resilience/backupService');

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
    return successResponse(res, result.message, result);
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

const handleSimulateBlackout = async (req, res) => {
  try {
    const result = await simulateBlackout();
    return successResponse(res, result.message, result);
  } catch (error) {
    return errorResponse(res, error.message, 'BLACKOUT_ERROR', 500);
  }
};

const handleRestoreSnapshot = async (req, res) => {
  try {
    const { filename } = req.body || {};
    const result = await restoreFromSnapshot(filename);
    return successResponse(res, 'Database restored successfully from snapshot', result);
  } catch (error) {
    return errorResponse(res, error.message, 'RESTORE_ERROR', 400);
  }
};

const handleCreateSnapshot = async (req, res) => {
  try {
    const result = await createSnapshot();
    return successResponse(res, 'Snapshot created successfully', result, 201);
  } catch (error) {
    return errorResponse(res, error.message, 'SNAPSHOT_ERROR', 500);
  }
};

const handleListSnapshots = async (req, res) => {
  try {
    const list = listSnapshots();
    return successResponse(res, 'Snapshots listed successfully', list);
  } catch (error) {
    return errorResponse(res, error.message, 'LIST_SNAPSHOTS_ERROR', 500);
  }
};

const handleCheckSystemHealth = async (req, res) => {
  try {
    const health = await checkSystemHealth();
    return res.status(200).json({
      success: true,
      ...health
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'error',
      healthy: false,
      reason: error.message
    });
  }
};

module.exports = {
  handleSeedGat,
  handleTriggerSubmission,
  handleTriggerEscalation,
  handleChaos,
  handleSimulateBlackout,
  handleRestoreSnapshot,
  handleCreateSnapshot,
  handleListSnapshots,
  handleCheckSystemHealth
};


