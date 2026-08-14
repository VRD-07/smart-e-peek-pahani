import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff, ChevronRight, Home, RefreshCw, AlertCircle } from 'lucide-react';
import { db } from '../storage/db';
import { Button } from '../components/common';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { syncPendingSubmissions } from '../services/syncService';

export const OfflineQueue = () => {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { isSyncing: isAutoSyncing } = useOfflineQueue();
  const [pending, setPending] = useState([]);
  const [failed, setFailed] = useState([]);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const fetchItems = async () => {
    const pendingItems = await db.submissions.where('status').equals('SYNC_PENDING').toArray();
    const failedItems = await db.submissions.where('status').equals('SYNC_FAILED').toArray();
    setPending(pendingItems);
    setFailed(failedItems);
  };

  useEffect(() => {
    fetchItems();
  }, [isAutoSyncing]); // Re-fetch when auto-sync state changes

  const handleManualSync = async () => {
    if (!isOnline) return;
    setIsManualSyncing(true);
    await syncPendingSubmissions();
    await fetchItems();
    setIsManualSyncing(false);
  };

  const isCurrentlySyncing = isAutoSyncing || isManualSyncing;

  return (
    <div className="flex flex-col flex-1 p-4 max-w-md mx-auto w-full">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Offline Queue</h2>
              <p className="text-sm text-gray-500">{pending.length} pending, {failed.length} failed</p>
            </div>
          </div>
        </div>

        {!isOnline && (
          <div className="bg-amber-50 text-amber-800 text-sm p-3 rounded-lg mb-4">
            These submissions will automatically sync when you reconnect to the internet.
          </div>
        )}

        {isOnline && isCurrentlySyncing && (
          <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Syncing data to server...
          </div>
        )}

        {pending.length === 0 && failed.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No pending or failed submissions.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(item => (
              <div key={item.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{item.data.name}</h4>
                  <p className="text-xs text-gray-500">{item.data.crop} • Gat: {item.data.gat}</p>
                  <p className="text-xs text-amber-600 mt-1">Status: Pending Sync</p>
                </div>
                <button
                  onClick={() => navigate(`/submission/${item.id}`)}
                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ))}

            {failed.map(item => (
              <div key={item.id} className="border border-red-100 bg-red-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-red-900">{item.data.name}</h4>
                  <p className="text-xs text-red-700">{item.data.crop} • Gat: {item.data.gat}</p>
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    <span>Failed: {item.error || 'Permanent Error'}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/submission/${item.id}`)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto space-y-3">
        {isOnline && pending.length > 0 && (
          <Button onClick={handleManualSync} disabled={isCurrentlySyncing} className="w-full">
            {isCurrentlySyncing ? (
              <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Syncing...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" /> Sync Now</>
            )}
          </Button>
        )}
        <Button onClick={() => navigate('/')} variant="outline" className="w-full justify-center">
          <Home className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    </div>
  );
};
