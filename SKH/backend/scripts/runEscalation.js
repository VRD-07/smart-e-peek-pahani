const mongoose = require('mongoose');
const env = require('../src/config/env');
const { escalateForFarmer, reminderReachStats } = require('../src/services/notifications/awarenessService');
const { CHANNELS } = require('../src/services/notifications/constants');

/**
 * Walks the full escalation ladder for one farmer, now.
 *
 * The daily sweep advances one rung per day, which is correct in production and
 * useless in a demo. This runs the same service function the officer dashboard's
 * manual trigger and the Phase 8 demo panel call, with force=true, so all three
 * channels fire in sequence within seconds.
 *
 * Usage:
 *   node scripts/runEscalation.js 9990001111
 *   node scripts/runEscalation.js 9990001111 SMS     # stop after the SMS rung
 *
 * With NOTIFICATION_PROVIDER=mock nothing leaves the machine — the messages and
 * the TwiML for the call are printed. With NOTIFICATION_PROVIDER=twilio and
 * TWILIO_SMS_NUMBER / TWILIO_VOICE_NUMBER set, the SMS and the call are real, and
 * the recipient must be a number verified on the Twilio account.
 */
async function main() {
  const [phoneNumber, upToChannelArg] = process.argv.slice(2);

  if (!phoneNumber) {
    console.error('Usage: node scripts/runEscalation.js <phoneNumber> [WHATSAPP|SMS|VOICE]');
    process.exit(1);
  }

  const upToChannel = (upToChannelArg || CHANNELS.VOICE).toUpperCase();
  if (!Object.values(CHANNELS).includes(upToChannel)) {
    console.error(`Unknown channel '${upToChannelArg}'. Expected one of ${Object.values(CHANNELS).join(', ')}.`);
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri);
  console.log(`Connected to DB. Notification provider: ${env.notificationProvider}\n`);

  try {
    const result = await escalateForFarmer({ phoneNumber, upToChannel, force: true });

    if (result.error === 'FARMER_NOT_FOUND') {
      console.error(`No farmer registered with phone number '${phoneNumber}'.`);
      process.exit(1);
    }

    if (result.error === 'NO_ACTIVE_DEADLINE') {
      console.error('No active scheme deadline to remind about.');
      console.error('Seed one with: node scripts/seedDemoSchemeDeadlines.js');
      process.exit(1);
    }

    console.log(`--- Escalation for ${result.farmer.name} (${result.farmer.phoneNumber}) ---`);
    console.log(`Language: ${result.farmer.preferredLanguage}`);
    console.log(`Reminder: ${result.deadline.season} ${result.deadline.year}, `
      + `${result.deadline.offsetDays}-day bucket\n`);

    result.steps.forEach((step, i) => {
      const channel = step.channel ? ` on ${step.channel}` : '';
      const reason = step.reason ? ` (${step.reason})` : '';
      console.log(`  ${i + 1}. ${step.action}${channel}${reason}`);
    });

    console.log(`\nChannels attempted: ${result.channelsAttempted.join(' -> ') || 'none'}`);
    console.log(`Confirmed reached via: ${result.reachedVia || 'not confirmed on any channel'}`);

    const stats = await reminderReachStats();
    console.log('\n--- Current reminder cycle, as the dashboard sees it ---');
    console.log(`Farmers in cycle: ${stats.total}`);
    console.log(`Reached  — WhatsApp: ${stats.reached.WHATSAPP}  SMS: ${stats.reached.SMS}  Voice: ${stats.reached.VOICE}`);
    console.log(`Attempted— WhatsApp: ${stats.attempted.WHATSAPP}  SMS: ${stats.attempted.SMS}  Voice: ${stats.attempted.VOICE}`);
    console.log(`Pending: ${stats.pending}   Unreached on every channel: ${stats.unreached}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Escalation failed:', error);
  process.exit(1);
});
