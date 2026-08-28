const Gat = require('../../models/Gat');
const Farmer = require('../../models/Farmer');
const Submission = require('../../models/Submission');
const CalamityZone = require('../../models/CalamityZone');
const { validateSubmission } = require('../validation/validationService');
const { runCalamityMatching } = require('../relief/calamityMatchingService');
const { runEscalation } = require('../notifications/escalationService');
const { NOTIFICATION_TYPES } = require('../notifications/constants');
const { cropYear } = require('../survey/constants');

/**
 * Calculates planar area in hectares for a GeoJSON ring [[lng, lat], ...]
 */
function calculatePolygonAreaHectares(ring) {
  if (!ring || ring.length < 3) return 1.0;
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += (ring[i][0] * ring[i + 1][1]) - (ring[i + 1][0] * ring[i][1]);
  }
  const avgLat = (ring[0][1] * Math.PI) / 180;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(avgLat);
  const sqMeters = Math.abs(area / 2) * metersPerDegreeLat * metersPerDegreeLng;
  const hectares = sqMeters / 10000;
  return Number(Math.max(hectares, 0.1).toFixed(4));
}

/**
 * Calculates center { latitude, longitude } for a GeoJSON ring
 */
function calculatePolygonCenter(ring) {
  const vertices = ring.slice(0, -1);
  if (vertices.length === 0) return { latitude: ring[0][1], longitude: ring[0][0] };
  const sumLng = vertices.reduce((sum, pt) => sum + pt[0], 0);
  const sumLat = vertices.reduce((sum, pt) => sum + pt[1], 0);
  return {
    latitude: sumLat / vertices.length,
    longitude: sumLng / vertices.length
  };
}

/**
 * Normalizes input coordinates into a GeoJSON Polygon ring [[ [lng, lat], ... ]]
 */
function normalizeCoordinates(coords) {
  if (!coords || !Array.isArray(coords) || coords.length < 3) {
    throw new Error('Polygon must contain at least 3 points');
  }

  let ring = coords;
  // If wrapped in outer array [[ [p1], [p2], ... ]]
  if (Array.isArray(ring[0]) && Array.isArray(ring[0][0])) {
    ring = ring[0];
  }

  // Detect whether points are [lat, lng] or [lng, lat]
  // Standard India coordinates: Lat ~ 8-37, Lng ~ 68-97
  const normalizedRing = ring.map(pt => {
    if (typeof pt.lat === 'number' && typeof pt.lng === 'number') {
      return [pt.lng, pt.lat];
    }
    if (Array.isArray(pt)) {
      const [a, b] = pt;
      // If first coordinate is in lat range (~19) and second in lng range (~74), swap to [lng, lat]
      if (a < 40 && b > 60) {
        return [b, a]; // Convert [lat, lng] -> [lng, lat]
      }
      return [a, b]; // Already [lng, lat]
    }
    throw new Error('Invalid coordinate point format');
  });

  // Ensure ring is closed
  const first = normalizedRing[0];
  const last = normalizedRing[normalizedRing.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    normalizedRing.push([first[0], first[1]]);
  }

  return [normalizedRing];
}

/**
 * Seed or register a new Gat boundary
 */
async function seedNewGat({
  gatNumber,
  village = 'Demo Village',
  district = 'Nashik',
  coordinates,
  registeredArea = null,
  cropTypes = ['soybean', 'cotton', 'wheat', 'sugarcane'],
  farmerPhoneNumber = '1234567890'
}) {
  const finalGatNumber = gatNumber || `DEMO-${Date.now().toString().slice(-4)}`;
  const polyCoords = normalizeCoordinates(coordinates);
  const ring = polyCoords[0];

  const calculatedAreaHectares = calculatePolygonAreaHectares(ring);
  const center = calculatePolygonCenter(ring);

  const gatData = {
    gatNumber: finalGatNumber,
    village,
    district,
    cropTypes,
    registeredArea: typeof registeredArea === 'number' && registeredArea > 0 ? registeredArea : calculatedAreaHectares,
    boundary: {
      type: 'Polygon',
      coordinates: polyCoords
    },
    center: {
      latitude: center.latitude,
      longitude: center.longitude
    }
  };

  const gat = await Gat.findOneAndUpdate(
    { gatNumber: finalGatNumber },
    { $set: gatData },
    { upsert: true, new: true }
  );

  let farmer = await Farmer.findOne({ phoneNumber: farmerPhoneNumber });
  if (!farmer) {
    farmer = await Farmer.create({
      name: 'Demo Farmer',
      phoneNumber: farmerPhoneNumber,
      preferredLanguage: 'mr',
      associatedGats: [gat._id]
    });
  } else if (!farmer.associatedGats.some(gId => gId.toString() === gat._id.toString())) {
    farmer.associatedGats.push(gat._id);
    await farmer.save();
  }

  return { gat, farmer };
}

