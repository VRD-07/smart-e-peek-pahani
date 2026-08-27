const Submission = require('../../models/Submission');
const { ACTIVE_ALLOCATION_STATUSES } = require('./constants');

/**
 * How much of a Gat is already claimed by other crop entries.
 *
 * The database half of the area overallocation check — ./areaValidator.js decides
 * what the numbers mean, this fetches them. Kept apart because every other
 * validator in this directory is pure and testable without a database, and the
 * area check should not be the one that quietly changes that.
 *
 * Scoped to one Gat, one season and one crop year: a Kharif entry does not
 * compete with a Rabi one for the same land, and last year's filings are spent.
 *
 * @param {Object} input
 * @param {ObjectId|string} input.gatId
 * @param {string} input.season
 * @param {number} input.cropYear
 * @param {ObjectId|string} [input.excludeSubmissionId] - the submission under
 *   test, which is already saved by the time validation runs and would otherwise
 *   be counted against itself.
 * @returns {Promise<number>} hectares already claimed.
 */
async function sumOtherActiveArea({ gatId, season, cropYear, excludeSubmissionId }) {
  if (!gatId || !season || typeof cropYear !== 'number') return 0;

  const query = {
    gatId,
    season,
    cropYear,
    status: { $in: ACTIVE_ALLOCATION_STATUSES },
    registeredArea: { $gt: 0 },
  };
  if (excludeSubmissionId) query._id = { $ne: excludeSubmissionId };

  const rows = await Submission.find(query).select('registeredArea').lean();
  return rows.reduce((total, row) => total + (row.registeredArea || 0), 0);
}

module.exports = { sumOtherActiveArea };
