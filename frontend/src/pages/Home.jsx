import { useNavigate } from 'react-router-dom';
import { Sprout, MapPin, Camera } from 'lucide-react';
import { Button } from '../components/common';

export const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col flex-1 p-4 max-w-md mx-auto w-full">
      <div className="flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-6">
            <Sprout className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to<br />E-Peek Pahani
          </h2>
          <p className="text-gray-500 mb-8">
            Register your crop details easily in 3 simple steps. Works offline too!
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                <span className="font-bold text-primary-600">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Basic Details</h3>
                <p className="text-sm text-gray-500">Enter your name, gat number and select crop</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Location</h3>
                <p className="text-sm text-gray-500">Verify your location on the map</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Crop Photo</h3>
                <p className="text-sm text-gray-500">Take a clear photo of your field</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 pb-6 sticky bottom-0 bg-gray-50">
        <Button onClick={() => navigate('/onboarding')} className="text-lg">
          Start Registration
        </Button>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/admin')}
            className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            Admin Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
