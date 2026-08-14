import { useState, useEffect } from 'react';
import { db } from '../storage/db';
import { syncPendingSubmissions } from '../services/syncService';
import { useOnlineStatus } from './useOnlineStatus';
import { useLiveQuery } from 'dexie-react-hooks';

export const useOfflineQueue = () => {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);

  const pendingCount = useLiveQuery(
    () => db.submissions.where('status').equals('SYNC_PENDING').count(),
    []
  ) || 0;

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      const sync = async () => {
        setIsSyncing(true);
        await syncPendingSubmissions();
        setIsSyncing(false);
      };
      sync();
    }
  }, [isOnline, pendingCount]);

  return { pendingCount, isSyncing };
};
