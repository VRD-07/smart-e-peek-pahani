import { useState, useEffect } from 'react';
import { Check, Calendar, Droplet, Sprout, Layers, Scale, Mic, MicOff, Volume2 } from 'lucide-react';

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
  { id: 'soybean', label: 'सोयाबीन (Soybean)', category: 'गळीतधान्य (Oilseed)', keywords: ['सोयाबीन', 'soybean', 'soyabean'] },
  { id: 'cotton', label: 'कापूस (Cotton)', category: 'नगदी पीक (Cash Crop)', keywords: ['कापूस', 'cotton', 'कपाशी'] },
  { id: 'sugarcane', label: 'ऊस (Sugarcane)', category: 'नगदी पीक (Cash Crop)', keywords: ['ऊस', 'sugarcane', 'us'] },
  { id: 'wheat', label: 'गहू (Wheat)', category: 'तृणधान्य (Cereal)', keywords: ['गहू', 'wheat', 'gehu', 'gahu'] },
  { id: 'jowar', label: 'ज्वारी (Jowar)', category: 'तृणधान्य (Cereal)', keywords: ['ज्वारी', 'jowar', 'jwari'] },
  { id: 'bajra', label: 'बाजरी (Bajra)', category: 'तृणधान्य (Cereal)', keywords: ['बाजरी', 'bajra', 'bajri'] },
  { id: 'tur', label: 'तूर (Pigeon Pea)', category: 'कडधान्य (Pulse)', keywords: ['तूर', 'tur', 'toor', 'arhar'] },
  { id: 'gram', label: 'हरभरा (Gram / Chickpea)', category: 'कडधान्य (Pulse)', keywords: ['हरभरा', 'gram', 'chickpea', 'चना', 'harbhara'] },
  { id: 'groundnut', label: 'भुईमूग (Groundnut)', category: 'गळीतधान्य (Oilseed)', keywords: ['भुईमूग', 'groundnut', 'peanut', 'bhuimug'] },
  { id: 'onion', label: 'कांदा (Onion)', category: 'भाजीपाला (Vegetable)', keywords: ['कांदा', 'onion', 'pyaz', 'kanda'] },
  { id: 'tomato', label: 'टोमॅटो (Tomato)', category: 'भाजीपाला (Vegetable)', keywords: ['टोमॅटो', 'tomato', 'tamatar'] },
  { id: 'mango', label: 'आंबा (Mango)', category: 'फळपीक (Fruit)', keywords: ['आंबा', 'mango', 'amba', 'aam'] },
  { id: 'banana', label: 'केळी (Banana)', category: 'फळपीक (Fruit)', keywords: ['केळी', 'banana', 'keli', 'kela'] },
];

