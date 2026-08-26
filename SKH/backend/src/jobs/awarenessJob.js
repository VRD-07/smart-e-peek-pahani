const cron = require('node-cron');
const env = require('../config/env');
const { runDeadlineReminders } = require('../services/notifications/awarenessService');

let task = null;

/**
 * Registers the daily awareness sweep.
 *
 * The job only ever *reminds* — it never files on a farmer's behalf, and it is
 * de-duplicated through NotificationLog, so a restart or a manual run during a
 * demo cannot double-message anyone.
 */
function startAwarenessJob() {
  if (task) return task;

  if (!cron.validate(env.awarenessCron)) {
    console.error(`[Awareness Job] Invalid AWARENESS_CRON '${env.awarenessCron}' — job not started.`);
    return null;
  }

  task = cron.schedule(env.awarenessCron, async () => {
    try {
      const summary = await runDeadlineReminders();
      console.log(
        `[Awareness Job] deadlines due: ${summary.deadlinesDue}, ` +
        `sent: ${summary.remindersSent}, skipped: ${summary.skipped}, failed: ${summary.failed}`
      );
    } catch (error) {
      console.error('[Awareness Job] Run failed:', error);
    }
  });

  console.log(`[Awareness Job] Scheduled with cron '${env.awarenessCron}'.`);
  return task;
}

function stopAwarenessJob() {
  if (task) {
    task.stop();
    task = null;
  }
}

module.exports = { startAwarenessJob, stopAwarenessJob };
