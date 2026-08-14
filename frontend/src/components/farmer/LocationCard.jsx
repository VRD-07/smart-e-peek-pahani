import { useState } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { FieldMap } from '../map';
import { Button } from '../common';
import { validateGatLocation } from '../../utils/geoUtils';

export const LocationCard = ({ formData, setFormData, gat }) => {
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const handleGetLocation = () => {
    setLocationError(null);
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;

          const validation = validateGatLocation(lat, lng, accuracy, gat);

          setFormData(prev => ({
            ...prev,
            location: {
              latitude: lat,
              longitude: lng,
              accuracy: accuracy,
              isValid: validation.isValid,
              status: validation.status,
              message: validation.message
            }
          }));
          setIsLocating(false);
        },
        (error) => {
          setIsLocating(false);
          switch(error.code) {
            case error.PERMISSION_DENIED:
              setLocationError("Location permission denied. Please allow access.");
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationError("Location information is unavailable.");
              break;
            case error.TIMEOUT:
              setLocationError("The request to get user location timed out.");
              break;
            default:
              setLocationError("An unknown error occurred getting location.");
              break;
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary-600" />
          Field Location
        </h3>
        {formData.location && formData.location.status === 'VALID' && (
          <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-md">
            Location Verified
          </span>
        )}
      </div>

      <FieldMap
        location={formData.location}
        setLocation={(loc) => setFormData(prev => ({ ...prev, location: loc }))}
        gat={gat}
      />

      {locationError && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
          {locationError}
        </div>
      )}

      {formData.location && formData.location.status === 'OUTSIDE' && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm font-medium">
          🔴 You appear to be outside the selected field.<br/>
          <span className="text-sm font-normal">{formData.location.message}</span>
        </div>
      )}

      {formData.location && formData.location.status === 'POOR_ACCURACY' && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded text-sm font-medium">
          🟠 GPS accuracy is too low.<br/>
          <span className="text-sm font-normal">{formData.location.message}</span>
        </div>
      )}

      {formData.location && formData.location.status === 'VALID' && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm font-medium">
          🟢 {formData.location.message}
        </div>
      )}

      <Button variant="outline" onClick={handleGetLocation} disabled={isLocating}>
        {isLocating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Getting your current location...
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4" />
            {(locationError || (formData.location && !formData.location.isValid)) ? 'Try Again' : (!formData.location ? 'Capture your location' : 'Capture Current GPS Location')}
          </>
        )}
      </Button>

      {formData.location && formData.location.status === 'VALID' && (
        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>Lat: {formData.location.latitude.toFixed(6)}, Lng: {formData.location.longitude.toFixed(6)}</p>
          {formData.location.accuracy && (
            <p>Accuracy: {Math.round(formData.location.accuracy)}m</p>
          )}
        </div>
      )}
    </div>
  );
};
