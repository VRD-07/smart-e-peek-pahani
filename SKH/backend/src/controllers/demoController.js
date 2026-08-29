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

const handleVerifyScheme = async (req, res) => {
  try {
    const { query, language } = req.body;
    if (!query) {
      return errorResponse(res, 'Query parameter is required', 'VALIDATION_ERROR', 400);
    }
    const { verifySchemeOrCalamity } = require('../services/verification/schemeVerificationService');
    const result = await verifySchemeOrCalamity(query, language || 'mr');
    return successResponse(res, 'Scheme/Calamity verification executed', result);
  } catch (error) {
    return errorResponse(res, error.message, 'VERIFY_SCHEME_ERROR', 500);
  }
};

const handleTriggerCoordinatedDuplicate = async (req, res) => {
  try {
    const { computePerceptualHash } = require('../services/image/perceptualHashService');
    const { runValidationEngine } = require('../services/validation/validationEngine');
    const Farmer = require('../models/Farmer');
    const Gat = require('../models/Gat');
    const Submission = require('../models/Submission');

    // 1. Ensure 2 Gats exist
    let gat1 = await Gat.findOne({ gatNumber: '101' });
    let gat2 = await Gat.findOne({ gatNumber: '102' });
    if (!gat1 || !gat2) {
      const gats = await Gat.find({}).limit(2);
      gat1 = gats[0] || (await Gat.create({
        gatNumber: '101',
        village: 'Murshatpur',
        district: 'Nashik',
        registeredArea: 2.5,
        boundary: { type: 'Polygon', coordinates: [[[74.49, 19.90], [74.50, 19.90], [74.50, 19.91], [74.49, 19.91], [74.49, 19.90]]] },
        center: { latitude: 19.905, longitude: 74.495 }
      }));
      gat2 = gats[1] || (await Gat.create({
        gatNumber: '102',
        village: 'Murshatpur',
        district: 'Nashik',
        registeredArea: 1.8,
        boundary: { type: 'Polygon', coordinates: [[[74.51, 19.90], [74.52, 19.90], [74.52, 19.91], [74.51, 19.91], [74.51, 19.90]]] },
        center: { latitude: 19.905, longitude: 74.515 }
      }));
    }

    // 2. Ensure 2 Farmers exist with different phone numbers
    let farmer1 = await Farmer.findOne({ phoneNumber: '+919876500001' });
    if (!farmer1) {
      farmer1 = await Farmer.create({
        name: 'Ramesh Patil',
        phoneNumber: '+919876500001',
        associatedGats: [gat1._id]
      });
    }

    let farmer2 = await Farmer.findOne({ phoneNumber: '+919876500002' });
    if (!farmer2) {
      farmer2 = await Farmer.create({
        name: 'Suresh Shinde',
        phoneNumber: '+919876500002',
        associatedGats: [gat2._id]
      });
    }

    // 3. Demo photo (deterministic crop photo sample)
    const samplePhotoUrl = 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=400';
    const samplePHash = await computePerceptualHash(samplePhotoUrl);

    // 4. Create First Legitimate Submission from Farmer 1
    const sub1 = await Submission.create({
      clientSubmissionId: `sub_legit_${Date.now()}`,
      farmerId: farmer1._id,
      gatId: gat1._id,
      source: 'WEB',
      season: 'KHARIF',
      cropYear: 2026,
      registeredArea: 1.5,
      crop: {
        declaredCrop: 'soybean',
        language: 'mr'
      },
      location: {
        latitude: gat1.center?.latitude || 19.905,
        longitude: gat1.center?.longitude || 74.495,
        source: 'WEB_GPS'
      },
      image: {
        url: samplePhotoUrl,
        mimeType: 'image/jpeg',
        size: 150000,
        perceptualHash: samplePHash,
        metadata: { exifPresent: true, gpsPresent: true }
      },
      status: 'PENDING_VALIDATION'
    });

    const val1 = await runValidationEngine(sub1, farmer1, gat1);

    // 5. Create Second Coordinated/Duplicate Submission from Farmer 2 on different Gat
    const sub2 = await Submission.create({
      clientSubmissionId: `sub_duplicate_${Date.now() + 1}`,
      farmerId: farmer2._id,
      gatId: gat2._id,
      source: 'WHATSAPP',
      season: 'KHARIF',
      cropYear: 2026,
      registeredArea: 1.2,
      crop: {
        declaredCrop: 'soybean',
        language: 'mr'
      },
      location: {
        latitude: gat2.center?.latitude || 19.905,
        longitude: gat2.center?.longitude || 74.515,
        source: 'WHATSAPP'
      },
      image: {
        url: samplePhotoUrl,
        mimeType: 'image/jpeg',
        size: 150000,
        perceptualHash: samplePHash,
        metadata: { exifPresent: true, gpsPresent: true }
      },
      status: 'PENDING_VALIDATION'
    });

    const val2 = await runValidationEngine(sub2, farmer2, gat2);

    return successResponse(res, 'Coordinated duplicate scenario triggered successfully', {
      originalSubmission: {
        id: sub1._id,
        farmer: farmer1.name,
        phone: farmer1.phoneNumber,
        gat: gat1.gatNumber,
        status: sub1.status
      },
      duplicateSubmission: {
        id: sub2._id,
        farmer: farmer2.name,
        phone: farmer2.phoneNumber,
        gat: gat2.gatNumber,
        status: sub2.status,
        reasonCode: val2.checks?.duplicate?.reasonCode,
        similarity: val2.checks?.duplicate?.similarity,
        matchedSubmissionId: val2.checks?.duplicate?.matchedSubmissionId,
        reasons: val2.reasons
      }
    }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 'COORDINATED_DUPLICATE_ERROR', 500);
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
  handleCheckSystemHealth,
  handleVerifyScheme,
  handleTriggerCoordinatedDuplicate
};


