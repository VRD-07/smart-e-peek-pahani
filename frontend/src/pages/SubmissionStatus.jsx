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

  const [progress, setProgress] = useState(0);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState(null);

  // No manual fetch needed, useLiveQuery handles it

  useEffect(() => {
    if (!submission || locationState?.bridgeData) return;

    if (submission.status === 'SYNC_PENDING' && !submission.error) {
      if (!isOnline) {
        setValidating(false);
        return; // Stays pending
      }

      setValidating(true);

      // Simulate validation progress UI for local sync flow
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            return 100;
          }
          return p + 10;
        });
      }, 300);

      const doSync = async () => {
        await syncPendingSubmissions();
        setValidating(false);
      };

      // Slight delay for UX
      const timeout = setTimeout(doSync, 2000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else {
      setValidating(false);
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

    // Processed Result (from backend or fallback from mock sync)
    const overallStatus = validation?.overallStatus || submission?.validationStatus || submission?.status;

    const statusConfig = {
      PASS: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', text: 'Validation Passed', desc: 'All checks passed successfully.' },
      VALID: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', text: 'Validation Passed', desc: 'All checks passed successfully.' },
      FAIL: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', text: 'Validation Failed', desc: 'Location or photo did not meet criteria.' },
      INVALID: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', text: 'Validation Failed', desc: 'Location or photo did not meet criteria.' },
      REVIEW: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', text: 'Needs Manual Review', desc: 'Our team will review your submission.' },
      PENDING_VALIDATION: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', text: 'Pending Validation', desc: 'Submission received. Validation is running.' },
    };

    const config = statusConfig[overallStatus] || statusConfig.REVIEW;
    const Icon = config.icon;

    return (
      <div className="text-center space-y-4">
        <div className={`w-24 h-24 ${config.bg} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <Icon className={`w-12 h-12 ${config.color}`} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{config.text}</h2>
        <p className="text-gray-500">{config.desc}</p>
        <p className="text-xs text-gray-400 mt-1">Submission Status: {submission?.status}</p>

        {validation && (
          <div className="mt-6 space-y-4 text-left border-t border-gray-100 pt-4">
            <h4 className="font-semibold text-gray-900">Validation Details</h4>

            {validation.checks?.crop && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="font-medium">Crop Evidence</p>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">Declared:</span>
                  <span>{validation.checks.crop.declaredCrop || 'N/A'}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">AI Detected:</span>
                  <span>{validation.checks.crop.detectedCrop || 'N/A'}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">Confidence:</span>
                  <span>{validation.checks.crop.confidence ? `${(validation.checks.crop.confidence * 100).toFixed(0)}%` : 'N/A'}</span>
                </div>
              </div>
            )}

            {validation.checks?.location && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="font-medium">Location Evidence</p>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">Inside Gat Boundary:</span>
                  <span>{validation.checks.location.insideGat ? 'Yes' : 'No'}</span>
                </div>
                {validation.checks.location.distanceFromBoundary !== undefined && (
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-500">Distance to Boundary:</span>
                    <span>{validation.checks.location.distanceFromBoundary.toFixed(2)}m</span>
                  </div>
                )}
              </div>
            )}

            {validation.reasons && validation.reasons.length > 0 && (
              <div className="bg-red-50 p-4 rounded-xl text-sm">
                <h4 className="font-semibold text-red-800 mb-2">Issues found:</h4>
                <ul className="list-disc list-inside text-red-700 space-y-1">
                  {validation.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 p-4 max-w-md mx-auto w-full">
      <div className="flex-1 flex flex-col justify-center items-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 w-full">
          {renderResult()}
        </div>
      </div>
      <div className="mt-auto pt-4">
        <Button onClick={() => navigate('/')} variant={validating ? 'outline' : 'primary'}>
          <Home className="w-5 h-5" />
          Back to Home
        </Button>
      </div>
    </div>
  );
};
