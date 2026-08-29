const fs = require('fs');
const path = require('path');
const Submission = require('../../models/Submission');
const Farmer = require('../../models/Farmer');
const Gat = require('../../models/Gat');
const ValidationResult = require('../../models/ValidationResult');
const CalamityZone = require('../../models/CalamityZone');
const CalamityMatch = require('../../models/CalamityMatch');
const NotificationLog = require('../../models/NotificationLog');
const FieldPlanting = require('../../models/FieldPlanting');
const SchemeDeadline = require('../../models/SchemeDeadline');
const SystemMarker = require('../../models/SystemMarker');

const BACKUP_DIR = path.join(__dirname, '../../../backups');
const MAX_SNAPSHOTS = 10;

/**
 * Ensures backup directory exists
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Creates a complete JSON snapshot of primary collections
 */
async function createSnapshot() {
  ensureBackupDir();

  const [
    submissions,
    farmers,
    gats,
    validationResults,
    calamityZones,
    calamityMatches,
    notificationLogs,
    fieldPlantings,
    schemeDeadlines
  ] = await Promise.all([
    Submission.find({}).lean(),
    Farmer.find({}).lean(),
    Gat.find({}).lean(),
    ValidationResult.find({}).lean(),
    CalamityZone.find({}).lean(),
    CalamityMatch.find({}).lean(),
    NotificationLog.find({}).lean(),
    FieldPlanting.find({}).lean(),
    SchemeDeadline.find({}).lean()
  ]);

  const timestamp = new Date().toISOString();
  const fileTimestamp = timestamp.replace(/[:.]/g, '-');
  const filename = `snapshot_${fileTimestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  const snapshotData = {
    version: '1.0',
    createdAt: timestamp,
    summary: {
      submissionsCount: submissions.length,
      farmersCount: farmers.length,
      gatsCount: gats.length,
      validationResultsCount: validationResults.length,
      calamityZonesCount: calamityZones.length,
      calamityMatchesCount: calamityMatches.length,
      notificationLogsCount: notificationLogs.length,
      fieldPlantingsCount: fieldPlantings.length,
      schemeDeadlinesCount: schemeDeadlines.length
    },
    collections: {
      submissions,
      farmers,
      gats,
      validationResults,
      calamityZones,
      calamityMatches,
      notificationLogs,
      fieldPlantings,
      schemeDeadlines
    }
  };

  fs.writeFileSync(filepath, JSON.stringify(snapshotData, null, 2), 'utf-8');

  // Prune older snapshots beyond MAX_SNAPSHOTS
  pruneOldSnapshots();

  // Update SystemMarker with last backup time
  await SystemMarker.findOneAndUpdate(
    { markerKey: 'PRIMARY_SYSTEM_HEALTH' },
    {
      $set: {
        lastBackupAt: new Date(),
        'metadata.lastBackupFile': filename,
        'metadata.lastBackupSummary': snapshotData.summary
      }
    },
    { upsert: true, new: true }
  );

  return {
    success: true,
    filename,
    filepath,
    createdAt: timestamp,
    summary: snapshotData.summary
  };
}

/**
 * Keep the last N snapshots and delete older ones
 */
function pruneOldSnapshots() {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('snapshot_') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > MAX_SNAPSHOTS) {
    const toDelete = files.slice(MAX_SNAPSHOTS);
    for (const file of toDelete) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('Failed to prune snapshot:', file.name, err);
      }
    }
  }
}

/**
 * List all available snapshots sorted by most recent
 */
function listSnapshots() {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('snapshot_') && f.endsWith('.json'))
    .map(f => {
      const fullPath = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fullPath);
      let summary = null;
      let createdAt = stat.mtime;
      try {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const parsed = JSON.parse(raw);
        summary = parsed.summary;
        createdAt = parsed.createdAt || stat.mtime;
      } catch (e) {
        // ignore parse error for listing
      }
      return {
        filename: f,
        sizeBytes: stat.size,
        createdAt,
        summary
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return files;
}

/**
 * Restores database from the latest (or specified) snapshot
 */
async function restoreFromSnapshot(filename = null) {
  ensureBackupDir();
  const snapshots = listSnapshots();

  if (snapshots.length === 0) {
    throw new Error('No snapshots available to restore from. Run a backup first.');
  }

  const target = filename ? snapshots.find(s => s.filename === filename) : snapshots[0];
  if (!target) {
    throw new Error(`Snapshot '${filename}' not found.`);
  }

  const targetPath = path.join(BACKUP_DIR, target.filename);
  const rawData = fs.readFileSync(targetPath, 'utf-8');
  const snapshotData = JSON.parse(rawData);
  const cols = snapshotData.collections;

  // Restore collections
  const restoreResults = {};

  if (cols.submissions) {
    await Submission.deleteMany({});
    if (cols.submissions.length > 0) {
      await Submission.insertMany(cols.submissions, { ordered: false });
    }
    restoreResults.submissions = cols.submissions.length;
  }

  if (cols.validationResults) {
    await ValidationResult.deleteMany({});
    if (cols.validationResults.length > 0) {
      await ValidationResult.insertMany(cols.validationResults, { ordered: false });
    }
    restoreResults.validationResults = cols.validationResults.length;
  }

  if (cols.farmers) {
    await Farmer.deleteMany({});
    if (cols.farmers.length > 0) {
      await Farmer.insertMany(cols.farmers, { ordered: false });
    }
    restoreResults.farmers = cols.farmers.length;
  }

  if (cols.gats) {
    await Gat.deleteMany({});
    if (cols.gats.length > 0) {
      await Gat.insertMany(cols.gats, { ordered: false });
    }
    restoreResults.gats = cols.gats.length;
  }

  if (cols.calamityZones) {
    await CalamityZone.deleteMany({});
    if (cols.calamityZones.length > 0) {
      await CalamityZone.insertMany(cols.calamityZones, { ordered: false });
    }
    restoreResults.calamityZones = cols.calamityZones.length;
  }

  if (cols.calamityMatches) {
    await CalamityMatch.deleteMany({});
    if (cols.calamityMatches.length > 0) {
      await CalamityMatch.insertMany(cols.calamityMatches, { ordered: false });
    }
    restoreResults.calamityMatches = cols.calamityMatches.length;
  }

  if (cols.notificationLogs) {
    await NotificationLog.deleteMany({});
    if (cols.notificationLogs.length > 0) {
      await NotificationLog.insertMany(cols.notificationLogs, { ordered: false });
    }
    restoreResults.notificationLogs = cols.notificationLogs.length;
  }

  if (cols.fieldPlantings) {
    await FieldPlanting.deleteMany({});
    if (cols.fieldPlantings.length > 0) {
      await FieldPlanting.insertMany(cols.fieldPlantings, { ordered: false });
    }
    restoreResults.fieldPlantings = cols.fieldPlantings.length;
  }

  if (cols.schemeDeadlines) {
    await SchemeDeadline.deleteMany({});
    if (cols.schemeDeadlines.length > 0) {
      await SchemeDeadline.insertMany(cols.schemeDeadlines, { ordered: false });
    }
    restoreResults.schemeDeadlines = cols.schemeDeadlines.length;
  }

  // Set health marker back to HEALTHY
  const marker = await SystemMarker.findOneAndUpdate(
    { markerKey: 'PRIMARY_SYSTEM_HEALTH' },
    {
      $set: {
        status: 'HEALTHY',
        lastRestoredAt: new Date(),
        lastHealthyCheck: new Date(),
        corruptedAt: null,
        'metadata.restoredFromSnapshot': target.filename,
        'metadata.restoredCounts': restoreResults
      }
    },
    { upsert: true, new: true }
  );

  return {
    success: true,
    restoredFrom: target.filename,
    snapshotTimestamp: snapshotData.createdAt,
    restoredCounts: restoreResults,
    systemStatus: marker.status
  };
}

/**
 * Simulates a hard database wipe/blackout event
 */
async function simulateBlackout() {
  const wipeTimestamp = new Date();

  // 1. Wipe Submissions and ValidationResults to simulate primary data loss
  await Submission.deleteMany({});
  await ValidationResult.deleteMany({});

  // 2. Mark system integrity as CORRUPTED
  await SystemMarker.findOneAndUpdate(
    { markerKey: 'PRIMARY_SYSTEM_HEALTH' },
    {
      $set: {
        status: 'CORRUPTED',
        corruptedAt: wipeTimestamp,
        'metadata.wipeReason': 'SIMULATED_BLACKOUT_EVENT'
      }
    },
    { upsert: true, new: true }
  );

  return {
    success: true,
    event: 'DATABASE_CORRUPTED',
    status: 'corrupted',
    corruptedAt: wipeTimestamp,
    message: 'Simulated blackout executed: Submissions collection wiped and system health flag set to CORRUPTED.'
  };
}

/**
 * Checks system integrity and health
 */
async function checkSystemHealth() {
  const [submissionsCount, farmersCount, gatsCount, marker] = await Promise.all([
    Submission.countDocuments(),
    Farmer.countDocuments(),
    Gat.countDocuments(),
    SystemMarker.findOne({ markerKey: 'PRIMARY_SYSTEM_HEALTH' }).lean()
  ]);

  const snapshots = listSnapshots();
  const latestSnapshot = snapshots[0] || null;

  // If marker says CORRUPTED but submissions are actually present (> 0), auto-heal to HEALTHY
  if (marker && marker.status === 'CORRUPTED') {
    if (submissionsCount > 0) {
      await SystemMarker.findOneAndUpdate(
        { markerKey: 'PRIMARY_SYSTEM_HEALTH' },
        {
          $set: {
            status: 'HEALTHY',
            lastHealthyCheck: new Date(),
            corruptedAt: null
          }
        }
      );
    } else {
      return {
        status: 'corrupted',
        healthy: false,
        detectedAt: marker.corruptedAt || new Date(),
        reason: 'Critical database blackout/corruption state detected. Submissions table is missing or wiped.',
        details: {
          submissionsCount,
          farmersCount,
          gatsCount,
          lastBackupAvailable: latestSnapshot ? latestSnapshot.filename : null,
          lastBackupTime: latestSnapshot ? latestSnapshot.createdAt : null,
          availableSnapshotsCount: snapshots.length
        }
      };
    }
  }

  // If submissions count is 0 and gats exist (wiped state)
  if (submissionsCount === 0 && (gatsCount > 0 || farmersCount > 0)) {
    return {
      status: 'corrupted',
      healthy: false,
      detectedAt: marker?.corruptedAt || new Date(),
      reason: 'Database integrity breach detected: Submissions collection is empty while Gats/Farmers exist.',
      details: {
        submissionsCount: 0,
        farmersCount,
        gatsCount,
        lastBackupAvailable: latestSnapshot ? latestSnapshot.filename : null,
        lastBackupTime: latestSnapshot ? latestSnapshot.createdAt : null,
        availableSnapshotsCount: snapshots.length
      }
    };
  }

  // Healthy state
  return {
    status: 'healthy',
    healthy: true,
    timestamp: new Date(),
    details: {
      submissionsCount,
      farmersCount,
      gatsCount,
      lastBackupAvailable: latestSnapshot ? latestSnapshot.filename : null,
      lastBackupTime: latestSnapshot ? latestSnapshot.createdAt : null,
      availableSnapshotsCount: snapshots.length
    }
  };
}

module.exports = {
  createSnapshot,
  listSnapshots,
  restoreFromSnapshot,
  simulateBlackout,
  checkSystemHealth
};
