/**
 * Thresholds and reason codes for the deterministic validation checks.
 *
 * Every number here is a policy choice, not a tuned parameter. They are in one
 * file so an officer or auditor can read the whole policy without reading the
 * validators, and so changing a threshold is a visible, reviewable edit.
 */

// How close to a Gat's edge a submission has to be before it is sent to a human
// instead of auto-approved.
//
// Consumer phone GPS under an open sky is good to roughly 5-10m, worse under tree
// cover or cloud. At that scale a point a few metres inside a boundary and a
// point a few metres outside it are the same measurement. Auto-approving the
// first while rejecting the second pretends to a precision the hardware does not
// have. This does not detect anything — it declines to decide, and says so.
const DEFAULT_NEAR_BOUNDARY_METERS = 15;

// The review band is also capped at this fraction of the parcel's own size.
//
// A flat 15m band on a 27m-wide plot would put every honest filing under review,
// which is not caution — it is a broken check that an officer would learn to
// rubber-stamp. Small parcels get a proportionally smaller band, so the rule
// stays meaningful on smallholdings instead of firing on all of them.
const BOUNDARY_BUFFER_PARCEL_FRACTION = 0.5;

const LOCATION_REASON_CODES = {
  // Inside the polygon, but close enough to the edge that GPS error could
  // account for the difference.
  NEAR_BOUNDARY: 'NEAR_BOUNDARY',
};

const AREA_REASON_CODES = {
  // The crop entries claimed on this Gat for this season add up to more land than
  // the Gat is registered as having.
  AREA_OVERALLOCATION: 'AREA_OVERALLOCATION',
};

// Slack allowed on the area sum, in hectares.
//
// Areas arrive converted from गुंठे and एकर, so a farmer filing three entries that
// exactly fill a parcel can land a rounding step or two above it. One square metre
// is far below the precision of any figure on a land record and well above the
// float error the conversions introduce, so it absorbs the arithmetic without
// letting a real overclaim through.
const AREA_TOLERANCE_HECTARES = 0.0001;

// Which existing entries hold an area allocation against a Gat.
//
// REVIEW and PENDING_VALIDATION count. They are claimed, not approved, and an
// unresolved claim still occupies the parcel — letting a farmer stack entries
// behind one pending filing would defeat the check entirely. INVALID and DRAFT do
// not count: a rejected filing claims nothing, and a draft has not been filed.
const ACTIVE_ALLOCATION_STATUSES = [
  'PENDING_VALIDATION',
  'VALID',
  'REVIEW',
  'SYNC_PENDING',
  'SYNCED',
];

/**
 * The configured review band in metres, before the parcel-size cap.
 * Out-of-range or unparseable values fall back to the default rather than
 * silently disabling the check.
 */
function nearBoundaryThreshold() {
  const configured = Number.parseFloat(process.env.NEAR_BOUNDARY_THRESHOLD_METERS);
  return Number.isFinite(configured) && configured >= 0
    ? configured
    : DEFAULT_NEAR_BOUNDARY_METERS;
}

module.exports = {
  DEFAULT_NEAR_BOUNDARY_METERS,
  BOUNDARY_BUFFER_PARCEL_FRACTION,
  LOCATION_REASON_CODES,
  AREA_REASON_CODES,
  AREA_TOLERANCE_HECTARES,
  ACTIVE_ALLOCATION_STATUSES,
  nearBoundaryThreshold,
};
