import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X, RefreshCw, CheckCircle2 } from 'lucide-react';

export const PhotoCapture = ({ formData, setFormData }) => {
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const maxDim = 1280;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to lightweight JPEG (~150KB-250KB)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error('फोटो लोड करण्यात अडचण आली.'));
      };
      reader.onerror = () => reject(new Error('फोटो वाचण्यात अडचण आली.'));
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setProcessing(true);

    try {
      const compressedData = await compressImage(file);
      setFormData(prev => ({ ...prev, photo: compressedData }));
    } catch (err) {
      console.error('Image compression failed:', err);
      // Fallback to direct data URL if canvas fails
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, photo: event.target.result }));
      };
      reader.readAsDataURL(file);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center justify-between border-b pb-2.5">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary-600" />
          पिकाचे छायाचित्र (Crop Photo)
        </h3>
        {formData.photo && (
          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> फोटो जोडला
          </span>
        )}
      </div>

      <p className="text-[11px] text-gray-500">
        आपल्या शेतातील उभ्या पिकाचा स्पष्ट फोटो कॅमेराने काढा किंवा गॅलरीतून निवडा
      </p>

      {error && <p className="text-xs text-red-500 font-bold">{error}</p>}

      {processing && (
        <div className="border-2 border-dashed border-primary-300 bg-primary-50/50 rounded-2xl p-8 text-center">
          <RefreshCw className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-primary-800">फोटो प्रक्रिया व ऑप्टिमायझेशन सुरू आहे...</p>
          <p className="text-[10px] text-gray-500">कृपया थोडा वेळ थांबा</p>
        </div>
      )}

      {!processing && !formData.photo && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:bg-emerald-50/50 hover:border-emerald-400 transition-all group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
            <Camera className="w-7 h-7" />
          </div>
          <p className="text-xs font-bold text-gray-800 mb-1">कॅमेरा उघडा किंवा फोटो अपलोड करा</p>
          <p className="text-[10px] text-gray-400">JPEG, PNG • आपोआप ऑप्टिमाइझ केले जाईल</p>
        </div>
      )}

      {!processing && formData.photo && (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-inner">
          <img src={formData.photo} alt="Crop" className="w-full h-52 object-cover" />
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, photo: null }))}
            className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all shadow-md"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-xl text-[10px] flex items-center justify-between">
            <span>✅ फोटो यशस्वीरित्या ऑप्टिमाइझ झाला</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-emerald-300 hover:underline font-bold"
            >
              बदला (Change)
            </button>
          </div>
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
