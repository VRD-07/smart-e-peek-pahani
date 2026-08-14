import { CheckCircle2, MapPin, Camera, User } from 'lucide-react';

export const Review = ({ formData }) => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
          <User className="w-5 h-5 text-primary-600" />
          Basic Details
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span className="font-medium text-gray-900">{formData.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Mobile</span>
            <span className="font-medium text-gray-900">{formData.mobile}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Village</span>
            <span className="font-medium text-gray-900">{formData.village}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Gat No.</span>
            <span className="font-medium text-gray-900">{formData.gat}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Crop</span>
            <span className="font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
              {formData.crop}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-primary-600" />
          Location
        </h3>
        {formData.location && formData.location.latitude ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Location captured successfully</span>
            </div>
            <div className="text-sm text-gray-600 px-1">
              <p>Latitude: {formData.location.latitude.toFixed(6)}</p>
              <p>Longitude: {formData.location.longitude.toFixed(6)}</p>
            </div>
          </div>
        ) : (
          <span className="text-sm text-red-500">Location not captured</span>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Camera className="w-5 h-5 text-primary-600" />
          Photograph
        </h3>
        {formData.photo ? (
          <img src={formData.photo} alt="Crop preview" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
        ) : (
          <span className="text-sm text-red-500">Photo not captured</span>
        )}
      </div>
    </div>
  );
};
