import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, MapPin, UserPlus, LogIn, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import api from '../services/api';

export const Login = () => {
  const navigate = useNavigate();
  const locationState = useLocation().state;

  // Retrieve location from state or localStorage
  const savedLocation = locationState?.selectedLocation || JSON.parse(localStorage.getItem('smart_e_peek_location') || '{}');
  const villageDisplay = savedLocation.villageMr || savedLocation.village || 'मुर्शदपूर (Murshatpur)';
  const talukaDisplay = savedLocation.talukaMr || savedLocation.taluka || 'निफाड (Niphad)';
  const districtDisplay = savedLocation.districtMr || savedLocation.district || 'नाशिक (Nashik)';

  const [authMode, setAuthMode] = useState('REGISTER'); // 'REGISTER' or 'LOGIN'
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('REQUEST_OTP'); // 'REQUEST_OTP' or 'VERIFY_OTP'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState(null);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('कृपया १० अंकी वैध मोबाईल नंबर प्रविष्ट करा.');
      return;
    }
    if (authMode === 'REGISTER' && !fullName.trim()) {
      setError('कृपया आपले पूर्ण नाव प्रविष्ट करा.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/request-otp', {
        phoneNumber,
        name: fullName.trim() || undefined,
        village: savedLocation.village,
        taluka: savedLocation.taluka,
        district: savedLocation.district,
        division: savedLocation.division,
        autoRegister: true
      });
      setOtpSuccessMsg(`आपल्या +91 ${phoneNumber} या WhatsApp क्रमांकावर OTP पाठवला आहे.`);
      setStep('VERIFY_OTP');
    } catch (err) {
      setError(err.response?.data?.message || 'सर्व्हरशी संपर्क होऊ शकला नाही. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('कृपया OTP प्रविष्ट करा.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/verify-otp', { phoneNumber, otp });
      const { token } = response.data.data;
      localStorage.setItem('smart_e_peek_token', token);

      // Redirect to Gat Selection & Survey Onboarding
      window.location.href = '/onboarding';
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 400) {
        if (err.response?.data?.code === 'OTP_EXPIRED') {
          setError('OTP ची मुदत संपली आहे. कृपया नवीन OTP मागवा.');
          setStep('REQUEST_OTP');
        } else {
          setError('अवैध OTP. कृपया WhatsApp वर आलेला योग्य ६-अंकी OTP टाका.');
        }
      } else {
        setError('सर्व्हरशी संपर्क होऊ शकला नाही.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/request-otp', {
        phoneNumber: '1234567890',
        name: 'Demo Farmer',
        village: 'Murshatpur'
      });
      const response = await api.post('/auth/verify-otp', { phoneNumber: '1234567890', otp: '123456' });
      const { token } = response.data.data;
      localStorage.setItem('smart_e_peek_token', token);
      window.location.href = '/onboarding';
    } catch (err) {
      setError(err.response?.data?.message || 'डेमो लॉगिन अयशस्वी.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 max-w-md mx-auto w-full p-4 pb-28">
      {/* Location Badge Header */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 font-semibold uppercase">निवडलेले स्थान</p>
            <p className="text-xs font-bold text-gray-900 truncate">
              {villageDisplay}, {talukaDisplay}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-xs text-primary-600 font-bold hover:underline px-2 py-1 bg-primary-50 rounded-lg flex-shrink-0"
        >
          बदला (Change)
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase text-primary-600">पायरी २/३</span>
            <h2 className="text-base font-bold text-gray-900">शेतकरी ओळख व पडताळणी</h2>
          </div>
          <ShieldCheck className="w-6 h-6 text-primary-600" />
        </div>

        {/* 1-Click Demo Login Banner */}
        <button
          type="button"
          onClick={handleQuickDemoLogin}
          disabled={loading}
          className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
          ⚡ थेट १-क्लिक डेमो लॉगिन (Quick Demo Login)
        </button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white px-2 text-gray-400 font-semibold">किंवा मोबाईल नंबर वापरा</span>
          </div>
        </div>

        {step === 'REQUEST_OTP' && (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => { setAuthMode('REGISTER'); setError(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'REGISTER'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              नवीन नोंदणी
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('LOGIN'); setError(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'LOGIN'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              साइन इन (लॉगिन)
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-2xl text-xs font-medium">
            {error}
          </div>
        )}

        {step === 'REQUEST_OTP' ? (
          <form className="space-y-3.5" onSubmit={handleRequestOtp}>
            {authMode === 'REGISTER' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  शेतकऱ्याचे पूर्ण नाव (Full Name)
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="उदा. विठ्ठल रामराव पाटील"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none bg-gray-50 focus:bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                मोबाईल नंबर (१०-अंकी WhatsApp नंबर)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-gray-500">
                  +91
                </div>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  maxLength={10}
                  className="w-full pl-12 pr-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold tracking-wider focus:ring-2 focus:ring-primary-500 focus:outline-none bg-gray-50 focus:bg-white"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                पडताळणी कोड आपल्या WhatsApp वर त्वरित पाठवला जाईल.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'OTP पाठवत आहे...' : 'WhatsApp वर OTP मिळवा ➔'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleVerifyOtp}>
            {otpSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{otpSuccessMsg}</span>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-gray-700">
                  WhatsApp OTP प्रविष्ट करा (Enter 6-Digit OTP)
                </label>
                <button
                  type="button"
                  onClick={() => { setStep('REQUEST_OTP'); setError(null); }}
                  className="text-[11px] text-primary-600 hover:underline flex items-center gap-0.5"
                >
                  <ArrowLeft className="w-3 h-3" /> नंबर बदला
                </button>
              </div>

              <input
                type="text"
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                maxLength={6}
                className="w-full py-3 text-center border-2 border-primary-400 rounded-2xl text-xl font-mono tracking-widest text-gray-900 focus:ring-2 focus:ring-primary-500 focus:outline-none bg-primary-50/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'पडताळणी करत आहे...' : 'पडताळणी करा आणि पुढे जा (Verify & Continue) ➔'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
