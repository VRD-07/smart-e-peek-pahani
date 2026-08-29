const cron = require('node-cron');
const { createSnapshot, listSnapshots } = require('../services/resilience/backupService');

let task = null;

/**
 * Starts the periodic database snapshot job.
 * Runs every 2 minutes (suitable for live judging demos).
 */
function startBackupJob(cronExpression = '*/2 * * * *') {
  if (task) return task;

  if (!cron.validate(cronExpression)) {
    console.error(`[Backup Job] Invalid cron expression '${cronExpression}'. Using default '*/2 * * * *'`);
    cronExpression = '*/2 * * * *';
  }

  // Run an initial snapshot shortly after startup if no snapshots exist yet
  setTimeout(async () => {
    try {
      const existing = listSnapshots();
      if (existing.length === 0) {
        console.log('[Backup Job] No initial snapshot found. Creating first snapshot...');
        const res = await createSnapshot();
        console.log(`[Backup Job] Initial snapshot created: ${res.filename}`);
      }
    } catch (err) {
      console.error('[Backup Job] Initial snapshot creation error:', err.message);
    }
  }, 3000);

  task = cron.schedule(cronExpression, async () => {
    try {
      const res = await createSnapshot();
      console.log(`[Backup Job] Periodic snapshot created: ${res.filename} (submissions: ${res.summary.submissionsCount})`);
    } catch (error) {
      console.error('[Backup Job] Snapshot creation failed:', error.message);
    }
  });

  console.log(`[Backup Job] Scheduled snapshot job with cron '${cronExpression}'`);
  return task;
}

function stopBackupJob() {
  if (task) {
    task.stop();
    task = null;
  }
}

module.exports = { startBackupJob, stopBackupJob };
