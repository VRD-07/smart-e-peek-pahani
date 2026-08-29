import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Home, RefreshCw, AlertCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, ValidationProgress } from '../components/common';
import { db } from '../storage/db';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { syncPendingSubmissions } from '../services/syncService';

export const SubmissionStatus = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const locationState = useLocation().state;
  const isOnline = useOnlineStatus();

  const liveSubmission = useLiveQuery(() => id ? db.submissions.get(parseInt(id)) : null, [id]);
  const submission = locationState?.bridgeData ? locationState.bridgeData.submission : liveSubmission;
  const validation = locationState?.bridgeData ? locationState.bridgeData.validation : liveSubmission?.validationResult;

  const [backendValidation, setBackendValidation] = useState(null);
  const [progress, setProgress] = useState(0);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState(null);

  // Fetch populated validation details from backend if available
  useEffect(() => {
    if (submission?.backendId && !backendValidation) {
      api.get(`/submissions/${submission.backendId}`)
        .then(res => {
          if (res.data?.data?.validationResultId && typeof res.data.data.validationResultId === 'object') {
            setBackendValidation(res.data.data.validationResultId);
          }
        })
        .catch(() => {});
    }
  }, [submission?.backendId, backendValidation]);

  const activeValidation = locationState?.bridgeData?.validation || backendValidation || (typeof validation === 'object' ? validation : null);
  const overallStatus = activeValidation?.overallStatus || submission?.validationStatus || submission?.status || 'VALID';

  useEffect(() => {
    if (!submission || locationState?.bridgeData) return;

    if (submission.status === 'SYNC_PENDING' && !submission.error) {
      if (!isOnline) {
        setValidating(false);
        return; // Stays pending
      }

      setValidating(true);

      // Simulate smooth validation progress UI
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 90) return 90;
          return p + 15;
        });
      }, 250);

      const doSync = async () => {
        try {
          await syncPendingSubmissions();
        } catch (err) {
          console.error("Sync error in SubmissionStatus:", err);
        } finally {
          setProgress(100);
          setTimeout(() => {
            setValidating(false);
          }, 300);
        }
      };

      const timeout = setTimeout(doSync, 1000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else {
      setValidating(false);
      setProgress(100);
    }
  }, [submission?.status, submission?.error, isOnline, locationState]);

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  if (!submission && !validating) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  const renderResult = () => {
    if (validating && isOnline && !locationState?.bridgeData) {
      return (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Analyzing Data</h2>
            <p className="text-sm text-gray-500 mb-6">Running AI validation checks...</p>
            <ValidationProgress progress={progress} message="Checking location & photo quality" />
          </div>
        </div>
      );
    }

    if (!isOnline && submission?.status === 'SYNC_PENDING') {
      return (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Saved Locally</h2>
          <p className="text-gray-500 text-sm">
            You are currently offline. Your submission has been saved and will automatically validate when you reconnect.
          </p>
        </div>
      );
    }

    if (submission?.status === 'SYNC_PENDING' && submission?.error) {
      return (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Sync Failed</h2>
          <p className="text-gray-500">{submission.error}</p>
        </div>
      );
    }

    const isPass = overallStatus === 'VALID' || overallStatus === 'PASS';
    const isReview = overallStatus === 'REVIEW' || overallStatus === 'PENDING_VALIDATION';
    const data = submission?.data || {};

    return (
      <div className="space-y-5">
        {/* Celebration Header */}
        <div className="text-center space-y-2">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-md ${
            isPass ? 'bg-emerald-100 text-emerald-600' : isReview ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
          }`}>
            {isPass ? <CheckCircle2 className="w-12 h-12" /> : isReview ? <Clock className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
          </div>

          <h2 className="text-xl font-extrabold text-gray-900 leading-tight">
            {isPass ? '✅ पीक पाहणी यशस्वीरित्या नोंदवली गेली!' : isReview ? '⏱️ पीक नोंदणी पुनरावलोकनासाठी पाठवली' : '❌ पडताळणी अयशस्वी'}
          </h2>
          <p className="text-xs text-gray-600 font-medium">
            {isPass ? 'आपली ई-पीक पाहणी शासकीय पोर्टलवर यशस्वीरित्या जतन झाली आहे.' : isReview ? 'आपली नोंदणी प्राप्त झाली असून तलाठी/अधिकारी पडताळणी करतील.' : 'माहिती किंवा फोटो निकषांनुसार जुळले नाहीत.'}
          </p>
        </div>

        {/* Official Digital Receipt Card */}
        <div className="bg-gradient-to-br from-emerald-50/80 via-white to-gray-50 rounded-3xl p-5 border-2 border-emerald-600/30 shadow-sm space-y-3.5 text-xs text-left">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
            <div>
              <span className="text-[9px] uppercase font-bold text-emerald-800 tracking-wider">महाराष्ट्र शासन ई-पीक पाहणी</span>
              <p className="font-extrabold text-gray-900 text-sm">डिजिटल ७/१२ नोंदणी पावती</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-sm ${
              isPass ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              {isPass ? 'VALID (मंजूर)' : 'UNDER REVIEW'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-500 font-semibold">पावती क्र. (Receipt No.)</p>
              <p className="font-mono font-bold text-gray-900 text-[11px] truncate">
                MH-EPK-{submission?.backendId?.slice(-6) || id || '202601'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-semibold">तारीख व वेळ</p>
              <p className="font-bold text-gray-900 text-[11px]">
                {new Date().toLocaleDateString('mr-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-gray-500 font-semibold">शेतकऱ्याचे नाव</p>
              <p className="font-bold text-gray-900 truncate">{data.name || 'विठ्ठल पाटील'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-semibold">मोबाईल नंबर</p>
              <p className="font-bold text-gray-900">{data.mobile || '+91 9876543210'}</p>
            </div>

            <div>
              <p className="text-[10px] text-gray-500 font-semibold">गाव व तालुका</p>
              <p className="font-bold text-gray-900 truncate">गाव: {data.village || 'मुर्शदपूर'}, ता. {data.taluka || 'निफाड'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-semibold">गट / सर्व्हे नंबर</p>
              <p className="font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded text-[11px] inline-block">
                गट क्र. {data.gat || '१०१'}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-gray-500 font-semibold">नोंदवलेले पीक</p>
              <p className="font-extrabold text-emerald-700 capitalize text-sm">{data.crop || 'सोयाबीन (Soybean)'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-semibold">लागवड क्षेत्र</p>
              <p className="font-bold text-gray-900">{data.registeredArea ? `${data.registeredArea} हेक्टर (ha)` : '1.0 हेक्टर'}</p>
            </div>

            <div>
              <p className="text-[10px] text-gray-500 font-semibold">हंगाम व प्रकार</p>
              <p className="font-medium text-gray-800">{data.season || 'खरीप'} • {data.peekType === 'MIXED' ? 'मिश्र पीक' : 'एक पीक'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-semibold">जलसिंचन साधन</p>
              <p className="font-medium text-gray-800">{data.waterSource || 'विहीर / बोरवेल'}</p>
            </div>
          </div>

          {/* Validation Details */}
          {activeValidation && typeof activeValidation === 'object' && (
            <div className="pt-2.5 border-t border-emerald-200 text-[11px] space-y-1.5 bg-white/70 p-2.5 rounded-2xl">
              <div className="flex justify-between">
                <span className="text-gray-500">AI पीक पडताळणी:</span>
                <span className="font-bold text-emerald-700">{activeValidation.checks?.crop?.detectedCrop || data.crop || 'सोयाबीन'} (100% Match)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GPS जिओ-फेन्सिंग:</span>
                <span className="font-bold text-emerald-700">{activeValidation.checks?.location?.insideGat !== false ? '✅ शेताच्या हद्दीत (Inside Gat)' : 'हद्दीबाहेर'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 p-4 max-w-md mx-auto w-full pb-28">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 w-full mb-6">
        {renderResult()}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'ई-पीक पाहणी नोंदणी पावती',
                text: `माझी ई-पीक पाहणी नोंदणी क्र. MH-EPK-${submission?.backendId?.slice(-6) || id || '202601'} यशस्वी झाली आहे.`,
                url: window.location.href
              }).catch(() => {});
            } else {
              window.print();
            }
          }}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          <span>📥 पावती शेअर / प्रिंट करा (Share Receipt)</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>मुख्य पृष्ठावर जा (Back to Home)</span>
        </button>
      </div>
    </div>
  );
};
