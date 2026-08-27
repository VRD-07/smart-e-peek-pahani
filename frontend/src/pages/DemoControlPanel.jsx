import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CloudRain,
  PhoneCall,
  MessageSquare,
  Smartphone,
  Wifi,
  WifiOff,
  Flame,
  PlusCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import { db } from '../storage/db';

export const DemoControlPanel = () => {
  const [loadingAction, setLoadingAction] = useState(null);
  const [logOutput, setLogOutput] = useState(null);
  const [offlineCount, setOfflineCount] = useState(0);

  // Gat seeding state
  const [gatForm, setGatForm] = useState({
    gatNumber: '999',
    village: 'Demo Village',
    district: 'Nashik',
    registeredArea: '2.4',
    coordinatesText: '19.9010, 74.4940\n19.9030, 74.4940\n19.9030, 74.4965\n19.9010, 74.4965'
  });

  const appendLog = (title, data) => {
    setLogOutput({
      title,
      timestamp: new Date().toLocaleTimeString(),
      data
    });
  };

  const handleSeedGat = async (e) => {
    e.preventDefault();
    setLoadingAction('seed-gat');
    try {
      const coords = gatForm.coordinatesText
        .trim()
        .split('\n')
        .map(line => {
          const parts = line.split(',').map(p => parseFloat(p.trim()));
          return parts;
        })
        .filter(p => p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]));

      const res = await api.post('/demo/seed-gat', {
        gatNumber: gatForm.gatNumber,
        village: gatForm.village,
        district: gatForm.district,
        registeredArea: parseFloat(gatForm.registeredArea) || undefined,
        coordinates: coords
      });

      appendLog('✅ Seeded New Gat Boundary', res.data.data);
    } catch (err) {
      appendLog('❌ Gat Seeding Failed', err.response?.data || err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTriggerScenario = async (scenario) => {
    setLoadingAction(scenario);
    try {
      const res = await api.post('/demo/trigger-submission', { scenario });
      appendLog(`🎯 Scenario: ${scenario}`, res.data.data);
    } catch (err) {
      appendLog(`❌ Scenario Failed: ${scenario}`, err.response?.data || err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTriggerEscalation = async (channel) => {
    setLoadingAction(`escalate-${channel}`);
    try {
      const res = await api.post('/demo/trigger-escalation', { channel });
      appendLog(`📢 Escalation Triggered: ${channel}`, res.data.data);
    } catch (err) {
      appendLog(`❌ Escalation Failed: ${channel}`, err.response?.data || err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOfflineSubmission = async () => {
    setLoadingAction('offline-sub');
    try {
      const id = await db.submissions.add({
        status: 'SYNC_PENDING',
        data: {
          name: 'Demo Farmer (Offline Queue)',
          mobile: '1234567890',
          village: 'Demo Village',
          gat: '101',
          crop: 'soybean',
          registeredArea: 0.8,
          season: 'KHARIF',
          location: { latitude: 19.9012, longitude: 74.4939, isValid: true },
          photo: 'data:image/jpeg;base64,offline-mock-image'
        },
        timestamp: Date.now()
      });
      const count = await db.submissions.where('status').equals('SYNC_PENDING').count();
      setOfflineCount(count);
      appendLog('💾 Saved Offline Submission in Dexie IDB', { localId: id, totalPending: count });
    } catch (err) {
      appendLog('❌ Failed saving to Dexie', err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDrainOfflineQueue = async () => {
    setLoadingAction('drain-offline');
    try {
      const pending = await db.submissions.where('status').equals('SYNC_PENDING').toArray();
      let synced = 0;
      for (const item of pending) {
        // Trigger a real submission for each item
        await api.post('/demo/trigger-submission', { scenario: 'VALID' });
        await db.submissions.delete(item.id);
        synced++;
      }
      setOfflineCount(0);
      appendLog('🔄 Drained Offline Queue to Backend', { syncedCount: synced });
    } catch (err) {
      appendLog('❌ Drain Failed', err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChaos = async () => {
    setLoadingAction('chaos');
    try {
      const res = await api.post('/demo/chaos');
      appendLog('💥 Chaos Mode Triggered (Batch Submissions)', res.data.data);
    } catch (err) {
      appendLog('❌ Chaos Failed', err.response?.data || err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm tracking-wider uppercase">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                Internal Tooling Only
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
                Demo Control Panel & Pipeline Simulator
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Executes live backend validation pipelines and multi-channel escalation on demand without waiting for timeouts or live GPS.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/officer"
                target="_blank"
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
              >
                Officer Dashboard <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/onboarding"
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition-all"
              >
                Farmer PWA <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Controls */}
          <div className="lg:col-span-2 space-y-6">

            {/* Section 1: Gat Seeding Tool */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">1. Seed / Register New Gat Boundary</h2>
                </div>
                <span className="text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                  Turf.js Geofenced
                </span>
              </div>
              <form onSubmit={handleSeedGat} className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Gat Number</label>
                    <input
                      type="text"
                      value={gatForm.gatNumber}
                      onChange={e => setGatForm(prev => ({ ...prev, gatNumber: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Village</label>
                    <input
                      type="text"
                      value={gatForm.village}
                      onChange={e => setGatForm(prev => ({ ...prev, village: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">District</label>
                    <input
                      type="text"
                      value={gatForm.district}
                      onChange={e => setGatForm(prev => ({ ...prev, district: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Area (ha)</label>
                    <input
                      type="text"
                      value={gatForm.registeredArea}
                      onChange={e => setGatForm(prev => ({ ...prev, registeredArea: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-medium text-slate-400">Polygon Trail Coordinates (lat, lng per line)</label>
                    <button
                      type="button"
                      onClick={() => setGatForm(prev => ({
                        ...prev,
                        coordinatesText: '19.9040, 74.4970\n19.9055, 74.4970\n19.9055, 74.4990\n19.9040, 74.4990'
                      }))}
                      className="text-[10px] text-emerald-400 hover:underline"
                    >
                      Use Sample Farm Trail
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={gatForm.coordinatesText}
                    onChange={e => setGatForm(prev => ({ ...prev, coordinatesText: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingAction === 'seed-gat'}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all"
                >
                  {loadingAction === 'seed-gat' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Register & Seed Gat to DB
                </button>
              </form>
            </div>

            {/* Section 2: Pipeline Scenarios */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-white">2. Trigger Pipeline Outcomes</h2>
                </div>
                <span className="text-[11px] text-slate-400">Live Validation Service</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* 1. Valid */}
                <button
                  onClick={() => handleTriggerScenario('VALID')}
                  disabled={loadingAction === 'VALID'}
                  className="p-3.5 bg-slate-900/80 hover:bg-slate-900 border border-green-500/30 hover:border-green-500/60 rounded-xl text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white group-hover:text-green-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Trigger Valid Submission
                    </span>
                    <span className="text-[10px] bg-green-950 text-green-300 border border-green-800 px-1.5 py-0.5 rounded font-mono">
                      VALID
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Center GPS + Soybean photo + valid area. Auto-approves and updates officer dashboard.
                  </p>
                </button>

                {/* 2. Review Boundary Edge */}
                <button
                  onClick={() => handleTriggerScenario('REVIEW_BOUNDARY_EDGE')}
                  disabled={loadingAction === 'REVIEW_BOUNDARY_EDGE'}
                  className="p-3.5 bg-slate-900/80 hover:bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 rounded-xl text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white group-hover:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Trigger Review (Boundary Edge)
                    </span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded font-mono">
                      REVIEW
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Coordinate is &lt; 15m from perimeter edge. Routes to Officer Review with reason code.
                  </p>
                </button>

                {/* 3. Review Area Overallocation */}
                <button
                  onClick={() => handleTriggerScenario('REVIEW_AREA_OVERALLOCATION')}
                  disabled={loadingAction === 'REVIEW_AREA_OVERALLOCATION'}
                  className="p-3.5 bg-slate-900/80 hover:bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 rounded-xl text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white group-hover:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Trigger Review (Area Overrun)
                    </span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded font-mono">
                      REVIEW
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Crop area exceeds Gat 7/12 total area. Sets reasonCode: AREA_OVERALLOCATION.
                  </p>
                </button>

                {/* 4. Rejected Mismatch */}
                <button
                  onClick={() => handleTriggerScenario('REJECTED_CROP_MISMATCH')}
                  disabled={loadingAction === 'REJECTED_CROP_MISMATCH'}
                  className="p-3.5 bg-slate-900/80 hover:bg-slate-900 border border-red-500/30 hover:border-red-500/60 rounded-xl text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white group-hover:text-red-300 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-400" />
                      Trigger Rejected (Crop Mismatch)
                    </span>
                    <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded font-mono">
                      INVALID
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Soybean photo vs Cotton declaration. Vision AI marks mismatch and rejects.
                  </p>
                </button>

                {/* 5. Calamity Match */}
                <button
                  onClick={() => handleTriggerScenario('CALAMITY_MATCH')}
                  disabled={loadingAction === 'CALAMITY_MATCH'}
                  className="sm:col-span-2 p-3.5 bg-slate-900/80 hover:bg-slate-900 border border-cyan-500/30 hover:border-cyan-500/60 rounded-xl text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white group-hover:text-cyan-300 flex items-center gap-1.5">
                      <CloudRain className="w-4 h-4 text-cyan-400" />
                      Trigger Calamity Match (Relief Notification)
                    </span>
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded font-mono">
                      RELIEF MATCH
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Valid filing matches active rainfall CalamityZone. Triggers relief match & WhatsApp alert.
                  </p>
                </button>
              </div>
            </div>

            {/* Section 3: Escalation & Offline Tools */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Escalation Fallbacks */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">3. Escalation Fallbacks</h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Manually invoke Phase 6 escalation rungs bypassing the 24h/48h elapsed time window.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleTriggerEscalation('SMS')}
                    disabled={loadingAction === 'escalate-SMS'}
                    className="w-full py-2 px-3 bg-purple-900/40 hover:bg-purple-900/70 border border-purple-700 text-purple-200 text-xs font-medium rounded-xl flex items-center justify-between transition-all"
                  >
                    <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Trigger SMS Fallback</span>
                    <span className="text-[10px] font-mono">24h bypass</span>
                  </button>
                  <button
                    onClick={() => handleTriggerEscalation('VOICE')}
                    disabled={loadingAction === 'escalate-VOICE'}
                    className="w-full py-2 px-3 bg-purple-900/40 hover:bg-purple-900/70 border border-purple-700 text-purple-200 text-xs font-medium rounded-xl flex items-center justify-between transition-all"
                  >
                    <span className="flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5" /> Trigger Voice Call Fallback</span>
                    <span className="text-[10px] font-mono">48h bypass</span>
                  </button>
                </div>
              </div>

              {/* Offline Dexie Tools */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-sky-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">4. Offline PWA Queue</h3>
                  </div>
                  {offlineCount > 0 && (
                    <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded font-mono">
                      {offlineCount} queued
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Simulate field disconnects by queuing submissions in local Dexie IndexedDB.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={handleOfflineSubmission}
                    disabled={loadingAction === 'offline-sub'}
                    className="w-full py-2 px-3 bg-sky-900/40 hover:bg-sky-900/70 border border-sky-700 text-sky-200 text-xs font-medium rounded-xl flex items-center justify-between transition-all"
                  >
                    <span className="flex items-center gap-1.5"><WifiOff className="w-3.5 h-3.5" /> Queue Offline Submission</span>
                    <span className="text-[10px] font-mono">IndexedDB</span>
                  </button>
                  <button
                    onClick={handleDrainOfflineQueue}
                    disabled={loadingAction === 'drain-offline' || offlineCount === 0}
                    className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white text-xs font-semibold rounded-xl flex items-center justify-between transition-all"
                  >
                    <span className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" /> Go Online & Drain Queue</span>
                    <span className="text-[10px] font-mono">Sync</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Section 4: Chaos Mode */}
            <div className="bg-gradient-to-r from-red-950/40 via-amber-950/40 to-slate-800/60 border border-red-500/30 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <Flame className="w-5 h-5 text-red-500" />
                  5. Chaos Button (Full Dashboard Population)
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  Generates 6-10 randomized submissions across all outcomes at once to populate maps & dashboard stats.
                </p>
              </div>
              <button
                onClick={handleChaos}
                disabled={loadingAction === 'chaos'}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 whitespace-nowrap transition-all"
              >
                {loadingAction === 'chaos' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                Fire Chaos Mode
              </button>
            </div>

          </div>

          {/* Column 3: Live Output Inspector */}
          <div className="space-y-4">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-lg h-[680px] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Pipeline Output</h3>
                {logOutput && (
                  <span className="text-[10px] font-mono text-slate-400">{logOutput.timestamp}</span>
                )}
              </div>

              <div className="flex-1 bg-slate-950 rounded-xl p-4 overflow-y-auto font-mono text-xs text-slate-300 border border-slate-800">
                {logOutput ? (
                  <div className="space-y-3">
                    <p className="font-bold text-emerald-400 border-b border-slate-800 pb-1.5">{logOutput.title}</p>
                    <pre className="text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap word-break break-all">
                      {JSON.stringify(logOutput.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-4">
                    <p className="text-xs">Click any trigger on the left to execute live backend pipeline logic.</p>
                    <p className="text-[10px] mt-1 text-slate-600">Results will stream here in real time.</p>
                  </div>
                )}
              </div>

              {logOutput && (
                <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center">
                  <button
                    onClick={() => setLogOutput(null)}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    Clear Output
                  </button>
                  <Link
                    to="/officer"
                    target="_blank"
                    className="text-[10px] text-primary-400 hover:underline flex items-center gap-1"
                  >
                    View in Officer Dashboard →
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

