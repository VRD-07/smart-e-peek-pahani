const mongoose = require('mongoose');

/**
 * A filing deadline for an E-Peek Pahani season.
 *
 * The window that counts as "the current season" is stored here rather than
 * derived in code, so the awareness job never has to guess at a crop calendar.
 * Seeded records are sample/demo data — a production deployment would receive
 * these dates from the Agriculture Department, which requires a state MoU.
 */
const schemeDeadlineSchema = new mongoose.Schema({
  season: {
    type: String,
    enum: ['KHARIF', 'RABI', 'SUMMER'],
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  // Submissions created on or after this date count as filed for this season.
  seasonStart: {
    type: Date,
    required: true,
  },
  // Last date on which a farmer can file for this season.
  deadlineDate: {
    type: Date,
    required: true,
  },
  // Days before the deadline on which a reminder should go out.
  // The job picks the tightest bucket that still covers today, so a day the
  // scheduler was offline is caught up on the next run instead of being lost.
  reminderOffsetsDays: {
    type: [Number],
    default: [14, 7, 3, 1],
  },
  // Optional scope. Null/absent means the deadline applies to every district.
  // Farmers are matched through their associated Gats, which carry the district.
  district: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
  },
}, {
  timestamps: true,
});

// One deadline per season per year per district scope.
schemeDeadlineSchema.index({ season: 1, year: 1, district: 1 }, { unique: true });
schemeDeadlineSchema.index({ isActive: 1, deadlineDate: 1 });

const SchemeDeadline = mongoose.model('SchemeDeadline', schemeDeadlineSchema);
module.exports = SchemeDeadline;
