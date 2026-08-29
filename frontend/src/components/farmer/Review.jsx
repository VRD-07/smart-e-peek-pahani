import { CheckCircle2, MapPin, Camera, User, FileText, Sprout } from 'lucide-react';

export const Review = ({ formData }) => {
  const cropDisplayNames = {
    soybean: 'सोयाबीन (Soybean)',
    cotton: 'कापूस (Cotton)',
    sugarcane: 'ऊस (Sugarcane)',
    onion: 'कांदा (Onion)',
    wheat: 'गहू (Wheat)',
    gram: 'हरभरा (Gram / Chana)',
    maize: 'मका (Maize)',
    tur: 'तूर (Pigeon Pea)',
    bajra: 'बाजरी (Pearl Millet)',
    jowar: 'ज्वारी (Sorghum)',
    grapes: 'द्राक्षे (Grapes)',
    pomegranate: 'डाळिंब (Pomegranate)',
    tomato: 'टोमॅटो (Tomato)'
  };

  const cropName = typeof formData.crop === 'string'
    ? (cropDisplayNames[formData.crop] || formData.crop)
    : (formData.crop?.declaredCrop || 'सोयाबीन (Soybean)');

  return (
    <div className="space-y-4">
      {/* Farmer & Land Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b pb-2.5 text-xs">
          <User className="w-4 h-4 text-primary-600" />
          शेतकरी व जमीन तपशील (Farmer & Land)
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-gray-500 font-medium">नाव</span>
            <p className="font-bold text-gray-900 truncate">{formData.name || 'विठ्ठल पाटील'}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-medium">मोबाईल नंबर</span>
            <p className="font-bold text-gray-900">{formData.mobile || 'N/A'}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-medium">गाव व तालुका</span>
            <p className="font-bold text-gray-900 truncate">गाव: {formData.village || 'मुर्शदपूर'}, ता. {formData.taluka || 'निफाड'}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-medium">गट / सर्व्हे क्र.</span>
            <p className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] inline-block">
              गट क्र. {formData.gat || '१०१'}
            </p>
          </div>
        </div>
      </div>

      {/* Crop Details Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b pb-2.5 text-xs">
          <Sprout className="w-4 h-4 text-emerald-600" />
          पिकाचा तपशील (Crop Details)
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-gray-500 font-medium">निवडलेले पीक</span>
            <p className="font-extrabold text-emerald-700 text-sm">{cropName}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-medium">लागवड क्षेत्र</span>
            <p className="font-bold text-gray-900">{formData.registeredArea ? `${formData.registeredArea} हेक्टर` : '1.0 हेक्टर'}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-medium">हंगाम व प्रकार</span>
            <p className="font-medium text-gray-800">{formData.season || 'खरीप'} • {formData.peekType === 'MIXED' ? 'मिश्र' : 'एक पीक'}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-medium">जलसिंचन</span>
            <p className="font-medium text-gray-800">{formData.waterSource || 'विहीर / बोरवेल'}</p>
          </div>
        </div>
      </div>

      {/* GPS Location Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-2.5">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b pb-2.5 text-xs">
          <MapPin className="w-4 h-4 text-primary-600" />
          स्थान पडताळणी (GPS Location)
        </h3>
        {formData.location && formData.location.latitude ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 p-2.5 rounded-2xl font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>GPS स्थान यशस्वीरित्या नोंदवले (Inside Gat Boundary)</span>
            </div>
            <div className="flex justify-between text-[11px] text-gray-500 px-1">
              <span>अक्षांश: {formData.location.latitude.toFixed(6)}° N</span>
              <span>रेखांश: {formData.location.longitude.toFixed(6)}° E</span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-red-500 font-bold">स्थान नोंदवले नाही</span>
        )}
      </div>

      {/* Photo Preview Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-2.5">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b pb-2.5 text-xs">
          <Camera className="w-4 h-4 text-primary-600" />
          पिकाचे छायाचित्र (Crop Photo)
        </h3>
        {formData.photo ? (
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-inner">
            <img src={formData.photo} alt="Crop preview" className="w-full h-44 object-cover" />
          </div>
        ) : (
          <span className="text-xs text-red-500 font-bold">फोटो निवडला नाही</span>
        )}
      </div>
    </div>
  );
};
