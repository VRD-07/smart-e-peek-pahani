import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Smartphone } from 'lucide-react';
import api from '../services/api';

export const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('REQUEST_OTP'); // REQUEST_OTP, VERIFY_OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/request-otp', { phoneNumber, autoRegister: true });
      if (res.data?.data?.otp) {
        setOtp(res.data.data.otp);
      }
      setStep('VERIFY_OTP');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/verify-otp', { phoneNumber, otp });
      const { token } = response.data.data;
      localStorage.setItem('smart_e_peek_token', token);

      // Force reload or redirect to onboarding
      window.location.href = '/onboarding';
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 400) {
        if (err.response?.data?.code === 'OTP_EXPIRED' || err.response?.data?.message?.includes('expired')) {
          setError('OTP expired. Please request a new OTP.');
          setStep('REQUEST_OTP');
        } else {
          setError('Invalid OTP. Please try again.');
        }
      } else {
        setError('Unable to connect to server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/request-otp', { phoneNumber: '1234567890' });
      const response = await api.post('/auth/verify-otp', { phoneNumber: '1234567890', otp: '123456' });
      const { token } = response.data.data;
      localStorage.setItem('smart_e_peek_token', token);
      window.location.href = '/onboarding';
    } catch (err) {
      setError(err.response?.data?.message || 'Failed quick demo login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Farmer Login
        </h2>
        <p className="mt-1 text-center text-xs text-gray-500">
          Smart E-Peek Pahani • Murshatpur, Maharashtra
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100 space-y-6">
          
          {/* Quick Demo Login Option */}
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            ⚡ 1-Click Demo Login (Murshatpur Farmer)
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2 text-gray-400 font-semibold tracking-wider">Or Enter Mobile Number</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {step === 'REQUEST_OTP' ? (
            <form className="space-y-4" onSubmit={handleRequestOtp}>
              <div>
                <label htmlFor="phone" className="block text-xs font-semibold text-gray-700 mb-1">
                  Mobile Number (Any 10 digits)
                </label>
                <div className="mt-1 relative">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Sending OTP...' : 'Get OTP'}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleVerifyOtp}>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="otp" className="block text-xs font-semibold text-gray-700">
                    Enter OTP
                  </label>
                  <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded">
                    Demo OTP: 123456
                  </span>
                </div>
                <div className="mt-1">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono text-center tracking-widest text-lg"
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Verifying...' : 'Verify OTP & Continue'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