/**
 * Helper to ensure a demo farmer and demo Gats exist
 */
async function getDemoContext() {
  let farmer = await Farmer.findOne({ phoneNumber: '1234567890' }).populate('associatedGats');
  let gats = await Gat.find({});

  if (!farmer || gats.length === 0) {
    const { seed } = require('../../../scripts/seedDemoGats');
    await seed(true);
    farmer = await Farmer.findOne({ phoneNumber: '1234567890' }).populate('associatedGats');
    gats = await Gat.find({});
  }

  return { farmer, gats };
}

/**
 * Trigger a pipeline submission for various demo scenarios
 */
async function triggerSubmissionScenario({ scenario = 'VALID', gatId = null, crop = null, area = null }) {
  const { farmer, gats } = await getDemoContext();

  let targetGat = gatId ? gats.find(g => g._id.toString() === gatId.toString()) : null;
  if (!targetGat) {
    targetGat = scenario === 'REVIEW_BOUNDARY_EDGE'
      ? (gats.find(g => g.gatNumber === '106') || gats[0])
      : gats[0];
  }

  const baseImage = {
    url: 'file:///tmp/mock-soybean.jpg',
    mimeType: 'image/jpeg',
    size: 25000,
    capturedAt: new Date(),
    metadata: { exifPresent: true, gpsPresent: true, source: 'CAMERA' }
  };

  let location;
  let declaredCrop = crop || 'soybean';
  let registeredArea = area || 0.5;
  let season = 'KHARIF';

  switch (scenario) {
    case 'VALID':
      // Center of target Gat, matching crop, proper area
      location = {
        latitude: targetGat.center.latitude,
        longitude: targetGat.center.longitude,
        source: 'WEB_GPS',
        receivedAt: new Date(),
        accuracy: 5
      };
      declaredCrop = 'soybean';
      registeredArea = Math.min(targetGat.registeredArea || 1.0, 0.8);
      break;

    case 'REVIEW_BOUNDARY_EDGE':
      // Deliberately placed near the boundary edge (< 15m)
      // Gat 106 has offset 0.00045 (~45m from center). Offset by 0.00041 puts it ~4m inside edge.
      location = {
        latitude: targetGat.center.latitude,
        longitude: targetGat.center.longitude - 0.00041,
        source: 'WEB_GPS',
        receivedAt: new Date(),
        accuracy: 4
      };
      declaredCrop = 'soybean';
      registeredArea = 0.5;
      break;

    case 'REVIEW_AREA_OVERALLOCATION':
      // Area that vastly exceeds Gat registered area
      location = {
        latitude: targetGat.center.latitude,
        longitude: targetGat.center.longitude,
        source: 'WEB_GPS',
        receivedAt: new Date(),
        accuracy: 5
      };
      declaredCrop = 'soybean';
      registeredArea = (targetGat.registeredArea || 1.0) + 15.0; // 15ha over
      break;

    case 'REJECTED_CROP_MISMATCH':
      // Declared crop is cotton while vision AI classifies as soybean
      location = {
        latitude: targetGat.center.latitude,
        longitude: targetGat.center.longitude,
        source: 'WEB_GPS',
        receivedAt: new Date(),
        accuracy: 5
      };
      declaredCrop = 'cotton'; // Mismatch!
      registeredArea = 0.5;
      break;

    case 'CALAMITY_MATCH': {
      // Create a valid submission in a Gat overlapping a CalamityZone
      const { seed: seedCalamity } = require('../../../scripts/seedCalamityZone');
      await seedCalamity(true);

      const rainfallZone = await CalamityZone.findOne({ calamityType: 'EXCESS_RAINFALL', isActive: true });
      const matchingGat = gats.find(g => g.gatNumber === '101') || gats[0];

      location = {
        latitude: matchingGat.center.latitude,
        longitude: matchingGat.center.longitude,
        source: 'WEB_GPS',
        receivedAt: new Date(),
        accuracy: 5
      };
      targetGat = matchingGat;
      declaredCrop = 'soybean';
      registeredArea = 0.5;

      const sub = await Submission.create({
        clientSubmissionId: `demo-calamity-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        farmerId: farmer._id,
        source: 'WEB',
        gatId: matchingGat._id,
        season: 'KHARIF',
        cropYear: cropYear(new Date()),
        peekType: 'SINGLE',
        registeredArea,
        waterSource: 'WELL',
        sowingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        crop: {
          declaredCrop,
          cropCategory: 'OILSEED',
          matchMethod: 'EXACT',
          matchConfidence: 1.0
        },
        location,
        image: baseImage,
        status: 'PENDING_VALIDATION',
        createdAt: rainfallZone ? new Date(rainfallZone.declaredDate.getTime() - 24 * 60 * 60 * 1000) : new Date()
      });

      const validated = await validateSubmission(sub._id);
      const calamityResult = await runCalamityMatching();

      return {
        scenario,
        submission: validated,
        calamityMatch: calamityResult
      };
    }

    default:
      throw new Error(`Unknown scenario: ${scenario}`);
  }

  const clientSubmissionId = `demo-${scenario.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const submission = await Submission.create({
    clientSubmissionId,
    farmerId: farmer._id,
    source: 'WEB',
    gatId: targetGat._id,
    season,
    cropYear: cropYear(new Date()),
    peekType: 'SINGLE',
    registeredArea,
    waterSource: 'WELL',
    sowingDate: new Date(),
    crop: {
      declaredCrop,
      cropCategory: 'OILSEED',
      matchMethod: 'EXACT',
      matchConfidence: 1.0
    },
    location,
    image: baseImage,
    status: 'PENDING_VALIDATION'
  });

  const validatedSubmission = await validateSubmission(submission._id);
  return {
    scenario,
    submission: validatedSubmission
  };
}

const { runEscalation, sendOnChannel } = require('../notifications/escalationService');

/**
 * Trigger multi-channel escalation directly
 */
async function triggerEscalationDemo({
  phoneNumber = '1234567890',
  channel = 'SMS',
  type = NOTIFICATION_TYPES.DEADLINE_REMINDER,
  language = 'mr'
}) {
  const { farmer } = await getDemoContext();
  const dedupeKey = `demo-escalate-${Date.now()}`;

  const bodies = {
    WHATSAPP: 'नमस्कार! ई-पीक पाहणी मुदत संपत आहे. कृपया त्वरित नोंदणी पूर्ण करा.',
    SMS: 'ई-पीक पाहणी: मुदत संपत आहे. नोंदणी करा.'
  };

  const targetChannel = channel || 'SMS';

  // Send directly on the requested fallback channel
  const result = await sendOnChannel({
    channel: targetChannel,
    phoneNumber: phoneNumber || farmer.phoneNumber || '1234567890',
    farmerId: farmer._id,
    type,
    dedupeKey,
    language,
    body: bodies[targetChannel] || bodies.SMS
  });

  return {
    action: result.status,
    channel: targetChannel,
    recipient: phoneNumber,
    log: result.log,
    reason: result.reason
  };
}

/**
 * Chaos button: Fires 6-10 varied submissions across outcomes
 */
async function triggerChaosMode() {
  const scenarios = [
    'VALID',
    'VALID',
    'REVIEW_BOUNDARY_EDGE',
    'REVIEW_AREA_OVERALLOCATION',
    'REJECTED_CROP_MISMATCH',
    'CALAMITY_MATCH'
  ];

  const results = [];
  for (const sc of scenarios) {
    try {
      const res = await triggerSubmissionScenario({ scenario: sc });
      results.push({ scenario: sc, status: res.submission?.status || 'COMPLETED' });
    } catch (err) {
      results.push({ scenario: sc, error: err.message });
    }
  }

  return {
    count: results.length,
    results
  };
}

module.exports = {
  seedNewGat,
  triggerSubmissionScenario,
  triggerEscalationDemo,
  triggerChaosMode,
  normalizeCoordinates
};
