const mongoose = require('mongoose');
const env = require('../src/config/env');
const SchemeDeadline = require('../src/models/SchemeDeadline');

/**
 * Seeds a sample/demo E-Peek Pahani filing deadline for the Kharif season.
 *
 * SAMPLE DATA — the dates below are chosen so the reminder job has something due
 * today no matter when the demo is run. A production deployment would receive
 * real season windows from the Agriculture Department; that integration requires
 * a state MoU, the same as the Bhulekh / 7-12 land-record feeds.
 */
const DEMO_DEADLINE = {
  season: 'KHARIF',
  district: 'Nashik',
  reminderOffsetsDays: [14, 7, 3, 1],
  notes: 'Sample/demo deadline seeded for the hackathon walkthrough. Not an official date.',
};

// Deadline five days out puts us inside the 7-day reminder bucket.
const DAYS_UNTIL_DEADLINE = 5;
// Season opened 60 days ago, so a submission made "this season" counts as filed.
const DAYS_SINCE_SEASON_START = 60;

function buildDates(now = new Date()) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return {
    seasonStart: new Date(now.getTime() - DAYS_SINCE_SEASON_START * MS_PER_DAY),
    deadlineDate: new Date(now.getTime() + DAYS_UNTIL_DEADLINE * MS_PER_DAY),
    year: now.getUTCFullYear(),
  };
}

async function seed(skipConnect = false) {
  try {
    if (!skipConnect) {
      await mongoose.connect(env.mongoUri);
      console.log('Connected to DB');
    }

    const { seasonStart, deadlineDate, year } = buildDates();

    const deadline = await SchemeDeadline.findOneAndUpdate(
      { season: DEMO_DEADLINE.season, year, district: DEMO_DEADLINE.district },
      { $set: { ...DEMO_DEADLINE, year, seasonStart, deadlineDate, isActive: true } },
      { upsert: true, new: true }
    );

    console.log(`Seeded ${deadline.season} ${deadline.year} deadline for ${deadline.district}`);
    console.log(`  Season start:  ${deadline.seasonStart.toISOString()}`);
    console.log(`  Deadline:      ${deadline.deadlineDate.toISOString()} (${DAYS_UNTIL_DEADLINE} days out)`);
    console.log(`  Reminders at:  ${deadline.reminderOffsetsDays.join(', ')} days before`);
    console.log('Done!');

    return deadline;
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    if (!skipConnect) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed, DEMO_DEADLINE, DAYS_UNTIL_DEADLINE, DAYS_SINCE_SEASON_START, buildDates };
