import { useState, useEffect } from 'react';
import { Check, Calendar, Droplet, Sprout, Layers, Scale } from 'lucide-react';

const SEASONS = [
  { id: 'KHARIF', label: 'खरीप (Kharif)' },
  { id: 'RABI', label: 'रब्बी (Rabi)' },
  { id: 'SUMMER', label: 'उन्हाळी (Summer)' },
];

const PEEK_TYPES = [
  { id: 'SINGLE', label: 'एक पीक (Single Crop)' },
  { id: 'MIXED', label: 'मिश्र पीक (Mixed Crop)' },
];

const WATER_SOURCES = [
  { id: 'WELL', label: 'विहीर / बोरवेल (Well / Borewell)' },
  { id: 'RIVER', label: 'नदी / कालवा (River / Canal)' },
  { id: 'DRIP', label: 'ठिबक सिंचन (Drip Irrigation)' },
  { id: 'OTHER', label: 'इतर (Other)' },
];

const CROPS_LIST = [
  { id: 'soybean', label: 'सोयाबीन (Soybean)', category: 'गळीतधान्य (Oilseed)' },
  { id: 'cotton', label: 'कापूस (Cotton)', category: 'नगदी पीक (Cash Crop)' },
  { id: 'sugarcane', label: 'ऊस (Sugarcane)', category: 'नगदी पीक (Cash Crop)' },
  { id: 'wheat', label: 'गहू (Wheat)', category: 'तृणधान्य (Cereal)' },
  { id: 'jowar', label: 'ज्वारी (Jowar)', category: 'तृणधान्य (Cereal)' },
  { id: 'bajra', label: 'बाजरी (Bajra)', category: 'तृणधान्य (Cereal)' },
  { id: 'tur', label: 'तूर (Pigeon Pea)', category: 'कडधान्य (Pulse)' },
  { id: 'gram', label: 'हरभरा (Gram / Chickpea)', category: 'कडधान्य (Pulse)' },
  { id: 'groundnut', label: 'भुईमूग (Groundnut)', category: 'गळीतधान्य (Oilseed)' },
  { id: 'onion', label: 'कांदा (Onion)', category: 'भाजीपाला (Vegetable)' },
  { id: 'tomato', label: 'टोमॅटो (Tomato)', category: 'भाजीपाला (Vegetable)' },
  { id: 'mango', label: 'आंबा (Mango)', category: 'फळपीक (Fruit)' },
  { id: 'banana', label: 'केळी (Banana)', category: 'फळपीक (Fruit)' },
];

export const CropSelector = ({ formData, setFormData, gat }) => {
  const [areaUnit, setAreaUnit] = useState('HECTARE');
  const [areaVal, setAreaVal] = useState(formData.registeredArea || '');
  const [searchFilter, setSearchFilter] = useState('');

  // Set defaults on mount
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      season: prev.season || 'KHARIF',
      peekType: prev.peekType || 'SINGLE',
      waterSource: prev.waterSource || 'WELL',
      sowingDate: prev.sowingDate || new Date().toISOString().split('T')[0],
      registeredArea: prev.registeredArea || (gat?.registeredArea ? Math.min(gat.registeredArea, 1.0) : 1.0),
      crop: prev.crop || 'soybean',
    }));
    if (!areaVal && gat?.registeredArea) {
      setAreaVal(Math.min(gat.registeredArea, 1.0).toString());
    }
  }, [gat]);

  const handleAreaChange = (val, unit) => {
    setAreaVal(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      let hectares = num;
      if (unit === 'ACRE') hectares = num * 0.404686;
      else if (unit === 'GUNTHA') hectares = num * 0.010117;
      setFormData(prev => ({ ...prev, registeredArea: parseFloat(hectares.toFixed(4)) }));
    }
  };

  const filteredCrops = CROPS_LIST.filter(c =>
    c.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5">
      <div className="border-b pb-3">
        <h3 className="font-semibold text-gray-900 text-base">ई-पीक पाहणी सर्व्हे (Survey Details)</h3>
        <p className="text-xs text-gray-500 mt-0.5">शासकीय नमुना ७/१२ नुसार पिकाची अचूक माहिती भरा</p>
      </div>

      {/* Season */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
          <Calendar className="w-3.5 h-3.5 text-primary-600" />
          हंगाम (Season)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SEASONS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, season: s.id }))}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                formData.season === s.id
                  ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Peek Type */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
          <Layers className="w-3.5 h-3.5 text-primary-600" />
          पिकाचा प्रकार (Crop Type)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PEEK_TYPES.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, peekType: p.id }))}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                formData.peekType === p.id
                  ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Area with Context */}
      <div>
        <label className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-primary-600" />
            लागवड क्षेत्र (Crop Area)
          </span>
          {gat?.registeredArea && (
            <span className="text-[11px] font-normal text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md">
              गट एकूण: {gat.registeredArea} हेक्टर (ha)
            </span>
          )}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={areaVal}
            onChange={(e) => handleAreaChange(e.target.value, areaUnit)}
            placeholder="उदा. 1.0"
            className="flex-1 px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={areaUnit}
            onChange={(e) => {
              setAreaUnit(e.target.value);
              handleAreaChange(areaVal, e.target.value);
            }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium bg-gray-50 text-gray-700 focus:outline-none"
          >
            <option value="HECTARE">हेक्टर (ha)</option>
            <option value="ACRE">एकर (Acre)</option>
            <option value="GUNTHA">गुंठे (Guntha)</option>
          </select>
        </div>
        {formData.registeredArea && (
          <p className="text-[11px] text-gray-500 mt-1">
            नोंदणी क्षेत्र: {formData.registeredArea} हेक्टर (ha)
          </p>
        )}
      </div>

      {/* Water Source */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
          <Droplet className="w-3.5 h-3.5 text-primary-600" />
          जलसिंचन साधन (Water Source)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {WATER_SOURCES.map(w => (
            <button
              key={w.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, waterSource: w.id }))}
              className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                formData.waterSource === w.id
                  ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sowing Date */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
          <Calendar className="w-3.5 h-3.5 text-primary-600" />
          पेरणीची तारीख (Sowing Date)
        </label>
        <input
          type="date"
          value={formData.sowingDate || ''}
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => setFormData(prev => ({ ...prev, sowingDate: e.target.value }))}
          className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Crop Name */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <Sprout className="w-3.5 h-3.5 text-primary-600" />
            पीक निवडा (Select Crop)
          </label>
        </div>
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="पीक शोधा... (उदा. सोयाबीन, कापूस, ऊस)"
          className="w-full px-3.5 py-2 mb-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
          {filteredCrops.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, crop: c.id }))}
              className={`relative p-3 rounded-xl border text-left transition-all ${
                formData.crop === c.id
                  ? 'border-primary-500 bg-primary-50 text-primary-800 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <p className="font-semibold text-xs">{c.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{c.category}</p>
              {formData.crop === c.id && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-primary-600" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
