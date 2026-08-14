import { demoData } from '../../constants/demoData';
import { Check } from 'lucide-react';

export const CropSelector = ({ formData, setFormData, gat }) => {
  const handleSelect = (crop) => {
    setFormData(prev => ({ ...prev, crop }));
  };

  const availableCrops = gat?.cropTypes && gat.cropTypes.length > 0 ? gat.cropTypes : demoData.crops;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">Select Crop</label>
      <div className="grid grid-cols-2 gap-3">
        {availableCrops.map((crop) => (
          <button
            key={crop}
            onClick={() => handleSelect(crop)}
            className={`
              relative p-4 rounded-xl border-2 text-left transition-all
              ${formData.crop === crop
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
              }
            `}
          >
            <span className="font-medium">{crop}</span>
            {formData.crop === crop && (
              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                <Check className="w-5 h-5 text-primary-600" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
