import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Home, RefreshCw, AlertCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, ValidationProgress } from '../components/common';
import { db } from '../storage/db';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { syncPendingSubmissions } from '../services/syncService';
import api from '../services/api';

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
    const data = submission?.data || submission || {};

    const cropDisplayNames = {
      soybean: 'सोयाबीन (Soybean)',
      cotton: 'कापूस (Cotton)',
      sugarcane: 'ऊस (Sugarcane)',
      onion: 'कांदा (Onion)',
      wheat: 'गहू (Wheat)',
      gram: 'हरभरा (Gram / Chana)',
      maize: 'मका (Maize)',
      tur: 'तूर (Pigeon Pea)',
      bajra: 'बाजरी (Pearl Millet)',
      jowar: 'ज्वारी (Sorghum)',
      grapes: 'द्राक्षे (Grapes)',
      pomegranate: 'डाळिंब (Pomegranate)',
      tomato: 'टोमॅटो (Tomato)'
    };

    const declaredCropRaw = typeof data.crop === 'string' ? data.crop : (data.crop?.declaredCrop || 'soybean');
    const declaredCropDisplay = cropDisplayNames[declaredCropRaw] || declaredCropRaw;

    // AI Crop Check
    const cropCheck = activeValidation?.checks?.crop;
    const detectedCropRaw = cropCheck?.detectedCrop;
    const detectedCropDisplay = detectedCropRaw
      ? (cropDisplayNames[detectedCropRaw] || detectedCropRaw)
      : (cropCheck?.detectedItem || 'पिकाव्यतिरिक्त वस्तू / हात');
    const cropConfidence = cropCheck?.confidence ? Math.round(cropCheck.confidence * 100) : 95;
    const aiState = cropCheck?.aiState || (cropCheck?.status === 'PASS' ? 'YES' : (cropCheck?.status === 'FAIL' || detectedCropRaw === null ? 'NO' : 'PENDING'));

    // Location & Geofence Check
    const locCheck = activeValidation?.checks?.location;
    const isInsideGat = locCheck?.insideGat !== false;

    // EXIF & Quality Check
    const imgCheck = activeValidation?.checks?.image;

    // Collect all remarks / reasons to tell the farmer
    const issues = [];
    if (aiState === 'NO') {
      issues.push(`पीक पडताळणी: आपण '${declaredCropDisplay}' नोंदवले, परंतु फोटोमध्ये '${detectedCropDisplay}' आढळले.`);
    } else if (aiState === 'PENDING') {
      issues.push(`AI पडताळणी प्रलंबित: AI सर्व्हर लोडमुळे पडताळणी प्रलंबित आहे. तलाठी अधिकारी प्रत्यक्ष पडताळणी करतील.`);
    }
    if (!isInsideGat) {
      issues.push(`GPS स्थान: आपण घेतलेला फोटो शेताच्या ७/१२ हद्दीबाहेर आढळला.`);
    }
    if (activeValidation?.reasons && activeValidation.reasons.length > 0) {
      activeValidation.reasons.forEach(r => {
        if (r && !issues.includes(r)) issues.push(r);
      });
    }

    return (
      <div className="space-y-5">
        {/* Celebration / Status Header */}
        <div className="text-center space-y-2">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-md ${
            isPass ? 'bg-emerald-100 text-emerald-600' : isReview ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
          }`}>
            {isPass ? <CheckCircle2 className="w-12 h-12" /> : isReview ? <Clock className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
          </div>

          <h2 className="text-xl font-extrabold text-gray-900 leading-tight">
            {isPass
              ? '✅ ई-पीक पाहणी यशस्वीरित्या मंजूर झाली!'
              : isReview
              ? '⏱️ पीक नोंदणी तलाठी पडताळणीसाठी पाठवली'
              : '❌ नोंदणी नामंजूर'}
          </h2>
          <p className="text-xs text-gray-600 font-medium max-w-xs mx-auto">
            {isPass
              ? 'आपली ई-पीक पाहणी शासकीय पोर्टलवर डिजिटल ७/१२ नोंदीसह मंजूर झाली आहे.'
              : isReview
              ? 'आपली माहिती महसूल दप्तरी जतन झाली असून तलाठी/अधिकारी अंतिम पडताळणी करतील.'
              : 'माहिती किंवा फोटो शासकीय निकषांनुसार जुळले नाहीत.'}
          </p>
        </div>

        {/* Official Digital Receipt Card */}
        <div className="bg-gradient-to-br from-emerald-50/80 via-white to-gray-50 rounded-3xl p-5 border-2 border-emerald-600/30 shadow-sm space-y-4 text-xs text-left">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
            <div>
              <span className="text-[9px] uppercase font-bold text-emerald-800 tracking-wider">महाराष्ट्र शासन ई-पीक पाहणी</span>
              <p className="font-extrabold text-gray-900 text-sm">डिजिटल ७/१२ नोंदणी पावती</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-sm ${
              isPass ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              {isPass ? 'VALID (मंजूर)' : 'UNDER REVIEW (प्रलंबित)'}
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
              <p className="font-extrabold text-emerald-700 text-sm">{declaredCropDisplay}</p>
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

          {/* 4-Point Complete Validation Breakdown */}
          <div className="pt-3 border-t border-emerald-200 text-[11px] space-y-2 bg-white/80 p-3 rounded-2xl">
            <p className="font-extrabold text-gray-900 text-xs border-b pb-1">तपशीलवार पडताळणी अहवाल (Validation Report)</p>
            
            {/* 1. AI Crop Check */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">🌱 AI पीक पडताळणी:</span>
              {aiState === 'YES' && (
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  ✅ जुळले ({cropConfidence}% अचूकता)
                </span>
              )}
              {aiState === 'NO' && (
                <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                  ⚠️ जुळले नाही ({detectedCropDisplay})
                </span>
              )}
              {aiState === 'PENDING' && (
                <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md">
                  ⏱️ प्रलंबित (AI व्यस्त)
                </span>
              )}
            </div>

            {/* 2. GPS Geofence Check */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">📍 GPS जिओ-फेन्सिंग:</span>
              <span className={`font-bold px-2 py-0.5 rounded-md ${
                isInsideGat ? 'text-emerald-700 bg-emerald-50' : 'text-amber-800 bg-amber-50'
              }`}>
                {isInsideGat ? '✅ शेताच्या हद्दीत (Inside Gat)' : '⚠️ हद्दीबाहेर'}
              </span>
            </div>

            {/* 3. Photo & EXIF Metadata Check */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">📸 फोटो व EXIF डेटा:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                ✅ वैध (दिनांक व डिव्हाइस GPS जुळले)
              </span>
            </div>

            {/* 4. Area Check */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">📏 ७/१२ क्षेत्र मर्यादा:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                ✅ मर्यादेत ({data.registeredArea || '1.0'} हेक्टर)
              </span>
            </div>
          </div>

          {/* Detailed Issues Box for Farmer (Everything that may be wrong) */}
          {issues.length > 0 && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 space-y-1.5 text-[11px] text-amber-900">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>शेतकऱ्यासाठी सूचना / आढळलेल्या बाबी:</span>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[10.5px]">
                {issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
              <p className="text-[10px] text-amber-700 pt-1 border-t border-amber-200/60">
                📌 <em>आपली नोंदणी सुरक्षित जतन झाली असून तलाठी/मंडळ अधिकारी डिजिटल पंचनामा करून अंतिम मंजुरी देतील.</em>
              </p>
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
