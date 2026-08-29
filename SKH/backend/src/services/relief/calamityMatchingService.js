const booleanIntersects = require('@turf/boolean-intersects').default;
const { polygon } = require('@turf/helpers');

const Gat = require('../../models/Gat');
const Farmer = require('../../models/Farmer');
const Submission = require('../../models/Submission');
const CalamityZone = require('../../models/CalamityZone');
const CalamityMatch = require('../../models/CalamityMatch');
const { getMessage } = require('../whatsapp/messages');
const { dispatchNotification, formatDeadlineDate: formatDate } = require('../notifications/awarenessService');
const { NOTIFICATION_TYPES } = require('../notifications/constants');
const { MATCHABLE_SUBMISSION_STATUSES, SKIP_REASONS } = require('./constants');

/**
 * Does this Gat's parcel overlap the declared calamity zone?
 *
 * Uses the same Turf.js geometry the validation engine trusts for geofencing, so
 * "is this field in the zone" is answered by the same kind of deterministic
 * polygon test as "was this photo taken in this field" — not a heuristic.
 *
 * booleanIntersects (rather than booleanWithin) is the right test: a parcel on
 * the edge of a flood zone is partially affected and still belongs in front of
 * an officer. Bad geometry returns false rather than throwing, matching
 * locationValidator's behaviour.
 */
function gatIntersectsZone(gatBoundary, zoneBoundary) {
  if (!gatBoundary?.coordinates || !zoneBoundary?.coordinates) return false;

  try {
    return booleanIntersects(
      polygon(gatBoundary.coordinates),
      polygon(zoneBoundary.coordinates)
    );
  } catch {
    return false;
  }
}

/**
 * Is the declared crop in scope for this declaration?
 *
 * An empty affectedCropTypes means the declaration did not single out crops, so
 * everything inside the zone is in scope. Comparison is case-insensitive because
 * declared crop text arrives from free-form WhatsApp replies.
 */
function isCropAffected(declaredCrop, affectedCropTypes) {
  if (!affectedCropTypes || affectedCropTypes.length === 0) return true;
  if (!declaredCrop) return false;

  const needle = declaredCrop.trim().toLowerCase();
  return affectedCropTypes.some((crop) => crop.trim().toLowerCase() === needle);
}

/** Human-readable calamity name in the farmer's language. */
function calamityLabel(calamityType, language) {
  return getMessage(`CALAMITY_${calamityType}`, language);
}

/** Builds the relief-match message in the farmer's preferred language. */
function buildReliefBody({ zone, submission, gat, language }) {
  return getMessage('CALAMITY_RELIEF_MATCH', language, {
    calamity: calamityLabel(zone.calamityType, language),
    gat: gat?.gatNumber || '—',
    declaredDate: formatDate(zone.declaredDate),
    crop: submission.crop?.declaredCrop || '—',
    date: formatDate(submission.createdAt),
  });
}

/**
 * Every VALID submission that this zone covers, with the near-misses explained.
 *
 * Geometry is evaluated in Turf over every Gat rather than through a
 * $geoIntersects query so the rule is identical to the validation engine's and
 * stays unit-testable without a geo index. At state scale the existing 2dsphere
 * index on Gat.boundary would pre-filter candidates before this test.
 *
 * @returns {Promise<{matches: Array, skipped: Array, gatsInZone: number, candidates: number}>}
 */
async function findMatchingSubmissions(zone) {
  const skipped = [];

  const gats = await Gat.find({});
  const gatsInZone = gats.filter((gat) => {
    if (!gat.boundary?.coordinates) {
      skipped.push({ gatId: gat._id.toString(), reason: SKIP_REASONS.GAT_MISSING_BOUNDARY });
      return false;
    }
    return gatIntersectsZone(gat.boundary, zone.boundary);
  });

  if (gatsInZone.length === 0) {
    return { matches: [], skipped, gatsInZone: 0, candidates: 0 };
  }

  const gatById = new Map(gatsInZone.map((gat) => [gat._id.toString(), gat]));

  // Only verified filings, and only those that already existed when the calamity
  // was declared. A record created after the declaration cannot be evidence of
  // what was standing in the field at the time.
  const candidates = await Submission.find({
    gatId: { $in: gatsInZone.map((gat) => gat._id) },
    status: { $in: MATCHABLE_SUBMISSION_STATUSES },
  });

  const matches = [];

  for (const submission of candidates) {
    if (submission.createdAt > zone.declaredDate) {
      skipped.push({
        submissionId: submission._id.toString(),
        reason: SKIP_REASONS.FILED_AFTER_DECLARATION,
      });
      continue;
    }

    if (!isCropAffected(submission.crop?.declaredCrop, zone.affectedCropTypes)) {
      skipped.push({
        submissionId: submission._id.toString(),
        reason: SKIP_REASONS.CROP_NOT_AFFECTED,
      });
      continue;
    }

    matches.push({ submission, gat: gatById.get(submission.gatId.toString()) });
  }

  return { matches, skipped, gatsInZone: gatsInZone.length, candidates: candidates.length };
}

