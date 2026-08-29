import { useState, useEffect } from 'react';
import { WifiOff, Download, X, Smartphone } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone || window.navigator.standalone) {
      setIsInstalled(true);
      return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handlePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (isInstalled || dismissed) return null;
  if (!isInstallable && !isIOS) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-bounce-in">
      <div className="bg-gradient-to-r from-emerald-900 to-primary-900 text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-500/30 flex items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 p-1.5 flex items-center justify-center flex-shrink-0 border border-white/20">
            <img src="/favicon.png" alt="App Icon" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold tracking-wide uppercase text-emerald-300">PWA App</p>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <h4 className="text-xs font-semibold text-white">ई-पीक पाहणी ॲप इन्स्टॉल करा</h4>
            <p className="text-[10px] text-emerald-100/80">ऑफलाइन काम करण्यासाठी होम स्क्रीनवर जोडा</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isInstallable && (
            <button
              type="button"
              onClick={handleInstall}
              className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow transition-transform active:scale-95 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              इन्स्टॉल
            </button>
          )}

          {isIOS && !isInstallable && (
            <div className="text-[10px] bg-white/15 px-2 py-1 rounded-lg text-emerald-100 flex-shrink-0">
              Share ⎙ ➜ Add to Home ➕
            </div>
          )}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-white/60 hover:text-white p-1 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const OnlineStatus = () => {
  const isOnline = useOnlineStatus();
  const { pendingCount, isSyncing } = useOfflineQueue();

  return (
    <>
      <PWAInstallPrompt />
      {(!isOnline || pendingCount > 0) && (
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
      )}
    </>
  );
};
