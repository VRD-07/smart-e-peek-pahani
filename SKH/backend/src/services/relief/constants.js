const CALAMITY_TYPES = {
  FLOOD: 'FLOOD',
  DROUGHT: 'DROUGHT',
  HAILSTORM: 'HAILSTORM',
  CYCLONE: 'CYCLONE',
  UNSEASONAL_RAIN: 'UNSEASONAL_RAIN',
  OTHER: 'OTHER',
};

// Only a verified filing can be matched to a calamity zone.
//
// This is deliberately narrower than FILED_SUBMISSION_STATUSES, which decides
// who still needs a deadline reminder. Relief eligibility is a stronger claim
// than "something is on file": REVIEW is still awaiting a human decision,
// PENDING_VALIDATION has not been checked yet, and INVALID failed. Telling a
// farmer their unverified record may qualify them would be misleading, so only
// VALID submissions are considered.
const MATCHABLE_SUBMISSION_STATUSES = ['VALID'];

// Why a candidate submission was not matched. Surfaced in the runner summary so
// a rejected match is explainable rather than a silent omission.
const SKIP_REASONS = {
  FILED_AFTER_DECLARATION: 'FILED_AFTER_DECLARATION',
  CROP_NOT_AFFECTED: 'CROP_NOT_AFFECTED',
  GAT_OUTSIDE_ZONE: 'GAT_OUTSIDE_ZONE',
  GAT_MISSING_BOUNDARY: 'GAT_MISSING_BOUNDARY',
};

module.exports = {
  CALAMITY_TYPES,
  MATCHABLE_SUBMISSION_STATUSES,
  SKIP_REASONS,
};
