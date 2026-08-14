import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';

export const OnlineStatus = () => {
  const isOnline = useOnlineStatus();
  const { pendingCount, isSyncing } = useOfflineQueue();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 p-3 text-center text-sm font-medium transition-colors z-50 ${
      !isOnline ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
    }`}>
      <div className="max-w-md mx-auto flex items-center justify-center gap-2">
        {!isOnline && <WifiOff className="w-4 h-4" />}
        {!isOnline && <span>You are offline. Submissions will be saved locally.</span>}

        {isOnline && pendingCount > 0 && isSyncing && (
          <span>Syncing {pendingCount} pending submissions...</span>
        )}
        {isOnline && pendingCount > 0 && !isSyncing && (
          <span>{pendingCount} submissions pending sync...</span>
        )}
      </div>
    </div>
  );
};
