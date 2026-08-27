const mongoose = require('mongoose');
const env = require('../src/config/env');
const { runDeadlineReminders } = require('../src/services/notifications/awarenessService');

/**
 * Runs the deadline-reminder sweep once, immediately, instead of waiting for the
 * cron schedule. This is the demo entry point.
 *
 * One sweep advances each farmer at most one rung of the escalation ladder
 * (WhatsApp, then SMS, then a voice call), because the daily cron is what paces
 * it. To walk the whole ladder for one farmer now, use
 * `node scripts/runEscalation.js <phone>` instead.
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
    const summary = await runDeadlineReminders();

    console.log('--- Awareness sweep summary ---');
    console.log(`Deadlines due today: ${summary.deadlinesDue}`);
    console.log(`Reminders sent:      ${summary.remindersSent}`);
    console.log(`  via WhatsApp: ${summary.byChannel.WHATSAPP}`
      + `  via SMS: ${summary.byChannel.SMS}`
      + `  via voice call: ${summary.byChannel.VOICE}`);
    console.log(`Skipped (already reached / still inside its window): ${summary.skipped}`);
    console.log(`Failed:              ${summary.failed}`);
    console.log(`Unreached on every channel: ${summary.exhausted}`);

    for (const detail of summary.deadlines) {
      console.log(
        `\n  ${detail.season} ${detail.year} — ${detail.offsetDays}-day bucket: ` +
        `${detail.candidates} farmer(s) with nothing on file, ` +
        `${detail.sent} sent, ${detail.skipped} skipped, ${detail.failed} failed`
      );
    }

    if (summary.deadlinesDue === 0) {
      console.log('\nNo deadline falls inside a reminder window today.');
      console.log('Seed one with: node scripts/seedSchemeDeadline.js');
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Awareness sweep failed:', error);
  process.exit(1);
});
