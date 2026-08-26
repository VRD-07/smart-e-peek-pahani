const NOTIFICATION_TYPES = {
  // One-time "what is E-Peek Pahani and why it matters" message, sent the first
  // time an unknown number contacts the bot.
  AWARENESS_INTRO: 'AWARENESS_INTRO',
  // Filing-deadline nudge for a farmer with nothing on file this season.
  DEADLINE_REMINDER: 'DEADLINE_REMINDER',
  // Calamity zone overlaps the farmer's registered Gat (Phase 3).
  CALAMITY_RELIEF: 'CALAMITY_RELIEF',
};

const NOTIFICATION_STATUS = {
  SENT: 'SENT',
  FAILED: 'FAILED',
};

// Statuses that mean the farmer already has a filing on record for the season.
// DRAFT (never left the device) and INVALID (rejected, nothing counts as filed)
// are deliberately excluded — those are exactly the farmers who end up with no
// record when relief is assessed, so they still get a reminder.
const FILED_SUBMISSION_STATUSES = [
  'PENDING_VALIDATION',
  'VALID',
  'REVIEW',
  'SYNC_PENDING',
  'SYNCED',
];

const DEDUPE_KEYS = {
  FIRST_CONTACT: 'FIRST_CONTACT',
};

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUS,
  FILED_SUBMISSION_STATUSES,
  DEDUPE_KEYS,
};
