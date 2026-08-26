const mongoose = require('mongoose');
const env = require('../src/config/env');
const { runCalamityMatching } = require('../src/services/relief/calamityMatchingService');
const { SKIP_REASONS } = require('../src/services/relief/constants');

const SKIP_LABELS = {
  [SKIP_REASONS.FILED_AFTER_DECLARATION]: 'filed after the declaration',
  [SKIP_REASONS.CROP_NOT_AFFECTED]: 'crop not named in the declaration',
  [SKIP_REASONS.GAT_OUTSIDE_ZONE]: 'field outside the zone',
  [SKIP_REASONS.GAT_MISSING_BOUNDARY]: 'field has no boundary on record',
};

/**
 * Matches active calamity declarations against verified filings once,
 * immediately. This is the demo entry point.
 *
 * Calamity matching is event-driven rather than scheduled: it runs when a
 * declaration is made, not on a daily timer like the awareness sweep.
 *
 * With NOTIFICATION_PROVIDER=mock (the default) the messages are printed to the
 * console and nothing leaves the machine. Set NOTIFICATION_PROVIDER=twilio with
 * WhatsApp *sandbox* credentials to send for real — note the recipient must have
 * joined the sandbox from their handset first. A production WhatsApp Business
 * sender additionally requires Meta business verification and approved message
 * templates, which is an external approval process.
 */
async function main() {
  await mongoose.connect(env.mongoUri);
  console.log(`Connected to DB. Notification provider: ${env.notificationProvider}\n`);

  try {
    const summary = await runCalamityMatching();

    console.log('--- Calamity relief matching summary ---');
    console.log(`Active declarations processed: ${summary.zonesProcessed}`);
    console.log(`New matches:                   ${summary.matchesCreated}`);
    console.log(`Already matched:               ${summary.matchesExisting}`);
    console.log(`Farmers notified:              ${summary.notificationsSent}`);
    console.log(`Notifications skipped:         ${summary.notificationsSkipped}`);
    console.log(`Notifications failed:          ${summary.notificationsFailed}`);

    for (const zone of summary.zones) {
      console.log(`\n  ${zone.name}`);
      console.log(
        `    ${zone.gatsInZone} field(s) inside the zone, ` +
        `${zone.candidates} verified filing(s) considered, ` +
        `${zone.matched} matched (${zone.created} new, ${zone.existing} existing), ` +
        `${zone.notified} notified`
      );

      // Near-misses are printed rather than dropped: a farmer left out of a
      // relief list deserves a reason an officer can read.
      const skipEntries = Object.entries(zone.skipped);
      for (const [reason, count] of skipEntries) {
        console.log(`    not matched — ${SKIP_LABELS[reason] || reason}: ${count}`);
      }
    }

    if (summary.zonesProcessed === 0) {
      console.log('\nNo active calamity declaration on record.');
      console.log('Seed one with: node scripts/seedCalamityZone.js');
    } else if (summary.matchesCreated === 0 && summary.matchesExisting === 0) {
      console.log('\nNo verified filing falls inside an active declaration.');
      console.log('File a submission (demo scenario 1), then re-run:');
      console.log('  node scripts/seedCalamityZone.js   # refreshes the declaration date');
      console.log('  node scripts/runCalamityMatching.js');
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Calamity matching failed:', error);
  process.exit(1);
});
