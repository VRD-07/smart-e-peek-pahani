import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RefreshCw, XCircle } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/common';

export const WebBridge = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('No token provided in the URL.');
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await api.get(`/bridge/verify?token=${token}`);
        const { submission, validation } = response.data.data;

        // Clear the token from the URL for security
        // and navigate to the submission status page, passing the data in state.
        // We use replace: true so the user can't go back to the token URL.
        navigate(`/submission/${submission.id}`, {
          replace: true,
          state: {
            bridgeData: { submission, validation }
          }
        });

      } catch (err) {
        setLoading(false);
        if (err.response) {
          const status = err.response.status;
          if (status === 400 || status === 401 || status === 403) {
            setError(err.response.data?.error || 'Invalid, expired, or used token.');
          } else if (status === 404) {
            setError('Submission not found.');
          } else {
            setError('Server error while verifying token.');
          }
        } else {
          setError('Network error. Unable to reach the server.');
        }

        // Remove token from URL even on error for security
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    verifyToken();
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <RefreshCw className="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Verifying Submission...</h2>
        <p className="text-gray-500 mt-2">Please wait while we fetch your WhatsApp submission details.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 p-4 max-w-md mx-auto w-full justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Button onClick={() => navigate('/')} variant="primary">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
