const mongoose = require('mongoose');
const env = require('../src/config/env');

/**
 * Drops the old NotificationLog unique index so escalation can record one row per
 * channel.
 *
 * Before multi-channel escalation the unique key was
 * (phoneNumber, type, dedupeKey) — one row per notification. It is now
 * (phoneNumber, type, dedupeKey, channel), because the SMS fallback for a reminder
 * already tried on WhatsApp is a separate attempt, not a duplicate of it.
 *
 * Mongoose creates the new index on boot but never drops the old one, so on a
 * database that predates this change the stale index rejects the SMS row with a
 * duplicate-key error. This script removes it. Safe to run repeatedly, and a no-op
 * on a fresh database.
 *
 * Usage: node scripts/migrateNotificationLogIndex.js
 */
const STALE_KEY = { phoneNumber: 1, type: 1, dedupeKey: 1 };

function sameKey(a, b) {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  return ak.length === bk.length && ak.every((k) => a[k] === b[k]);
}

async function main() {
  await mongoose.connect(env.mongoUri);

  try {
    const collection = mongoose.connection.db.collection('notificationlogs');

    const exists = await mongoose.connection.db
      .listCollections({ name: 'notificationlogs' })
      .hasNext();

    if (!exists) {
      console.log('No notificationlogs collection yet — nothing to migrate.');
      return;
    }

    const indexes = await collection.indexes();
    const stale = indexes.filter((index) => index.unique && sameKey(index.key, STALE_KEY));

    if (stale.length === 0) {
      console.log('No stale unique index found. Nothing to do.');
    }

    for (const index of stale) {
      await collection.dropIndex(index.name);
      console.log(`Dropped stale unique index '${index.name}' (phoneNumber+type+dedupeKey).`);
    }

    // Recreate the current one explicitly rather than waiting for the next boot,
    // so the collection is never left without a de-duplication guard.
    await collection.createIndex(
      { phoneNumber: 1, type: 1, dedupeKey: 1, channel: 1 },
      { unique: true }
    );
    console.log('Ensured unique index on phoneNumber+type+dedupeKey+channel.');

    // Rows written before `channel` existed default to WhatsApp, which is what
    // they were. Without this they would collide on channel: null.
    const backfilled = await collection.updateMany(
      { channel: { $in: [null, undefined] } },
      { $set: { channel: 'WHATSAPP' } }
    );
    if (backfilled.modifiedCount > 0) {
      console.log(`Backfilled channel=WHATSAPP on ${backfilled.modifiedCount} legacy row(s).`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