export const CropSelector = ({ formData, setFormData, gat }) => {
  const [areaUnit, setAreaUnit] = useState('HECTARE');
  const [areaVal, setAreaVal] = useState(formData.registeredArea || '');
  const [searchFilter, setSearchFilter] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState(null);

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

  // Voice Input Speech Recognition Handler (mr-IN, hi-IN, en-IN)
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceFeedback('आपल्या ब्राउझरमध्ये व्हॉईस सपोर्ट उपलब्ध नाही. कृपया टाइप करा.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'mr-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      setIsListening(true);
      setVoiceFeedback('🎙️ बोला... (उदा. कापूस, सोयाबीन, कांदा, गहू)');

      recognition.onresult = (event) => {
        setIsListening(false);
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        console.log('[VOICE] Spoken text:', transcript);

        // Match against crops list keywords
        const matched = CROPS_LIST.find(c =>
          c.keywords.some(k => transcript.includes(k.toLowerCase())) ||
          c.label.toLowerCase().includes(transcript) ||
          c.id.toLowerCase().includes(transcript)
        );

        if (matched) {
          setFormData(prev => ({ ...prev, crop: matched.id }));
          setSearchFilter(matched.label);
          setVoiceFeedback(`✅ आवाज ओळखला: "${matched.label}" निवडले गेले!`);
        } else {
          setSearchFilter(transcript);
          setVoiceFeedback(`उच्चार: "${transcript}" (कृपया खालील यादीतून निवडा)`);
        }
      };

      recognition.onerror = (err) => {
        setIsListening(false);
        console.warn('[VOICE] Error:', err);
        setVoiceFeedback('आवाज स्पष्ट ऐकू आला नाही. कृपया पुन्हा बोला किंवा टाइप करा.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      setVoiceFeedback('मायक्रोफोन सुरू करता आला नाही.');
    }
  };

  const filteredCrops = CROPS_LIST.filter(c =>
    c.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-5">
      <div className="border-b pb-3">
        <h3 className="font-bold text-gray-900 text-sm">ई-पीक पाहणी सर्व्हे (Survey Details)</h3>
        <p className="text-xs text-gray-500 mt-0.5">शासकीय नमुना ७/१२ नुसार पिकाची अचूक माहिती भरा</p>
      </div>

      {/* Crop Name & Live Voice Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <Sprout className="w-4 h-4 text-emerald-600" />
            पीक निवडा किंवा बोला (Select or Speak Crop)
          </label>
        </div>

        {/* Search input with Voice button */}
        <div className="relative flex items-center gap-2 mb-2">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="पीक शोधा... (उदा. सोयाबीन, कापूस, ऊस)"
            className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white"
          />

          <button
            type="button"
            onClick={handleVoiceInput}
            className={`p-2.5 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm ${
              isListening
                ? 'bg-red-500 text-white border-red-500 animate-pulse ring-4 ring-red-100'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
            }`}
            title="मराठीत बोला (Voice Input)"
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span className="text-[11px] hidden sm:inline">ऐकत आहे...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span className="text-[11px]">बोला 🎙️</span>
              </>
            )}
          </button>
        </div>

        {/* Voice Feedback Banner */}
        {voiceFeedback && (
          <div className="mb-2.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
            <span>{voiceFeedback}</span>
          </div>
        )}

        {/* Crops Grid */}
        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
          {filteredCrops.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, crop: c.id }))}
              className={`relative p-3 rounded-2xl border text-left transition-all ${
                formData.crop === c.id
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <p className="font-bold text-xs">{c.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{c.category}</p>
              {formData.crop === c.id && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Season */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          हंगाम (Season)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SEASONS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, season: s.id }))}
              className={`p-2.5 rounded-2xl border text-xs font-semibold transition-all ${
                formData.season === s.id
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
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
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          पिकाचा प्रकार (Crop Type)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PEEK_TYPES.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, peekType: p.id }))}
              className={`p-2.5 rounded-2xl border text-xs font-semibold transition-all ${
                formData.peekType === p.id
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
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
            <Scale className="w-3.5 h-3.5 text-emerald-600" />
            लागवड क्षेत्र (Crop Area)
          </span>
          {gat?.registeredArea && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              गट एकूण: {gat.registeredArea} हेक्टर
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
            className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
          />
          <select
            value={areaUnit}
            onChange={(e) => {
              setAreaUnit(e.target.value);
              handleAreaChange(areaVal, e.target.value);
            }}
            className="px-3 py-2.5 border border-gray-300 rounded-2xl text-xs font-bold bg-gray-50 text-gray-700 focus:outline-none"
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
          <Droplet className="w-3.5 h-3.5 text-emerald-600" />
          जलसिंचन साधन (Water Source)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {WATER_SOURCES.map(w => (
            <button
              key={w.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, waterSource: w.id }))}
              className={`p-2.5 rounded-2xl border text-xs font-medium text-left transition-all ${
                formData.waterSource === w.id
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm font-bold'
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
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          पेरणीची तारीख (Sowing Date)
        </label>
        <input
          type="date"
          value={formData.sowingDate || ''}
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => setFormData(prev => ({ ...prev, sowingDate: e.target.value }))}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-gray-50 focus:bg-white"
        />
      </div>
    </div>
  );
};
