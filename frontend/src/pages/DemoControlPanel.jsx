import { useState, useEffect } from 'react';
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
  RefreshCw,
  Send,
  Database,
  AlertOctagon,
  RotateCcw,
  Activity,
  HardDrive,
  Camera,
  Search,
  Copy,
  FileCheck,
  ShieldCheck,
  Layers
} from 'lucide-react';
import api from '../services/api';
import { db } from '../storage/db';

export const DemoControlPanel = () => {
  const [loadingAction, setLoadingAction] = useState(null);
  const [logOutput, setLogOutput] = useState(null);
  const [offlineCount, setOfflineCount] = useState(0);
  const [systemHealth, setSystemHealth] = useState(null);
  const [schemeQuery, setSchemeQuery] = useState('is Kharif real');

  // Custom phone number for live demonstration to judges
  const [targetPhone, setTargetPhone] = useState('+91');

  useEffect(() => {
    // Check initial health and offline queue count on mount
    const init = async () => {
      try {
        const count = await db.submissions.where('status').equals('SYNC_PENDING').count();
        setOfflineCount(count);
        const healthRes = await api.get('/demo/health');
        setSystemHealth(healthRes.data);
      } catch (err) {
        if (err.response?.data) {
          setSystemHealth(err.response.data);
        }
      }
    };
    init();
  }, []);

  // Gat seeding state with Murshatpur default
  const [gatForm, setGatForm] = useState({
    gatNumber: '101',
    village: 'Murshatpur',
    district: 'Nashik',
    registeredArea: '2.4',
    coordinatesText: '19.9010, 74.4940\n19.9030, 74.4940\n19.9030, 74.4965\n19.9010, 74.4965'
  });

  const getExplanation = (data, title = '') => {
    if (!data) return null;
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    const errText = (data.details?.error || data.error || data.message || str || '').toLowerCase();

    if (errText.includes('50 daily messages limit') || errText.includes('exceeded the 50 daily')) {
      return {
        severity: 'warning',
        badge: 'Twilio Trial Quota (50/day)',
        title: 'Daily Message Limit Exceeded on Twilio Trial',
        cause: 'Free Twilio trial accounts allow a maximum of 50 outbound WhatsApp/SMS messages per 24-hour cycle.',
        solution: 'To test and demonstrate without message limits, set NOTIFICATION_PROVIDER=mock in backend .env (which simulates all channels in console), or wait 24 hours for the Twilio counter to reset.'
      };
    }
    if (errText.includes('contentsid required') || errText.includes('contentsid')) {
      return {
        severity: 'warning',
        badge: '24h WhatsApp Session Closed',
        title: 'Inbound WhatsApp Message Required First',
        cause: 'Twilio Sandbox requires an active 24-hour conversation window opened by the recipient before outbound freeform text can be delivered.',
        solution: 'Open WhatsApp on your mobile phone, message "Hi" or your "join <code>" to +1 415 523 8886, then click WhatsApp Alert again.'
      };
    }
    if (errText.includes('is unverified') || errText.includes('trial accounts may only make calls to verified')) {
      return {
        severity: 'warning',
        badge: 'Unverified Twilio Number',
        title: 'Trial Account Requires Verified Caller ID',
        cause: 'Twilio trial accounts can only dial phone numbers registered under Verified Caller IDs.',
        solution: 'Add your phone number under Twilio Console > Phone Numbers > Verified Caller IDs, and type that number in the Live Phone Target box above.'
      };
    }
    if (errText.includes('sender_not_configured')) {
      return {
        severity: 'error',
        badge: 'Missing Sender in .env',
        title: 'Twilio Channel Sender Not Configured',
        cause: 'TWILIO_SMS_NUMBER or TWILIO_VOICE_NUMBER is unset in backend environment variables.',
        solution: 'Set TWILIO_SMS_NUMBER and TWILIO_VOICE_NUMBER in your backend .env file to your Twilio phone number.'
      };
    }
    if (errText.includes('channel could not find a user') || errText.includes('63015')) {
      return {
        severity: 'warning',
        badge: 'Sandbox Join Required',
        title: 'Handset Has Not Joined WhatsApp Sandbox',
        cause: 'Twilio cannot message WhatsApp numbers that have not joined the Sandbox.',
        solution: 'Send "join <sandbox-code>" from your phone to +1 415 523 8886, wait for confirmation, and retry.'
      };
    }

    if (data.status === 'SENT' || data.success === true) {
      return {
        severity: 'success',
        badge: 'Dispatched Successfully',
        title: 'Notification Sent via Provider',
        cause: `Message SID / Call ID: ${data.details?.providerMessageId || data.steps?.[0]?.channel || 'Recorded in DB'}`,
        solution: 'The carrier received the dispatch request and is delivering it to the recipient.'
      };
    }

    // Generic fallback for any dispatch failure not matched above
    if (data.success === false || data.exhausted || data.status === 'FAILED' || data.status === 'SKIPPED') {
      const providerError = data.steps?.[0]?.error || data.details?.error || data.error || '';
      const reason = data.steps?.[0]?.reason || data.message || 'Provider returned an error';
      return {
        severity: 'error',
        badge: `${data.channel || 'Channel'} Dispatch Failed`,
        title: reason,
        cause: providerError || `Channel ${data.channel} could not deliver the notification.`,
        solution: 'Check backend logs and Twilio console for details. Verify the phone number format (+91...), provider configuration in .env, and that the channel sender number is set.'
      };
    }

    // Surface backend error responses (errorCode present in error responses from the API)
    if (data.errorCode || data.error) {
      return {
        severity: 'error',
        badge: data.errorCode || 'Server Error',
        title: data.message || 'Request failed',
        cause: data.error || data.message || 'The backend returned an error for this request.',
        solution: 'Check the backend server console for full error details.'
      };
    }

    return null;
  };

  const appendLog = (title, data, type = 'info') => {
    setLogOutput({
      title,
      type,
      timestamp: new Date().toLocaleTimeString(),
      data,
      explanation: getExplanation(data, title)
    });
  };

  const handleSeedGat = async (e) => {
    if (e) e.preventDefault();
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

      appendLog('✅ Seeded Murshatpur Gat Boundary', res.data.data, 'success');
    } catch (err) {
      appendLog('❌ Gat Seeding Failed', err.response?.data || err.message, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTriggerScenario = async (scenario) => {
    setLoadingAction(scenario);
    try {
      const res = await api.post('/demo/trigger-submission', { scenario });
      appendLog(`🎯 Scenario: ${scenario}`, res.data.data, 'success');
    } catch (err) {
      appendLog(`❌ Scenario Failed: ${scenario}`, err.response?.data || err.message, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTriggerEscalation = async (channel) => {
    setLoadingAction(`escalate-${channel}`);
    try {
      const payload = { channel };
      if (targetPhone && targetPhone.trim().length > 3) {
        payload.phoneNumber = targetPhone.trim();
      }
      const res = await api.post('/demo/trigger-escalation', payload);
      const isSuccess = res.data?.data?.success ?? (res.data?.data?.status === 'SENT');
      const channelLabels = {
        WHATSAPP: 'WhatsApp Message',
        SMS: 'SMS Text Message',
        VOICE: 'Phone Call (Voice IVR)'
      };
      const label = channelLabels[channel] || channel;
      const title = isSuccess
        ? `✅ Live Dispatch Sent: ${label}`
        : `❌ Live Dispatch Failed: ${label}`;
      appendLog(title, res.data.data, isSuccess ? 'success' : 'error');
    } catch (err) {
      appendLog(`❌ Dispatch Request Failed: ${channel}`, err.response?.data || err.message, 'error');
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
          name: 'Demo Farmer (Murshatpur)',
          mobile: targetPhone && targetPhone.length > 5 ? targetPhone : '9876543210',
          village: 'Murshatpur',
          gat: '101',
          crop: 'soybean',
          registeredArea: 1.2,
          season: 'KHARIF',
          location: { latitude: 19.9012, longitude: 74.4939, isValid: true, status: 'VALID', message: 'Location Verified' },
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

  const handleVerifySchemeQuery = async (overrideQuery = null) => {
    const q = overrideQuery || schemeQuery;
    setLoadingAction('verify-scheme');
    try {
      const res = await api.post('/demo/verify-scheme', { query: q, language: 'mr' });
      appendLog(
        res.data.data?.matched ? '🏛️ Scheme / Calamity Status: VERIFIED & CONFIRMED' : '⚠️ Scheme / Calamity Status: NO RECORD FOUND',
        res.data.data,
        res.data.data?.matched ? 'success' : 'warning'
      );
    } catch (err) {
      appendLog('❌ Scheme Verification Failed', err.response?.data || err.message, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTriggerCoordinatedDuplicate = async () => {
    setLoadingAction('trigger-duplicate');
    try {
      const res = await api.post('/demo/trigger-duplicate');
      appendLog('🚨 COORDINATED DUPLICATE DETECTED (SUSPECTED_DUPLICATE)', res.data.data, 'warning');
    } catch (err) {
      appendLog('❌ Trigger Coordinated Duplicate Failed', err.response?.data || err.message, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSimulateBlackout = async () => {
    setLoadingAction('blackout');
    try {
      const res = await api.post('/demo/blackout');
      appendLog('🚨 SIMULATED DATABASE BLACKOUT TRIGGERED', res.data.data, 'error');
      await handleCheckHealth(false);
    } catch (err) {
      appendLog('❌ Blackout Simulation Request Failed', err.response?.data || err.message, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCheckHealth = async (showLog = true) => {
    setLoadingAction('health');
    try {
      const res = await api.get('/demo/health');
      setSystemHealth(res.data);
      if (showLog) {
        appendLog(
          res.data.healthy ? '✅ System Integrity: HEALTHY' : '🚨 System Integrity: CORRUPTED',
          res.data,
          res.data.healthy ? 'success' : 'error'
        );
      }
    } catch (err) {
      const data = err.response?.data || { status: 'corrupted', healthy: false, reason: err.message };
      setSystemHealth(data);
      if (showLog) {
        appendLog('🚨 System Integrity Check: CORRUPTED / UNHEALTHY', data, 'error');
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRestoreSnapshot = async () => {
    setLoadingAction('restore');
    try {
      const res = await api.post('/demo/restore');
      appendLog('♻️ Database Restored from Snapshot', res.data.data, 'success');
      await handleCheckHealth(false);
    } catch (err) {
      appendLog('❌ Database Restore Failed', err.response?.data || err.message, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCreateSnapshot = async () => {
    setLoadingAction('snapshot');
    try {
      const res = await api.post('/demo/snapshot');
      appendLog('📸 Snapshot Created', res.data.data, 'success');
      await handleCheckHealth(false);
    } catch (err) {
      appendLog('❌ Snapshot Creation Failed', err.response?.data || err.message, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReplayInFlight = async () => {
    setLoadingAction('replay-inflight');
    try {
      // 1. Create a simulated in-flight submission in Dexie IDB with SYNC_PENDING
      const inFlightItem = {
        status: 'SYNC_PENDING',
        data: {
          clientSubmissionId: `inflight_wa_${Date.now()}`,
          name: 'In-Flight Demo Farmer (Murshatpur)',
          mobile: targetPhone && targetPhone.length > 5 ? targetPhone : '+919876543210',
          village: 'Murshatpur',
          gat: '101',
          crop: 'soybean',
          registeredArea: 2.1,
          season: 'KHARIF',
          location: { latitude: 19.9020, longitude: 74.4950, isValid: true, status: 'VALID' },
          photo: 'https://res.cloudinary.com/mock-cloud/image/upload/v12345/crop_sample.jpg'
        },
        timestamp: Date.now()
      };
      const id = await db.submissions.add(inFlightItem);
      const count = await db.submissions.where('status').equals('SYNC_PENDING').count();
      setOfflineCount(count);

      appendLog('⏳ In-Flight Submission Queued in Dexie IDB', {
        localQueueId: id,
        status: 'SYNC_PENDING',
        message: 'Buffered in durable client-side IndexedDB during blackout. Ready to replay to restored backend.'
      }, 'info');

      // 2. Perform sync replay to backend
      const subRes = await api.post('/demo/trigger-submission', {
        scenario: 'VALID',
        crop: 'soybean',
        area: 2.1
      });

      // 3. Mark as SYNCED in Dexie IDB
      await db.submissions.update(id, {
        status: 'SYNCED',
        backendId: subRes.data?.data?.submission?._id,
        syncedAt: new Date().toISOString()
      });

      const updatedCount = await db.submissions.where('status').equals('SYNC_PENDING').count();
      setOfflineCount(updatedCount);

      appendLog('✅ In-Flight Submission Replayed & Landed in DB', {
        localQueueId: id,
        replayedStatus: 'SYNCED',
        submissionId: subRes.data?.data?.submission?._id,
        backendStatus: subRes.data?.data?.submission?.status || 'VALID',
        message: 'In-flight submission successfully recovered from Dexie queue into restored database!'
      }, 'success');

      await handleCheckHealth(false);
    } catch (err) {
      appendLog('❌ In-Flight Replay Failed', err.response?.data || err.message, 'error');
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
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="bg-slate-800/90 border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs tracking-wider uppercase">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Live Demo Control Station • Murshatpur, Maharashtra
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white mt-1 tracking-tight">
                Smart E-Peek Pahani Pipeline & Channel Controller
              </h1>
              <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-3xl">
                Execute live validation pipelines, test AI crop vision, trigger automated multi-channel dispatches (WhatsApp, SMS message, Phone Voice Call) directly to your phone before judges, and simulate offline field capture.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/officer"
                target="_blank"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-900/30 transition-all hover:scale-105"
              >
                Officer Dashboard <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/onboarding"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl text-xs font-bold transition-all hover:scale-105"
              >
                Farmer Web App <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* System Health Alert Banner (Appears when corrupted or warning) */}
        {systemHealth && !systemHealth.healthy && (
          <div className="bg-red-950/80 border-2 border-red-500 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-900/60 rounded-xl border border-red-500 text-red-300">
                <AlertOctagon className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider bg-red-900 text-red-200 border border-red-700 px-2 py-0.5 rounded">
                    CRITICAL SYSTEM CORRUPTION DETECTED
                  </span>
                  <span className="text-xs font-mono text-red-300">
                    {systemHealth.detectedAt ? new Date(systemHealth.detectedAt).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
                <h2 className="text-lg font-black text-white mt-0.5">Database Blackout / Data Loss Active</h2>
                <p className="text-xs text-red-200 mt-0.5">
                  {systemHealth.reason || 'Submissions collection dropped or corrupted. Use "Restore from Snapshot" below to recover database.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRestoreSnapshot}
                disabled={loadingAction === 'restore'}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
              >
                {loadingAction === 'restore' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Quick Restore from Snapshot
              </button>
            </div>
          </div>
        )}

        {/* Live Phone Recipient Target */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-800/80 to-slate-800/80 border border-emerald-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              Live Phone Target for In-Person Judge Demo
            </div>
            <p className="text-slate-400 text-xs">
              Enter your mobile number with country code (e.g. <span className="text-emerald-300 font-mono">+919876543210</span>) to receive real-time WhatsApp alerts, SMS messages, and IVR Phone Calls on stage.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              placeholder="+919876543210"
              className="bg-slate-950 border border-emerald-500/50 rounded-xl px-4 py-2.5 text-sm font-mono text-emerald-300 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Controls */}
          <div className="lg:col-span-2 space-y-6">

            {/* Section 1: Multi-Channel Triggers to Live Phone */}
            <div className="bg-slate-800/60 border border-purple-500/30 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-purple-400" />
                  <h2 className="text-base font-bold text-white">1. Multi-Channel Triggers (Direct Channel Dispatch)</h2>
                </div>
                <span className="text-[11px] bg-purple-950 text-purple-300 border border-purple-800 px-2.5 py-0.5 rounded-full font-mono">
                  WhatsApp • SMS • Voice Call
                </span>
              </div>
              <p className="text-slate-400 text-xs">
                Demonstrate multi-channel reachability. Each trigger strictly and independently dispatches directly to that specific channel (WhatsApp calls WhatsApp only, SMS sends text message only, and Phone Call places a voice call only).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleTriggerEscalation('WHATSAPP')}
                  disabled={loadingAction === 'escalate-WHATSAPP'}
                  className="p-3.5 bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-600/40 hover:border-emerald-500 rounded-xl text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-white group-hover:text-emerald-300 flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-emerald-400" />
                      1. WhatsApp Alert
                    </span>
                    <span className="text-[9px] bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.5 rounded font-mono">
                      WhatsApp Only
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sends interactive Marathi WhatsApp reminder directly to recipient handset only.
                  </p>
                </button>

                <button
                  onClick={() => handleTriggerEscalation('SMS')}
                  disabled={loadingAction === 'escalate-SMS'}
                  className="p-3.5 bg-purple-950/30 hover:bg-purple-900/50 border border-purple-600/40 hover:border-purple-500 rounded-xl text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-white group-hover:text-purple-300 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      2. SMS Message
                    </span>
                    <span className="text-[9px] bg-purple-900/60 text-purple-300 border border-purple-700/50 px-1.5 py-0.5 rounded font-mono">
                      SMS Only
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Dispatches compact Devanagari text SMS directly to feature phone or handset only.
                  </p>
                </button>

                <button
                  onClick={() => handleTriggerEscalation('VOICE')}
                  disabled={loadingAction === 'escalate-VOICE'}
                  className="p-3.5 bg-indigo-950/30 hover:bg-indigo-900/50 border border-indigo-600/40 hover:border-indigo-500 rounded-xl text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-white group-hover:text-indigo-300 flex items-center gap-1.5">
                      <PhoneCall className="w-4 h-4 text-indigo-400" />
                      3. Phone Calling (Voice Call)
                    </span>
                    <span className="text-[9px] bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 px-1.5 py-0.5 rounded font-mono">
                      Phone Call Only
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Places automated IVR voice call to handset playing clear spoken Marathi audio only.
                  </p>
                </button>
              </div>
            </div>

            {/* Section 2: Validation Scenarios */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-white">2. Automated Validation Pipeline Scenarios</h2>
                </div>
                <span className="text-[11px] text-slate-400">AI Vision + Geofencing</span>
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
                    Murshatpur center GPS + Soybean photo + valid area. Auto-approves instantly.
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
                    Coordinate is &lt; 15m from perimeter edge. Routes to Talathi / Officer queue.
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
                    Soybean photo vs Cotton declaration. Gemini Vision marks mismatch and rejects.
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
                      Trigger Calamity Match (Excess Rainfall Relief)
                    </span>
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded font-mono">
                      RELIEF MATCH
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Valid filing matches active rainfall CalamityZone in Murshatpur. Auto-matches relief & notifies farmer.
                  </p>
                </button>
              </div>
            </div>

            {/* Section 3: Misinformation Verification & Coordinated Submission Detection */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">3. Scheme Truth Verification & Coordinated Fraud Detection</h2>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono">Real-time Trust & Integrity</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Task 1: Scheme / Calamity Verification */}
                <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-1.5">
                        <Search className="w-4 h-4 text-cyan-400" />
                        Query Scheme / Calamity Status
                      </span>
                      <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded font-mono">
                        WhatsApp Bot Intent
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tests bot verification against official CalamityZone and SchemeDeadline database records without guessing.
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <input
                        type="text"
                        value={schemeQuery}
                        onChange={(e) => setSchemeQuery(e.target.value)}
                        placeholder="e.g. is Kharif real, अतिवृष्टी तपासा..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => { setSchemeQuery('is Kharif real'); handleVerifySchemeQuery('is Kharif real'); }}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                        >
                          "is Kharif real"
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSchemeQuery('अतिवृष्टी मुर्शदपूर तपासा'); handleVerifySchemeQuery('अतिवृष्टी मुर्शदपूर तपासा'); }}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                        >
                          "अतिवृष्टी मुर्शदपूर"
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSchemeQuery('Fake Solar Scheme'); handleVerifySchemeQuery('Fake Solar Scheme'); }}
                          className="px-2 py-0.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded border border-red-800"
                        >
                          "Fake Solar (Negative Test)"
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleVerifySchemeQuery()}
                    disabled={loadingAction === 'verify-scheme'}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
                  >
                    {loadingAction === 'verify-scheme' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Query Scheme Status
                  </button>
                </div>

                {/* Task 2: Coordinated Submission Detection */}
                <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-400" />
                        Coordinated Submission Detection
                      </span>
                      <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded font-mono">
                        Perceptual Hashing (dHash)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Submits duplicate crop photo across two different phone numbers & Gats in quick succession. Confirms the 2nd is flagged <strong className="text-amber-300">SUSPECTED_DUPLICATE</strong>.
                    </p>

                    <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-[11px] space-y-1 font-mono text-slate-300">
                      <div className="text-[10px] text-slate-400">DEMO SEQUENCE:</div>
                      <div>1. Sub #1: Ramesh (+919876500001) on Gat 101 ➔ VALID</div>
                      <div>2. Sub #2: Suresh (+919876500002) on Gat 102 ➔ REVIEW (Duplicate)</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleTriggerCoordinatedDuplicate}
                      disabled={loadingAction === 'trigger-duplicate'}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
                    >
                      {loadingAction === 'trigger-duplicate' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                      Trigger Coordinated Submission
                    </button>
                    <Link
                      to="/officer"
                      target="_blank"
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                    >
                      <span>View in Officer Dashboard</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Gat Boundary Seeder & Offline PWA Queue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Gat Boundary Seeder */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Murshatpur Gat Seeder</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGatForm({
                      gatNumber: '101',
                      village: 'Murshatpur',
                      district: 'Nashik',
                      registeredArea: '2.4',
                      coordinatesText: '19.9010, 74.4940\n19.9030, 74.4940\n19.9030, 74.4965\n19.9010, 74.4965'
                    })}
                    className="text-[10px] text-emerald-400 hover:underline"
                  >
                    Load Murshatpur
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Gat No.</label>
                    <input
                      type="text"
                      value={gatForm.gatNumber}
                      onChange={e => setGatForm(prev => ({ ...prev, gatNumber: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Village</label>
                    <input
                      type="text"
                      value={gatForm.village}
                      onChange={e => setGatForm(prev => ({ ...prev, village: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Area (ha)</label>
                    <input
                      type="text"
                      value={gatForm.registeredArea}
                      onChange={e => setGatForm(prev => ({ ...prev, registeredArea: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSeedGat}
                  disabled={loadingAction === 'seed-gat'}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all"
                >
                  {loadingAction === 'seed-gat' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  Register & Seed to DB
                </button>
              </div>

              {/* Offline PWA Queue */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-sky-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Offline PWA Queue</h3>
                  </div>
                  {offlineCount > 0 && (
                    <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded font-mono">
                      {offlineCount} queued
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Simulate zero network in deep rural fields by queueing submissions in IndexedDB.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={handleOfflineSubmission}
                    disabled={loadingAction === 'offline-sub'}
                    className="w-full py-2 px-3 bg-sky-900/40 hover:bg-sky-900/70 border border-sky-700 text-sky-200 text-xs font-medium rounded-xl flex items-center justify-between transition-all"
                  >
                    <span className="flex items-center gap-1.5"><WifiOff className="w-3.5 h-3.5" /> Queue Offline Submission</span>
                    <span className="text-[10px] font-mono">Dexie IDB</span>
                  </button>
                  <button
                    onClick={handleDrainOfflineQueue}
                    disabled={loadingAction === 'drain-offline' || offlineCount === 0}
                    className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center justify-between transition-all"
                  >
                    <span className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" /> Reconnect & Drain Queue</span>
                    <span className="text-[10px] font-mono">Auto-Sync</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Section 4: Blackout Resilience & Database Disaster Recovery */}
            <div className="bg-slate-800/80 border border-red-500/40 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-red-400" />
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      4. Blackout Resilience & Disaster Recovery
                    </h2>
                    <span className="text-[11px] text-slate-400">
                      Live simulated database wipe, corruption health check, snapshot restoration & in-flight Dexie recovery.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold flex items-center gap-1.5 border ${
                    systemHealth?.healthy
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-sm shadow-emerald-900/50'
                      : 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                  }`}>
                    {systemHealth?.healthy ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        HEALTHY
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                        CORRUPTED
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleCreateSnapshot}
                    disabled={loadingAction === 'snapshot'}
                    title="Capture immediate database JSON snapshot"
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs flex items-center gap-1 border border-slate-600 transition-all"
                  >
                    {loadingAction === 'snapshot' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    <span className="text-[10px]">Take Snapshot</span>
                  </button>
                </div>
              </div>

              {/* Status summary bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">SUBMISSIONS:</span>
                  <span className="text-white font-bold">{systemHealth?.details?.submissionsCount ?? '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">FARMERS / GATS:</span>
                  <span className="text-slate-300">{systemHealth?.details?.farmersCount ?? '—'} / {systemHealth?.details?.gatsCount ?? '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SNAPSHOTS:</span>
                  <span className="text-cyan-300">{systemHealth?.details?.availableSnapshotsCount ?? 0} retained</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">AUTO-BACKUP:</span>
                  <span className="text-emerald-400">Every 2 min</span>
                </div>
              </div>

              {/* The 4 Action Buttons for Judges Demo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* 1. Simulate Blackout */}
                <button
                  onClick={handleSimulateBlackout}
                  disabled={loadingAction === 'blackout'}
                  className="p-3.5 bg-red-950/40 hover:bg-red-900/60 border-2 border-red-600/60 hover:border-red-500 rounded-xl text-left transition-all group shadow-lg"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-white group-hover:text-red-300 flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4 text-red-400" />
                      1. Simulate Blackout
                    </span>
                    <span className="text-[9px] bg-red-900/80 text-red-200 border border-red-700 px-1.5 py-0.5 rounded font-mono">
                      Wipe Submissions
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Deliberately drops Submissions collection & sets system integrity flag to CORRUPTED.
                  </p>
                </button>

                {/* 2. Check System Health */}
                <button
                  onClick={() => handleCheckHealth(true)}
                  disabled={loadingAction === 'health'}
                  className="p-3.5 bg-slate-900/80 hover:bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 rounded-xl text-left transition-all group shadow-lg"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-white group-hover:text-cyan-300 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      2. Check System Health
                    </span>
                    <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded font-mono">
                      /system_health
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Verifies DB integrity, record counts, and reports corrupted vs healthy state.
                  </p>
                </button>

                {/* 3. Restore from Snapshot */}
                <button
                  onClick={handleRestoreSnapshot}
                  disabled={loadingAction === 'restore'}
                  className="p-3.5 bg-emerald-950/40 hover:bg-emerald-900/60 border-2 border-emerald-600/60 hover:border-emerald-500 rounded-xl text-left transition-all group shadow-lg"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-white group-hover:text-emerald-300 flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-emerald-400" />
                      3. Restore from Snapshot
                    </span>
                    <span className="text-[9px] bg-emerald-900/80 text-emerald-200 border border-emerald-700 px-1.5 py-0.5 rounded font-mono">
                      Rollback Recovery
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Restores database from most recent snapshot; health check automatically returns to Healthy.
                  </p>
                </button>

                {/* 4. Replay In-Flight Submission */}
                <button
                  onClick={handleReplayInFlight}
                  disabled={loadingAction === 'replay-inflight'}
                  className="p-3.5 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/50 hover:border-sky-400 rounded-xl text-left transition-all group shadow-lg"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-white group-hover:text-sky-300 flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-sky-400" />
                      4. Replay In-Flight Submission
                    </span>
                    <span className="text-[9px] bg-sky-900/80 text-sky-200 border border-sky-700 px-1.5 py-0.5 rounded font-mono">
                      Dexie IDB Buffer
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Simulates submission queued in IndexedDB right before wipe, syncing it to DB post-restore.
                  </p>
                </button>

              </div>
            </div>

            {/* Section 5: Chaos Mode */}
            <div className="bg-gradient-to-r from-red-950/40 via-amber-950/40 to-slate-800/60 border border-red-500/30 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <Flame className="w-5 h-5 text-red-500" />
                  Chaos Mode: Full Dashboard Population
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  Generates batch submissions across all 5 outcomes simultaneously to populate maps, graphs, and officer review queues.
                </p>
              </div>
              <button
                onClick={handleChaos}
                disabled={loadingAction === 'chaos'}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 whitespace-nowrap transition-all hover:scale-105"
              >
                {loadingAction === 'chaos' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                Fire Chaos Mode
              </button>
            </div>

          </div>

          {/* Column 3: Live Output Inspector */}
          <div className="space-y-4">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-lg h-[740px] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Pipeline Output</h3>
                {logOutput && (
                  <span className="text-[10px] font-mono text-slate-400">{logOutput.timestamp}</span>
                )}
              </div>

              <div className="flex-1 bg-slate-950 rounded-xl p-4 overflow-y-auto font-mono text-xs text-slate-300 border border-slate-800 space-y-3">
                {logOutput ? (
                  <>
                    <div className={`p-3 rounded-xl border flex flex-col gap-1.5 font-sans ${
                      logOutput.type === 'error'
                        ? 'bg-red-950/40 border-red-500/50 text-red-200'
                        : logOutput.type === 'success'
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                        : 'bg-slate-900 border-slate-700 text-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{logOutput.title}</span>
                        {logOutput.explanation?.badge && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                            logOutput.explanation.severity === 'warning' || logOutput.explanation.severity === 'error'
                              ? 'bg-amber-900/60 text-amber-300 border border-amber-600/50'
                              : 'bg-emerald-900/60 text-emerald-300 border border-emerald-600/50'
                          }`}>
                            {logOutput.explanation.badge}
                          </span>
                        )}
                      </div>

                      {logOutput.explanation && (
                        <div className="mt-1 pt-2 border-t border-slate-700/60 space-y-1 text-xs">
                          <p className="font-semibold text-slate-100">{logOutput.explanation.title}</p>
                          <p className="text-[11px] text-slate-300"><span className="text-slate-400 font-medium">Cause:</span> {logOutput.explanation.cause}</p>
                          <p className="text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded-lg border border-amber-500/30">
                            <span className="font-bold text-amber-400">💡 Solution:</span> {logOutput.explanation.solution}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Raw Pipeline Data / Response</span>
                      <pre className="text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap break-all bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                        {JSON.stringify(logOutput.data, null, 2)}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-4">
                    <p className="text-xs">Click any trigger on the left to execute live backend pipeline logic.</p>
                    <p className="text-[10px] mt-1 text-slate-600">Results and explanations will stream here in real time.</p>
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

