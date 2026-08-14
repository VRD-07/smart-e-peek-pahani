import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '../common';

export const PhotoCapture = ({ formData, setFormData }) => {
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, photo: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <Camera className="w-5 h-5 text-primary-600" />
        Crop Photograph
      </h3>

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

      {!formData.photo ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-1">Click to capture or upload</p>
          <p className="text-xs text-gray-400">JPEG, PNG up to 5MB</p>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-gray-200">
          <img src={formData.photo} alt="Crop" className="w-full h-48 object-cover" />
          <button
            onClick={() => setFormData(prev => ({ ...prev, photo: null }))}
            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
};
