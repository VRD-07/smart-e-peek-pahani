import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, Search, MapPin, User, FileText, CheckCircle2 } from 'lucide-react';
import { CropSelector, LocationCard, PhotoCapture, Review } from '../components/farmer';
import { db } from '../storage/db';
import api from '../services/api';

const STEPS = [
  { id: 'gat', title: 'जमीन / गट निवड' },
  { id: 'crop', title: 'पीक नोंदणी' },
  { id: 'location', title: 'स्थान पडताळणी' },
  { id: 'photo', title: 'पिकाचे छायाचित्र' },
  { id: 'review', title: 'पुनरावलोकन व सबमिट' }
];

export const FarmerOnboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  // Retrieve selected location from localStorage
  const savedLocation = JSON.parse(localStorage.getItem('smart_e_peek_location') || '{}');
  const villageName = savedLocation.village || 'Murshatpur';

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    village: villageName,
    taluka: savedLocation.taluka || 'Niphad',
    district: savedLocation.district || 'Nashik',
    division: savedLocation.division || 'Nashik',
    gat: '',
    gatId: '',
    crop: 'soybean',
    season: 'KHARIF',
    peekType: 'SINGLE',
    registeredArea: 1.0,
    waterSource: 'WELL',
    sowingDate: new Date().toISOString().split('T')[0],
    location: null,
    photo: null
  });

  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gatSearchQuery, setGatSearchQuery] = useState('');

  // Fetch farmer profile and associated Gats
  useEffect(() => {
    const fetchFarmer = async () => {
      try {
        setLoading(true);
        const response = await api.get('/farmers/me');
        const farmerData = response.data.data;
        setFarmer(farmerData);

        const defaultGat = farmerData.associatedGats?.[0];
        setFormData(prev => ({
          ...prev,
          name: farmerData.name || prev.name,
          mobile: farmerData.phoneNumber || prev.mobile,
          gatId: prev.gatId || defaultGat?._id,
          gat: prev.gat || defaultGat?.gatNumber || '101',
          village: defaultGat?.village || prev.village || villageName,
        }));

        // Load existing draft if any
        const draft = await db.submissions.where('status').equals('DRAFT').first();
        if (draft && draft.data) {
          setFormData(prev => ({ ...prev, ...draft.data }));
        }
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('शेतकरी प्रोफाइल लोड करण्यात अडचण आली.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFarmer();
  }, [navigate, villageName]);

  // Reset location if Gat changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, location: null }));
  }, [formData.gatId]);

  // Autosave draft
  useEffect(() => {
    const saveDraft = async () => {
      if (!formData.name && !formData.mobile) return;
      const draft = await db.submissions.where('status').equals('DRAFT').first();
      if (draft) {
        await db.submissions.update(draft.id, { data: formData, timestamp: Date.now() });
      } else {
        await db.submissions.add({
          status: 'DRAFT',
          data: formData,
          timestamp: Date.now()
        });
      }
    };
    saveDraft();
  }, [formData]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    } else {
      navigate('/login');
    }
  };

  const handleSubmit = async () => {
    const draft = await db.submissions.where('status').equals('DRAFT').first();
    if (draft) await db.submissions.delete(draft.id);

    const submissionId = await db.submissions.add({
      status: 'SYNC_PENDING',
      data: formData,
      timestamp: Date.now()
    });

    navigate(`/submission/${submissionId}`);
  };

  // Available Gats from farmer profile or default list
  const availableGats = farmer?.associatedGats?.length > 0
    ? farmer.associatedGats
    : (savedLocation.defaultGats || ['101', '102', '103', '104', '105', '106']).map(num => ({
        _id: `demo_${num}`,
        gatNumber: num,
        village: villageName,
        district: savedLocation.district || 'Nashik',
        registeredArea: num === '101' ? 2.5 : num === '102' ? 1.8 : num === '103' ? 3.2 : 2.0
      }));

  const filteredGats = availableGats.filter(g =>
    (g.gatNumber || '').toLowerCase().includes(gatSearchQuery.toLowerCase()) ||
    (g.village || '').toLowerCase().includes(gatSearchQuery.toLowerCase())
  );

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return Boolean(formData.gatId || formData.gat);
      case 1: return Boolean(formData.crop);
      case 2: return Boolean(formData.location) && (formData.location.isValid === true || formData.location.status === 'OUTSIDE');
      case 3: return Boolean(formData.photo);
      case 4: return true;
      default: return false;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <h2 className="text-sm font-bold text-gray-800">माहिती लोड होत आहे...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 p-4 max-w-md mx-auto w-full justify-center">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
          <h2 className="text-base font-bold text-gray-900">सूचना</h2>
          <p className="text-xs text-gray-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-xs font-bold"
          >
            पुन्हा प्रयत्न करा
          </button>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            {/* Farmer Profile Card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-600" />
                  <h3 className="font-bold text-gray-900 text-xs">शेतकरी तपशील (Farmer Profile)</h3>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                  सत्यापित
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">शेतकऱ्याचे नाव</p>
                  <p className="font-bold text-gray-900 truncate">{farmer?.name || formData.name || 'विठ्ठल पाटील'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">मोबाईल नंबर</p>
                  <p className="font-bold text-gray-900">{farmer?.phoneNumber || formData.mobile || 'N/A'}</p>
                </div>
                <div className="col-span-2 flex items-center gap-1 text-[11px] text-gray-600 bg-gray-50 p-2 rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                  <span className="truncate">गाव: {savedLocation.villageMr || villageName}, ता. {savedLocation.talukaMr || 'निफाड'}, जि. {savedLocation.districtMr || 'नाशिक'}</span>
                </div>
              </div>
            </div>

            {/* Gat & Survey Number Search Card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
              <div className="border-b pb-2.5">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary-600" />
                  गट नंबर / सर्व्हे नंबर निवडा (Select Gat)
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  आपल्या शेताचा ७/१२ गट नंबर निवडा किंवा शोधून काढा
                </p>
              </div>

              {/* Gat Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={gatSearchQuery}
                  onChange={(e) => setGatSearchQuery(e.target.value)}
                  placeholder="गट नंबर शोधा उदा. 101, 102..."
                  className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 rounded-2xl text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none bg-gray-50 focus:bg-white"
                />
              </div>

              {/* Gat Cards Grid */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredGats.map(g => {
                  const isSelected = formData.gat === g.gatNumber || formData.gatId === g._id;
                  return (
                    <div
                      key={g._id}
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          gatId: g._id,
                          gat: g.gatNumber,
                          village: g.village || villageName,
                          registeredArea: g.registeredArea ? Math.min(g.registeredArea, 1.0) : 1.0
                        }));
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-500'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                          🏛️ गट क्र. {g.gatNumber}
                        </p>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>गाव: {g.village || villageName}</span>
                        {g.registeredArea && (
                          <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md text-[11px]">
                            क्षेत्र: {g.registeredArea} हेक्टर (ha)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredGats.length === 0 && (
                  <div className="text-center py-4 text-xs text-gray-500 space-y-2">
                    <p>हा गट नंबर यादीत सापडला नाही.</p>
                    {gatSearchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          const customNum = gatSearchQuery.trim();
                          const defaultId = farmer?.associatedGats?.[0]?._id || `custom_${customNum}`;
                          setFormData(prev => ({
                            ...prev,
                            gatId: defaultId,
                            gat: customNum,
                            village: villageName
                          }));
                        }}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-xl text-xs font-bold"
                      >
                        + &quot;गट क्र. {gatSearchQuery}&quot; जोडा व पुढे जा
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <CropSelector
            formData={formData}
            setFormData={setFormData}
            gat={farmer?.associatedGats?.find(g => g._id === formData.gatId) || {
              gatNumber: formData.gat,
              registeredArea: formData.registeredArea || 1.0,
              village: formData.village
            }}
          />
        );

      case 2:
        return (
          <LocationCard
            formData={formData}
            setFormData={setFormData}
            gat={farmer?.associatedGats?.find(g => g._id === formData.gatId) || {
              gatNumber: formData.gat,
              village: formData.village
            }}
          />
        );

      case 3:
        return <PhotoCapture formData={formData} setFormData={setFormData} />;

      case 4:
        return <Review formData={formData} />;

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 max-w-md mx-auto w-full bg-gray-50 pb-32">
      {/* Progress Stepper Bar */}
      <div className="bg-white px-4 py-3.5 sticky top-16 z-30 border-b border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-bold text-emerald-700">
            पायरी {currentStep + 1} / {STEPS.length}
          </span>
          <span className="text-xs font-semibold text-gray-700">
            {STEPS[currentStep].title}
          </span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((s, idx) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                idx <= currentStep ? 'bg-emerald-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Step Content */}
      <div className="flex-1 p-4">
        {renderStepContent()}
      </div>

      {/* Sticky Bottom Navigation Bar (Always Visible & Elevated) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 z-50 shadow-2xl">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            type="button"
            onClick={handlePrev}
            className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold flex-shrink-0 transition-all"
            title="मागे जा"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid()}
            className={`flex-1 py-3.5 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              isStepValid()
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.99]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {currentStep === STEPS.length - 1 ? (
              <>
                <span>ई-पीक पाहणी नोंदणी पूर्ण करा</span>
                <Check className="w-5 h-5" />
              </>
            ) : (
              <>
                <span>पुढे जा (Next Step)</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
