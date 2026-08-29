import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronRight, CheckCircle2, Building2 } from 'lucide-react';
import { MAHARASHTRA_DIVISIONS } from '../data/maharashtraData';

export const Home = () => {
  const navigate = useNavigate();

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

  return (
    <div className="flex flex-col flex-1 max-w-md mx-auto w-full p-4 pb-28">
      {/* Maharashtra Gov Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-primary-900 rounded-3xl p-5 text-white shadow-lg mb-5 border border-emerald-600/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 flex-shrink-0">
            <Building2 className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">महाराष्ट्र शासन महसूल विभाग</span>
            <h1 className="text-xl font-extrabold text-white leading-tight">स्मार्ट ई-पीक पाहणी</h1>
          </div>
        </div>
        <p className="text-xs text-emerald-100/90 mt-1">
          डिजिटल पीक नोंदणी • प्रत्यक्ष शेतातील जिओ-टॅगिंग व अचूक ७/१२ नोंद
        </p>
      </div>

      {/* Step 1 Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
              १
            </div>
            <h2 className="font-bold text-gray-900 text-sm">आपले महसूल स्थान निवडा (Select Location)</h2>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
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
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-xs"
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
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-xs disabled:opacity-50"
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
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-xs disabled:opacity-50"
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
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-xs disabled:opacity-50"
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
            <span>पुढे जा (Continue to Login / Registration)</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
