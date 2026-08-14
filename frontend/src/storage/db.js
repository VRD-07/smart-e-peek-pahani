import Dexie from 'dexie';

export const db = new Dexie('PahaniDatabase');

db.version(1).stores({
  submissions: '++id, status, timestamp', // status can be 'DRAFT', 'SYNC_PENDING', 'SYNCED'
});
