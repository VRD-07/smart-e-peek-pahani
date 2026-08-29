import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  ChevronRight,
  CheckCircle2,
  Building2,
  Sprout,
  ShieldCheck,
  Smartphone,
  WifiOff,
  Sparkles,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { MAHARASHTRA_DIVISIONS } from '../data/maharashtraData';
import heroFarmerImg from '../assets/hero_farmer.jpg';

export const Home = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('smart_e_peek_token');

  // Load existing or default to Nashik -> Nashik -> Niphad -> Murshatpur
  const savedLocation = JSON.parse(localStorage.getItem('smart_e_peek_location') || '{}');
  const [selectedDivId, setSelectedDivId] = useState(savedLocation.divId || 'NASHIK');
  const [selectedDistId, setSelectedDistId] = useState(savedLocation.distId || 'NASHIK_DIST');
  const [selectedTalukaId, setSelectedTalukaId] = useState(savedLocation.talukaId || 'NIPHAD');
  const [selectedVillageName, setSelectedVillageName] = useState(savedLocation.village || 'Murshatpur');

  const currentDivision = MAHARASHTRA_DIVISIONS.find(d => d.id === selectedDivId);
  const currentDistrict = currentDivision?.districts.find(d => d.id === selectedDistId);
  const currentTaluka = currentDistrict?.talukas.find(t => t.id === selectedTalukaId);
  const currentVillage = currentTaluka?.villages.find(v => v.name === selectedVillageName);

  const handleProceed = () => {
    const locationData = {
      divId: selectedDivId,
      distId: selectedDistId,
      talukaId: selectedTalukaId,
      division: currentDivision?.name,
      divisionMr: currentDivision?.nameMr,
      district: currentDistrict?.name,
      districtMr: currentDistrict?.nameMr,
      taluka: currentTaluka?.name,
      talukaMr: currentTaluka?.nameMr,
      village: selectedVillageName,
      villageMr: currentVillage?.nameMr || selectedVillageName,
      defaultGats: currentVillage?.defaultGats || ['101', '102', '103', '104', '105', '106']
    };

    localStorage.setItem('smart_e_peek_location', JSON.stringify(locationData));
    navigate('/login', { state: { selectedLocation: locationData } });
  };

  const handleDirectSurvey = () => {
    navigate('/onboarding');
  };

  return (
    <div className="flex flex-col flex-1 max-w-md mx-auto w-full p-4 pb-28 space-y-4 font-sans">
      
      {/* Hero Banner with Official Farmer Image */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-emerald-500/30 bg-slate-950 group">
        <img
          src={heroFarmerImg}
          alt="Maharashtra Farmer Smart E-Peek"
          className="w-full h-48 sm:h-52 object-cover object-top opacity-90 transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent flex flex-col justify-end p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-700/80 backdrop-blur-sm text-emerald-200 border border-emerald-500/40 px-2 py-0.5 rounded-full">
              महाराष्ट्र शासन महसूल विभाग
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
            स्मार्ट ई-पीक पाहणी
          </h1>
          <p className="text-xs text-emerald-200 font-medium drop-shadow mt-0.5">
            अचूक डिजिटल पीक नोंदणी • प्रत्यक्ष शेतातील जिओ-टॅगिंग व ७/१२ नोंद
          </p>
        </div>
      </div>

      {/* Feature Highlights Ribbon */}
      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-1">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-gray-800">AI पीक ओळख</span>
        </div>
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-1">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-gray-800">GPS जिओ-फेन्स</span>
        </div>
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-1">
          <WifiOff className="w-4 h-4 text-amber-600" />
          <span className="font-bold text-gray-800">ऑफलाइन काम</span>
        </div>
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-1">
          <Smartphone className="w-4 h-4 text-purple-600" />
          <span className="font-bold text-gray-800">व्हॉट्सअ‍ॅप बॉट</span>
        </div>
      </div>

      {/* If farmer is already logged in: Show Quick Access Hub */}
      {token && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sprout className="w-5 h-5 text-amber-300" />
              <span className="font-bold text-sm">आपले खाते सक्रिय आहे</span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
              लॉगिन झाले
            </span>
          </div>

          <p className="text-xs text-emerald-100">
            आपण थेट आपल्या शेतातील पिकाची नोंदणी सुरू करू शकता.
          </p>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleDirectSurvey}
              className="w-full py-3 px-4 bg-white hover:bg-emerald-50 text-emerald-800 font-extrabold rounded-2xl text-xs shadow-md transition-all flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Sprout className="w-4 h-4 text-emerald-600" />
                🌱 थेट पीक नोंदणी सुरू करा (Start Survey)
              </span>
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/offline')}
              className="w-full py-2.5 px-4 bg-emerald-800/60 hover:bg-emerald-800/80 text-white font-semibold rounded-2xl text-xs transition-all flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <WifiOff className="w-3.5 h-3.5" />
                ऑफलाइन रांग व नोंदी पहा (Offline Queue)
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />
            </button>
          </div>
        </div>
      )}

      {/* Step 1 Card: Location Selection */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              १
            </div>
            <h2 className="font-bold text-gray-900 text-sm">महसूल स्थान निवडा (Select Location)</h2>
          </div>
          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full">
            पायरी १/३
          </span>
        </div>

        <div className="space-y-3 text-xs">
          {/* Division */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              १. महसूल विभाग (Division)
            </label>
            <select
              value={selectedDivId}
              onChange={(e) => {
                setSelectedDivId(e.target.value);
                const div = MAHARASHTRA_DIVISIONS.find(d => d.id === e.target.value);
                const dist = div?.districts[0];
                const tal = dist?.talukas[0];
                const vil = tal?.villages[0];
                setSelectedDistId(dist?.id || '');
                setSelectedTalukaId(tal?.id || '');
                setSelectedVillageName(vil?.name || '');
              }}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-xs"
            >
              {MAHARASHTRA_DIVISIONS.map(d => (
                <option key={d.id} value={d.id}>{d.nameMr} ({d.name})</option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              २. जिल्हा (District)
            </label>
            <select
              value={selectedDistId}
              disabled={!selectedDivId}
              onChange={(e) => {
                setSelectedDistId(e.target.value);
                const dist = currentDivision?.districts.find(d => d.id === e.target.value);
                const tal = dist?.talukas[0];
                const vil = tal?.villages[0];
                setSelectedTalukaId(tal?.id || '');
                setSelectedVillageName(vil?.name || '');
              }}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-xs disabled:opacity-50"
            >
              {currentDivision?.districts.map(dist => (
                <option key={dist.id} value={dist.id}>{dist.nameMr} ({dist.name})</option>
              ))}
            </select>
          </div>

          {/* Taluka */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              ३. तालुका (Taluka)
            </label>
            <select
              value={selectedTalukaId}
              disabled={!selectedDistId}
              onChange={(e) => {
                setSelectedTalukaId(e.target.value);
                const tal = currentDistrict?.talukas.find(t => t.id === e.target.value);
                const vil = tal?.villages[0];
                setSelectedVillageName(vil?.name || '');
              }}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-xs disabled:opacity-50"
            >
              {currentDistrict?.talukas.map(tal => (
                <option key={tal.id} value={tal.id}>{tal.nameMr} ({tal.name})</option>
              ))}
            </select>
          </div>

          {/* Village */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              ४. गाव (Village)
            </label>
            <select
              value={selectedVillageName}
              disabled={!selectedTalukaId}
              onChange={(e) => setSelectedVillageName(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-xs disabled:opacity-50"
            >
              {currentTaluka?.villages.map(v => (
                <option key={v.name} value={v.name}>{v.nameMr} ({v.name})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Summary Badge */}
        {selectedVillageName && (
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">निवडलेले महसूल स्थान</p>
              <p className="text-xs font-semibold text-gray-900 truncate">
                गाव: {currentVillage?.nameMr || selectedVillageName}, ता. {currentTaluka?.nameMr}, जि. {currentDistrict?.nameMr}
              </p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          </div>
        )}
      </div>

      {/* Sticky Bottom Navigation Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 shadow-lg">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            type="button"
            onClick={handleProceed}
            className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
          >
            <span>पुढे जा (Continue to Login / Register)</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

