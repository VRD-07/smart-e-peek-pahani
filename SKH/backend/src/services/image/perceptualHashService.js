const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const Submission = require('../../models/Submission');
const Gat = require('../../models/Gat');
const Farmer = require('../../models/Farmer');

const DEFAULT_HAMMING_THRESHOLD = 10; // Hamming distance <= 10 (out of 64 bits = ~84.4%+ similarity)
const DEFAULT_LOOKBACK_HOURS = 72; // Last 72 hours

/**
 * Computes a 64-bit Difference Hash (dHash) for an image.
 * 1. Resizes image to 9x8 grayscale raw pixels.
 * 2. Compares each pixel with the adjacent pixel in its row.
 * 3. Produces a 64-bit binary sequence represented as a 16-character hex string.
 */
async function computePerceptualHash(imageInput) {
  if (!imageInput) return null;

  let buffer = null;

  try {
    if (Buffer.isBuffer(imageInput)) {
      buffer = imageInput;
    } else if (typeof imageInput === 'object' && imageInput.url) {
      return computePerceptualHash(imageInput.url);
    } else if (typeof imageInput === 'string' && imageInput.startsWith('data:')) {
      const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else if (typeof imageInput === 'string' && (imageInput.startsWith('http://') || imageInput.startsWith('https://'))) {
      const res = await axios.get(imageInput, { responseType: 'arraybuffer', timeout: 5000 });
      buffer = Buffer.from(res.data);
    } else if (typeof imageInput === 'string' && fs.existsSync(imageInput)) {
      buffer = fs.readFileSync(imageInput);
    } else if (typeof imageInput === 'string' && imageInput.length > 50) {
      // Raw base64 string
      buffer = Buffer.from(imageInput, 'base64');
    }

    if (!buffer) {
      // Fallback deterministic hash if buffer cannot be constructed
      return crypto.createHash('md5').update(String(imageInput)).digest('hex').substring(0, 16);
    }

    const rawPixels = await sharp(buffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    let binaryStr = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = rawPixels[row * 9 + col];
        const right = rawPixels[row * 9 + col + 1];
        binaryStr += left > right ? '1' : '0';
      }
    }

    // Convert 64-bit binary string to 16 hex characters
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = binaryStr.substring(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }
    return hex;
  } catch (err) {
    console.warn('[pHash] Warning computing perceptual hash:', err.message);
    const seed = buffer || Buffer.from(String(imageInput));
    return crypto.createHash('md5').update(seed).digest('hex').substring(0, 16);
  }
}

/**
 * Calculates the Hamming distance between two 16-character hex hashes (0 to 64 bits).
 * 0 = exact perceptual match.
 */
function calculateHammingDistance(hashA, hashB) {
  if (!hashA || !hashB || hashA.length !== hashB.length) return 64;
  let distance = 0;
  for (let i = 0; i < hashA.length; i++) {
    const vA = parseInt(hashA[i], 16);
    const vB = parseInt(hashB[i], 16);
    let xor = vA ^ vB;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

/**
 * Calculates normalized similarity (1.0 = identical, 0.0 = completely different).
 */
function calculateSimilarity(hashA, hashB) {
  const dist = calculateHammingDistance(hashA, hashB);
  return Number(((64 - dist) / 64).toFixed(4));
}

/**
 * Checks a perceptual hash against recent submissions (last 24-72 hours)
 * from different phone numbers or different Gats.
 */
async function checkDuplicatePhoto({
  perceptualHash,
  currentSubmissionId = null,
  farmerId = null,
  gatId = null,
  lookbackHours = DEFAULT_LOOKBACK_HOURS,
  hammingThreshold = DEFAULT_HAMMING_THRESHOLD
}) {
  if (!perceptualHash) {
    return { isDuplicate: false, status: 'SKIPPED', reason: 'No perceptual hash available' };
  }

  const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

  // Find recent submissions with a perceptual hash
  const query = {
    'image.perceptualHash': { $exists: true, $ne: null },
    createdAt: { $gte: cutoff }
  };

  if (currentSubmissionId) {
    query._id = { $ne: currentSubmissionId };
  }

  let recentSubmissions = [];
  try {
    const q = Submission.find(query);
    if (typeof q?.populate === 'function') {
      recentSubmissions = await q
        .populate('farmerId', 'name phoneNumber')
        .populate('gatId', 'gatNumber village district')
        .sort({ createdAt: -1 })
        .limit(100);
    } else {
      recentSubmissions = await q;
    }
  } catch (err) {
    recentSubmissions = [];
  }

  if (!Array.isArray(recentSubmissions)) recentSubmissions = [];

  let bestMatch = null;
  let minDistance = 64;

  for (const candidate of recentSubmissions) {
    const candidateHash = candidate.image?.perceptualHash;
    if (!candidateHash) continue;

    // Check if candidate is from a different farmer OR different Gat
    const isDifferentFarmer = farmerId ? String(candidate.farmerId?._id || candidate.farmerId) !== String(farmerId) : false;
    const isDifferentGat = gatId ? String(candidate.gatId?._id || candidate.gatId) !== String(gatId) : false;

    // If both farmer and Gat are identical, it might be a re-submission or re-attempt by the same farmer on the same parcel.
    // Coordinated submission detection flags near-identical photos across different farmers or different land parcels!
    if (!isDifferentFarmer && !isDifferentGat && farmerId && gatId) {
      continue;
    }

    const distance = calculateHammingDistance(perceptualHash, candidateHash);
    if (distance <= hammingThreshold && distance < minDistance) {
      minDistance = distance;
      bestMatch = candidate;
    }
  }

  if (bestMatch) {
    const similarity = calculateSimilarity(perceptualHash, bestMatch.image?.perceptualHash);
    const farmerPhone = bestMatch.farmerId?.phoneNumber || 'Unknown';
    const gatNum = bestMatch.gatId?.gatNumber || 'Unknown';
    const village = bestMatch.gatId?.village || '';

    return {
      isDuplicate: true,
      status: 'REVIEW',
      reasonCode: 'SUSPECTED_DUPLICATE',
      matchedSubmissionId: bestMatch._id,
      similarity,
      hammingDistance: minDistance,
      matchedFarmerPhone: farmerPhone,
      matchedGatNumber: gatNum,
      matchedVillage: village,
      reason: `Suspected duplicate crop photo (${(similarity * 100).toFixed(0)}% match) previously submitted on Gat ${gatNum}${village ? ` (${village})` : ''} by phone ${farmerPhone}`
    };
  }

  return {
    isDuplicate: false,
    status: 'PASS',
    perceptualHash
  };
}

module.exports = {
  computePerceptualHash,
  calculateHammingDistance,
  calculateSimilarity,
  checkDuplicatePhoto,
  DEFAULT_HAMMING_THRESHOLD,
  DEFAULT_LOOKBACK_HOURS
};
