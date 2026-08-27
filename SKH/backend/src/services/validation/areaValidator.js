const {
  AREA_REASON_CODES,
  AREA_TOLERANCE_HECTARES,
} = require('./constants');

/**
 * Does the area claimed on this Gat this season still fit inside the parcel?
 *
 * A farmer can file several crop entries against one Gat in one season — a
 * legitimate thing to do, since parcels get split between crops. What is not
 * legitimate is the entries adding up to more land than the parcel has. The real
 * government app does not check this, which is why a farmer can register the same
 * hectare twice under two crops and have both auto-approve.
 *
 * This is a routing rule, not an accusation. An over-sum has innocent
 * explanations — a stale registered area on the record, an earlier entry that
 * should have been withdrawn, a farmer who entered गुंठे thinking they were
 * entering एकर — so it sends the filing to a person and says why. It never
 * rejects: the arithmetic is certain, but what the arithmetic means is not.
 *
 * Pure, like the other validators here: the caller supplies the figures, this
 * decides. The sum itself is queried in ./areaAllocation.js.
 *
 * @param {Object} input
 * @param {number} [input.entryArea] - hectares claimed by the submission under test.
 * @param {number} [input.otherActiveArea] - hectares already claimed by other
 *   active entries on the same Gat, same season, same crop year.
 * @param {number} [input.registeredArea] - the Gat's total registered area.
 * @returns {Object} status PASS | REVIEW | SKIPPED, with the figures it used.
 */
const validateArea = ({ entryArea, otherActiveArea = 0, registeredArea } = {}) => {
  const hasEntry = typeof entryArea === 'number' && Number.isFinite(entryArea) && entryArea > 0;
  const hasRegistered = typeof registeredArea === 'number'
    && Number.isFinite(registeredArea) && registeredArea > 0;

  // Nothing to measure. Reported as SKIPPED rather than PASS so a submission that
  // was never area-checked cannot be mistaken for one that passed the check —
  // every pre-Phase-7 submission and every Gat seeded without a registered area
  // lands here.
  if (!hasEntry || !hasRegistered) {
    return {
      status: 'SKIPPED',
      entryArea: hasEntry ? entryArea : null,
      otherActiveArea,
      registeredArea: hasRegistered ? registeredArea : null,
      reason: hasEntry
        ? 'Gat has no registered area on record, so the area check was not run'
        : 'Submission carries no registered area, so the area check was not run',
    };
  }

  const claimedTotal = entryArea + otherActiveArea;
  const remaining = registeredArea - otherActiveArea;

  if (claimedTotal > registeredArea + AREA_TOLERANCE_HECTARES) {
    return {
      status: 'REVIEW',
      entryArea,
      otherActiveArea,
      registeredArea,
      claimedTotal,
      remainingArea: remaining > 0 ? remaining : 0,
      reasonCode: AREA_REASON_CODES.AREA_OVERALLOCATION,
      reason: `Crop entries for this Gat this season total ${claimedTotal.toFixed(4)} ha, `
        + `which is more than its registered area of ${registeredArea.toFixed(4)} ha`,
    };
  }

  return {
    status: 'PASS',
    entryArea,
    otherActiveArea,
    registeredArea,
    claimedTotal,
    remainingArea: registeredArea - claimedTotal,
  };
};

module.exports = { validateArea };
