import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '../components/common';
import { CropSelector, LocationCard, PhotoCapture, Review } from '../components/farmer';
import { db } from '../storage/db';
import api from '../services/api';

const STEPS = [
  { id: 'details', title: 'Basic Details' },
  { id: 'location', title: 'Location' },
  { id: 'photo', title: 'Photograph' },
  { id: 'review', title: 'Review' }
];

export const FarmerOnboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '', mobile: '', village: '', gat: '', crop: '', location: null, photo: null
  });

  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeHubTab, setActiveHubTab] = useState('crop');
  const [historyList, setHistoryList] = useState([]);
  const [plantingsList, setPlantingsList] = useState([]);
  const [plantingForm, setPlantingForm] = useState({ plantingType: '', count: '', approximateLocation: '' });
  const [plantingSuccess, setPlantingSuccess] = useState(false);

  // Fetch Gat history and plantings when Gat selection changes
  useEffect(() => {
    if (formData.gatId) {
      api.get(`/farmers/gats/${formData.gatId}/history`)
        .then(res => setHistoryList(res.data.data || []))
        .catch(() => setHistoryList([]));

      api.get(`/farmers/plantings?gatId=${formData.gatId}`)
        .then(res => setPlantingsList(res.data.data || []))
        .catch(() => setPlantingsList([]));
    }
  }, [formData.gatId]);

  const handlePlantingSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/farmers/plantings', {
        gatId: formData.gatId,
        plantingType: plantingForm.plantingType,
        count: plantingForm.count ? parseInt(plantingForm.count, 10) : undefined,
        approximateLocation: { text: plantingForm.approximateLocation }
      });
      setPlantingSuccess(true);
      setPlantingForm({ plantingType: '', count: '', approximateLocation: '' });
      // Refresh list
      const res = await api.get(`/farmers/plantings?gatId=${formData.gatId}`);
      setPlantingsList(res.data.data || []);
      setTimeout(() => setPlantingSuccess(false), 3000);
    } catch (err) {
      alert('Failed to register planting');
    }
  };
  useEffect(() => {
    const fetchFarmer = async () => {
      try {
        setLoading(true);
        const response = await api.get('/farmers/me');
        const farmerData = response.data.data;
        setFarmer(farmerData);

        if (farmerData.associatedGats && farmerData.associatedGats.length === 1) {
          const singleGat = farmerData.associatedGats[0];
          setFormData(prev => ({
            ...prev,
            gatId: singleGat._id,
            name: farmerData.name,
            mobile: farmerData.phoneNumber,
            village: singleGat.village,
            gat: singleGat.gatNumber
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            name: farmerData.name,
            mobile: farmerData.phoneNumber
          }));
        }

        const draft = await db.submissions.where('status').equals('DRAFT').first();
        if (draft && farmerData.associatedGats?.some(g => g._id === draft.data?.gatId)) {
          setFormData(prev => ({ ...prev, ...draft.data }));
        }
      } catch (err) {
        if (err.response) {
          if (err.response.status === 404) setError('Farmer profile could not be found.');
          else if (err.response.status === 400) setError('No land parcel is currently associated with this farmer.');
          else setError('Failed to load farmer profile.');
        } else {
          setError('Network error. Unable to reach the server.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFarmer();
  }, []);

  useEffect(() => {
    setFormData(prev => {
      if (prev.location) {
        return { ...prev, location: null };
      }
      return prev;
    });
  }, [formData.gatId]);

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
      navigate('/');
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Farmer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{farmer?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Mobile Number</p>
                  <p className="font-medium text-gray-900">{farmer?.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Language</p>
                  <p className="font-medium text-gray-900">{farmer?.preferredLanguage === 'mr' ? 'मराठी (Marathi)' : 'English'}</p>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 border-b pb-2 mt-4">जमीन निवडा (Select Your Land)</h3>
              {farmer?.associatedGats?.length > 0 ? (
                <div className="space-y-3">
                  {farmer.associatedGats.map(gat => (
                    <div
                      key={gat._id}
                      onClick={() => setFormData(prev => ({ ...prev, gatId: gat._id, village: gat.village, gat: gat.gatNumber }))}
                      className={`p-3 rounded-xl border cursor-pointer transition-colors ${formData.gatId === gat._id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-semibold text-gray-900">गट क्र. {gat.gatNumber}</p>
                        {formData.gatId === gat._id && <Check className="w-5 h-5 text-primary-600" />}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>गाव: {gat.village}, जि. {gat.district}</span>
                        {gat.registeredArea && <span className="font-medium text-primary-700">{gat.registeredArea} ha</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No Gats assigned.</p>
              )}
            </div>

            {formData.gatId && (
              <div className="space-y-4">
                {/* Farm Action Hub Navigation */}
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveHubTab('crop')}
                    className={`py-2 text-[11px] font-semibold rounded-lg transition-all ${activeHubTab === 'crop' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    पीक नोंदणी
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveHubTab('history')}
                    className={`py-2 text-[11px] font-semibold rounded-lg transition-all ${activeHubTab === 'history' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    इतिहास ({historyList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveHubTab('plantings')}
                    className={`py-2 text-[11px] font-semibold rounded-lg transition-all ${activeHubTab === 'plantings' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    बांध लागवड
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveHubTab('other')}
                    className={`py-2 text-[11px] font-semibold rounded-lg transition-all ${activeHubTab === 'other' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    इतर नोंदी
                  </button>
                </div>

                {/* Tab 1: Crop Survey */}
                {activeHubTab === 'crop' && (
                  <CropSelector
                    formData={formData}
                    setFormData={setFormData}
                    gat={farmer?.associatedGats?.find(g => g._id === formData.gatId)}
                  />
                )}

                {/* Tab 2: History */}
                {activeHubTab === 'history' && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
                    <h3 className="font-semibold text-gray-900 text-sm border-b pb-2">गट क्र. {formData.gat} वरील मागील नोंदी (Filing History)</h3>
                    {historyList.length === 0 ? (
                      <p className="text-xs text-gray-500 py-4 text-center">या गटावर अद्याप कोणतीही नोंद आढळली नाही.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {historyList.map(sub => (
                          <div key={sub._id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-900">{sub.crop?.declaredCrop || 'Unknown Crop'}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sub.status === 'VALID' ? 'bg-green-100 text-green-800' :
                                sub.status === 'REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                                sub.status === 'INVALID' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {sub.status}
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-500 text-[11px]">
                              <span>क्षेत्र: {sub.registeredArea ? `${sub.registeredArea} ha` : '-'}</span>
                              <span>तारीख: {new Date(sub.sowingDate || sub.createdAt).toLocaleDateString('mr-IN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Boundary Plantings */}
                {activeHubTab === 'plantings' && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">बांध लागवड नोंदणी (Boundary Tree / Hedge Planting)</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">शेताच्या बांधावरील झाडे व फळझाडे नोंदवा (माहितीसाठी)</p>
                    </div>

                    {plantingSuccess && (
                      <div className="p-2.5 bg-green-50 text-green-800 rounded-xl text-xs font-medium">
                        ✓ बांध लागवड यशस्वीरित्या नोंदवली गेली!
                      </div>
                    )}

                    <form onSubmit={handlePlantingSubmit} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">झाडाचा / वनस्पतीचा प्रकार (Tree / Plant Type)</label>
                        <input
                          type="text"
                          required
                          value={plantingForm.plantingType}
                          onChange={(e) => setPlantingForm(prev => ({ ...prev, plantingType: e.target.value }))}
                          placeholder="उदा. आंबा, सागवान, बांबू, निंब"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">संख्या (Count)</label>
                          <input
                            type="number"
                            min="1"
                            value={plantingForm.count}
                            onChange={(e) => setPlantingForm(prev => ({ ...prev, count: e.target.value }))}
                            placeholder="उदा. 15"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">अंदाजे जागा (Location)</label>
                          <input
                            type="text"
                            value={plantingForm.approximateLocation}
                            onChange={(e) => setPlantingForm(prev => ({ ...prev, approximateLocation: e.target.value }))}
                            placeholder="उदा. उत्तरेकडील बांध"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                      >
                        नोंद जतन करा (Save Planting Record)
                      </button>
                    </form>

                    {plantingsList.length > 0 && (
                      <div className="pt-3 border-t space-y-2">
                        <h4 className="font-semibold text-gray-800 text-xs">नोंदवलेली झाडे:</h4>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {plantingsList.map(p => (
                            <div key={p._id} className="p-2 bg-gray-50 rounded-lg text-[11px] flex justify-between">
                              <span className="font-medium text-gray-900">{p.plantingType} {p.count ? `(${p.count})` : ''}</span>
                              <span className="text-gray-500">{p.approximateLocation?.text || 'बांध'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 4: Other Actions Stub */}
                {activeHubTab === 'other' && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
                    <h3 className="font-semibold text-gray-900 text-sm border-b pb-2">इतर शासकीय नोंदणी सेवा (Other Land Actions)</h3>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                      <p className="font-semibold">⚠️ पुढील सेवा सध्या डिजिटल विकासाधीन आहेत (Planned in next release):</p>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                        <li>शेतरस्ता / वहिवाट नोंदणी (Farm Road Registration)</li>
                        <li>विहीर / कूपनलिका स्वतंत्र नोंद (Independent Well Registry)</li>
                        <li>पडिक जमीन / अकृषिक क्षेत्र नोंद (Fallow Land Registry)</li>
                      </ul>
                      <p className="text-[10px] text-amber-700 italic">शासकीय ई-पीक पाहणी मानकांनुसार ही वैशिष्ट्ये पुढील टप्प्यात उपलब्ध केली जातील.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 1:
        return <LocationCard formData={formData} setFormData={setFormData} gat={farmer?.associatedGats?.find(g => g._id === formData.gatId)} />;
      case 2:
        return <PhotoCapture formData={formData} setFormData={setFormData} />;
      case 3:
        return <Review formData={formData} />;
      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return formData.gatId && formData.crop;
      // A location outside the parcel may still be filed. The client-side check is
      // advisory — the authoritative decision is the backend validation gate, which
      // records the filing and flags it for an officer with the distance attached.
      // Blocking here instead hid the out-of-bounds case from the record entirely,
      // which is worse: a farmer who has picked the wrong Gat gets no trace and no
      // officer ever sees it. Poor accuracy still blocks: that is not a decision
      // about where they are, it is not knowing where they are.
      case 1: return Boolean(formData.location)
        && (formData.location.isValid === true || formData.location.status === 'OUTSIDE');
      case 2: return formData.photo !== null;
      case 3: return true;
      default: return false;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Loading profile...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 p-4 max-w-md mx-auto w-full justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Notice</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 max-w-md mx-auto w-full bg-gray-50">
      {/* Progress Header */}
      <div className="bg-white px-4 py-4 sticky top-16 z-40 border-b border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-primary-600">Step {currentStep + 1} of {STEPS.length}</span>
          <span className="text-sm font-medium text-gray-500">{STEPS[currentStep].title}</span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((step, idx) => (
            <div key={step.id} className={`h-1.5 flex-1 rounded-full ${idx <= currentStep ? 'bg-primary-500' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 p-4 pb-24">
        {renderStepContent()}
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <div className="max-w-md mx-auto flex gap-3">
          <Button variant="secondary" onClick={handlePrev} className="w-auto px-4 shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button onClick={handleNext} disabled={!isStepValid()} className="flex-1">
            {currentStep === STEPS.length - 1 ? (
              <>Submit Registration <Check className="w-5 h-5" /></>
            ) : (
              <>Next Step <ChevronRight className="w-5 h-5" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
