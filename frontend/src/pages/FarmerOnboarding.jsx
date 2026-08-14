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

  useEffect(() => {
    const fetchFarmer = async () => {
      try {
        setLoading(true);
        const response = await api.get('/farmers/me');
        const farmerData = response.data.data;
        setFarmer(farmerData);

        // Ensure gatId is stored properly instead of a human-readable string
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

        // Load offline draft if it exists and belongs to this farmer
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

  // Clear GPS location if the selected Gat changes
  useEffect(() => {
    setFormData(prev => {
      if (prev.location) {
        return { ...prev, location: null };
      }
      return prev;
    });
  }, [formData.gatId]);

  // Save draft on change
  useEffect(() => {
    const saveDraft = async () => {
      // Don't save empty drafts
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
    // Debounce or just save directly (it's local IDB, fast enough for this demo)
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
    // 1. Delete draft
    const draft = await db.submissions.where('status').equals('DRAFT').first();
    if (draft) await db.submissions.delete(draft.id);

    // 2. Create pending submission
    const submissionId = await db.submissions.add({
      status: 'SYNC_PENDING',
      data: formData,
      timestamp: Date.now()
    });

    // 3. Navigate to validation screen
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
                  <p className="font-medium text-gray-900">{farmer?.preferredLanguage === 'mr' ? 'Marathi' : 'English'}</p>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 border-b pb-2 mt-4">Select Your Land</h3>
              {farmer?.associatedGats?.length > 0 ? (
                <div className="space-y-3">
                  {farmer.associatedGats.map(gat => (
                    <div
                      key={gat._id}
                      onClick={() => setFormData(prev => ({ ...prev, gatId: gat._id, village: gat.village, gat: gat.gatNumber }))}
                      className={`p-3 rounded-xl border cursor-pointer transition-colors ${formData.gatId === gat._id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-semibold text-gray-900">Gat {gat.gatNumber}</p>
                        {formData.gatId === gat._id && <Check className="w-5 h-5 text-primary-600" />}
                      </div>
                      <p className="text-sm text-gray-500">Village: {gat.village}</p>
                      <p className="text-sm text-gray-500">District: {gat.district}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No Gats assigned.</p>
              )}
            </div>

            {formData.gatId && (
              <CropSelector
                formData={formData}
                setFormData={setFormData}
                gat={farmer?.associatedGats?.find(g => g._id === formData.gatId)}
              />
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
      case 1: return formData.location && formData.location.isValid === true;
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