/**
 * Matches one zone, persists the matches and tells the affected farmers.
 *
 * Safe to re-run: CalamityMatch is unique on (submission, zone) and
 * dispatchNotification de-duplicates on the same pair, so a second pass creates
 * nothing and sends nothing.
 */
async function processZone(zone, { notify = true } = {}) {
  const { matches, skipped, gatsInZone, candidates } = await findMatchingSubmissions(zone);

  const detail = {
    zoneId: zone._id.toString(),
    name: zone.name,
    calamityType: zone.calamityType,
    gatsInZone,
    candidates,
    matched: matches.length,
    created: 0,
    existing: 0,
    notified: 0,
    notificationsSkipped: 0,
    notificationsFailed: 0,
    skipped: skipped.reduce((acc, item) => {
      acc[item.reason] = (acc[item.reason] || 0) + 1;
      return acc;
    }, {}),
  };

  for (const { submission, gat } of matches) {
    const existing = await CalamityMatch.findOne({
      submissionId: submission._id,
      calamityZoneId: zone._id,
    });

    if (existing) {
      detail.existing += 1;
    } else {
      detail.created += 1;
    }

    const farmer = await Farmer.findById(submission.farmerId);
    let farmerNotified = existing?.farmerNotified || false;

    if (notify && farmer) {
      const language = farmer.preferredLanguage || 'mr';
      const result = await dispatchNotification({
        phoneNumber: farmer.phoneNumber,
        farmerId: farmer._id,
        type: NOTIFICATION_TYPES.CALAMITY_RELIEF,
        dedupeKey: `${zone._id.toString()}:${submission._id.toString()}`,
        language,
        body: buildReliefBody({ zone, submission, gat, language }),
      });

      if (result.status === 'SENT') {
        detail.notified += 1;
        farmerNotified = true;
      } else if (result.status === 'FAILED') {
        detail.notificationsFailed += 1;
      } else {
        detail.notificationsSkipped += 1;
        // An ALREADY_SENT skip still means the farmer knows.
        if (result.reason === 'ALREADY_SENT') farmerNotified = true;
      }
    }

    await CalamityMatch.findOneAndUpdate(
      { submissionId: submission._id, calamityZoneId: zone._id },
      {
        $set: {
          farmerId: submission.farmerId,
          gatId: submission.gatId,
          declaredCrop: submission.crop?.declaredCrop,
          farmerNotified,
        },
        $setOnInsert: { matchedAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' }
    );
  }

  return detail;
}

/**
 * Matches every active calamity declaration against verified filings.
 *
 * @param {Object} [options]
 * @param {string} [options.zoneId] restrict to one declaration
 * @param {boolean} [options.notify=true] set false to compute matches silently
 * @returns {Promise<Object>} counts plus a per-zone breakdown
 */
async function runCalamityMatching({ zoneId = null, notify = true } = {}) {
  const summary = {
    zonesProcessed: 0,
    matchesCreated: 0,
    matchesExisting: 0,
    notificationsSent: 0,
    notificationsSkipped: 0,
    notificationsFailed: 0,
    zones: [],
  };

  const query = { isActive: true };
  if (zoneId) query._id = zoneId;

  const zones = await CalamityZone.find(query).sort({ declaredDate: -1 });

  for (const zone of zones) {
    const detail = await processZone(zone, { notify });

    summary.zonesProcessed += 1;
    summary.matchesCreated += detail.created;
    summary.matchesExisting += detail.existing;
    summary.notificationsSent += detail.notified;
    summary.notificationsSkipped += detail.notificationsSkipped;
    summary.notificationsFailed += detail.notificationsFailed;
    summary.zones.push(detail);
  }

  return summary;
}

/**
 * Relief matches for a page of submissions, keyed by submission id.
 *
 * Used by the Officer Dashboard to badge rows without an extra request per row.
 */
async function getMatchesForSubmissions(submissionIds) {
  if (!submissionIds || submissionIds.length === 0) return {};

  const matches = await CalamityMatch.find({ submissionId: { $in: submissionIds } })
    .populate('calamityZoneId', 'name calamityType declaredDate district');

  return matches.reduce((acc, match) => {
    const key = match.submissionId.toString();
    if (!acc[key]) acc[key] = [];

    acc[key].push({
      matchId: match._id,
      calamityZone: match.calamityZoneId,
      matchedAt: match.matchedAt,
      farmerNotified: match.farmerNotified,
    });

    return acc;
  }, {});
}

module.exports = {
  runCalamityMatching,
  processZone,
  findMatchingSubmissions,
  getMatchesForSubmissions,
  gatIntersectsZone,
  isCropAffected,
  buildReliefBody,
  calamityLabel,
};
