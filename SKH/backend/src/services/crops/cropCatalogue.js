/**
 * The single source of truth for which crops this system recognises.
 *
 * Before Phase 7 the crop list lived in three places at once: a dictionary in
 * services/voice, a re-export in services/ai, and a hardcoded literal inside the
 * Gemini Vision prompt. Nothing stopped the vision model's list and the farmer's
 * declaration list from drifting apart, which would have surfaced as an
 * unexplainable crop mismatch rather than as a bug. Every consumer now derives
 * from this file.
 *
 * Each entry has three distinct jobs, which is why the names look repetitive:
 *   - `canonical` is the stored value. Existing Submission records carry it, so
 *     these strings must not be renamed casually.
 *   - `mr` / `hi` are display names, used in prompts, confirmations and history.
 *   - `aliases` are accepted *inputs* — what a farmer might type or say. Only the
 *     spellings a farmer would consider correct belong here; the fuzzy matcher in
 *     ./cropMatcher.js absorbs the misspellings.
 *
 * Categories mirror the "पिकाचा वर्ग" grouping on the 7/12 land record. There are
 * eight of them, which is deliberate: WhatsApp List Messages cap at ten rows, so
 * the whole class list fits in one interactive prompt.
 */

const CROP_CATEGORIES = {
  CEREAL: 'CEREAL',
  PULSE: 'PULSE',
  OILSEED: 'OILSEED',
  CASH: 'CASH',
  SPICE: 'SPICE',
  VEGETABLE: 'VEGETABLE',
  FRUIT: 'FRUIT',
  FODDER: 'FODDER',
};

const { CEREAL, PULSE, OILSEED, CASH, SPICE, VEGETABLE, FRUIT, FODDER } = CROP_CATEGORIES;

const CROPS = [
  // ---- तृणधान्य / Cereals ----
  { canonical: 'rice', category: CEREAL, mr: 'भात', hi: 'धान', aliases: ['rice', 'paddy', 'भात', 'bhat', 'धान', 'dhan', 'चावल', 'chawal'] },
  { canonical: 'wheat', category: CEREAL, mr: 'गहू', hi: 'गेहूं', aliases: ['wheat', 'गहू', 'gahu', 'gahoo', 'गेहूं', 'gehu'] },
  { canonical: 'jowar', category: CEREAL, mr: 'ज्वारी', hi: 'ज्वार', aliases: ['jowar', 'jwari', 'sorghum', 'ज्वारी', 'ज्वार'] },
  { canonical: 'bajra', category: CEREAL, mr: 'बाजरी', hi: 'बाजरा', aliases: ['bajra', 'bajri', 'pearl millet', 'बाजरी', 'बाजरा'] },
  { canonical: 'maize', category: CEREAL, mr: 'मका', hi: 'मक्का', aliases: ['maize', 'corn', 'मका', 'maka', 'मक्का', 'makka'] },
  { canonical: 'ragi', category: CEREAL, mr: 'नाचणी', hi: 'रागी', aliases: ['ragi', 'finger millet', 'nachni', 'नाचणी', 'रागी'] },
  { canonical: 'barley', category: CEREAL, mr: 'जव', hi: 'जौ', aliases: ['barley', 'जव', 'jav', 'जौ'] },

  // ---- कडधान्य / Pulses ----
  { canonical: 'tur', category: PULSE, mr: 'तूर', hi: 'अरहर', aliases: ['tur', 'toor', 'tuar', 'pigeon pea', 'तूर', 'तुर', 'अरहर', 'arhar'] },
  { canonical: 'gram', category: PULSE, mr: 'हरभरा', hi: 'चना', aliases: ['gram', 'chickpea', 'harbhara', 'हरभरा', 'चना', 'chana'] },
  { canonical: 'moong', category: PULSE, mr: 'मूग', hi: 'मूंग', aliases: ['moong', 'mung', 'green gram', 'मूग', 'मूंग'] },
  { canonical: 'udid', category: PULSE, mr: 'उडीद', hi: 'उड़द', aliases: ['udid', 'urad', 'black gram', 'उडीद', 'उड़द'] },
  { canonical: 'matki', category: PULSE, mr: 'मटकी', hi: 'मोठ', aliases: ['matki', 'moth bean', 'मटकी', 'मोठ'] },
  { canonical: 'masoor', category: PULSE, mr: 'मसूर', aliases: ['masoor', 'lentil', 'मसूर'] },
  { canonical: 'val', category: PULSE, mr: 'वाल', aliases: ['val', 'field bean', 'papdi', 'वाल', 'पापडी'] },
  { canonical: 'chavli', category: PULSE, mr: 'चवळी', hi: 'लोबिया', aliases: ['chavli', 'cowpea', 'lobia', 'चवळी', 'लोबिया'] },

  // ---- गळीतधान्य / Oilseeds ----
  { canonical: 'soybean', category: OILSEED, mr: 'सोयाबीन', aliases: ['soybean', 'soyabean', 'soya', 'soy', 'सोयाबीन', 'सोया'] },
  { canonical: 'groundnut', category: OILSEED, mr: 'भुईमूग', hi: 'मूंगफली', aliases: ['groundnut', 'peanut', 'bhuimug', 'भुईमूग', 'मूंगफली', 'mungfali'] },
  { canonical: 'sunflower', category: OILSEED, mr: 'सूर्यफूल', hi: 'सूरजमुखी', aliases: ['sunflower', 'suryaful', 'सूर्यफूल', 'सूरजमुखी'] },
  { canonical: 'safflower', category: OILSEED, mr: 'करडई', hi: 'कुसुम', aliases: ['safflower', 'kardai', 'करडई', 'कुसुम'] },
  { canonical: 'sesame', category: OILSEED, mr: 'तीळ', hi: 'तिल', aliases: ['sesame', 'til', 'तीळ', 'तिल'] },
  { canonical: 'mustard', category: OILSEED, mr: 'मोहरी', hi: 'सरसों', aliases: ['mustard', 'mohri', 'मोहरी', 'सरसों', 'sarson'] },
  { canonical: 'linseed', category: OILSEED, mr: 'जवस', hi: 'अलसी', aliases: ['linseed', 'flax', 'javas', 'जवस', 'अलसी', 'alsi'] },
  { canonical: 'castor', category: OILSEED, mr: 'एरंडी', hi: 'अरंडी', aliases: ['castor', 'erandi', 'एरंडी', 'अरंडी'] },
  { canonical: 'niger', category: OILSEED, mr: 'खुरासणी', aliases: ['niger', 'khurasani', 'खुरासणी'] },

  // ---- नगदी पीक / Cash crops ----
  { canonical: 'cotton', category: CASH, mr: 'कापूस', hi: 'कपास', aliases: ['cotton', 'kapus', 'kapas', 'कापूस', 'कपास'] },
  { canonical: 'sugarcane', category: CASH, mr: 'ऊस', hi: 'गन्ना', aliases: ['sugarcane', 'us', 'uus', 'ऊस', 'गन्ना', 'ganna'] },
  { canonical: 'tobacco', category: CASH, mr: 'तंबाखू', aliases: ['tobacco', 'tambakhu', 'तंबाखू'] },

  // ---- मसाला पीक / Spices ----
  { canonical: 'turmeric', category: SPICE, mr: 'हळद', hi: 'हल्दी', aliases: ['turmeric', 'halad', 'हळद', 'हल्दी', 'haldi'] },
  { canonical: 'chilli', category: SPICE, mr: 'मिरची', hi: 'मिर्च', aliases: ['chilli', 'chili', 'mirchi', 'मिरची', 'मिर्च'] },
  { canonical: 'ginger', category: SPICE, mr: 'आले', hi: 'अदरक', aliases: ['ginger', 'ale', 'आले', 'अदरक', 'adrak'] },
  { canonical: 'garlic', category: SPICE, mr: 'लसूण', hi: 'लहसुन', aliases: ['garlic', 'lasun', 'लसूण', 'लहसुन', 'lahsun'] },
  { canonical: 'coriander', category: SPICE, mr: 'कोथिंबीर', hi: 'धनिया', aliases: ['coriander', 'kothimbir', 'कोथिंबीर', 'धणे', 'धनिया', 'dhania'] },
  { canonical: 'cumin', category: SPICE, mr: 'जिरे', hi: 'जीरा', aliases: ['cumin', 'jire', 'जिरे', 'जीरा', 'jeera'] },

  // ---- भाजीपाला / Vegetables ----
  { canonical: 'onion', category: VEGETABLE, mr: 'कांदा', hi: 'प्याज', aliases: ['onion', 'kanda', 'कांदा', 'प्याज', 'pyaj'] },
  { canonical: 'potato', category: VEGETABLE, mr: 'बटाटा', hi: 'आलू', aliases: ['potato', 'batata', 'बटाटा', 'आलू', 'alu'] },
  { canonical: 'tomato', category: VEGETABLE, mr: 'टोमॅटो', hi: 'टमाटर', aliases: ['tomato', 'tamato', 'टोमॅटो', 'टमाटर', 'tamatar'] },
  { canonical: 'brinjal', category: VEGETABLE, mr: 'वांगे', hi: 'बैंगन', aliases: ['brinjal', 'eggplant', 'vange', 'वांगे', 'बैंगन', 'baingan'] },
  { canonical: 'okra', category: VEGETABLE, mr: 'भेंडी', hi: 'भिंडी', aliases: ['okra', 'ladyfinger', 'bhendi', 'भेंडी', 'भिंडी', 'bhindi'] },
  { canonical: 'cabbage', category: VEGETABLE, mr: 'कोबी', hi: 'पत्तागोभी', aliases: ['cabbage', 'kobi', 'कोबी', 'पत्ताकोबी', 'पत्तागोभी'] },
  { canonical: 'cauliflower', category: VEGETABLE, mr: 'फुलकोबी', hi: 'गोभी', aliases: ['cauliflower', 'phulkobi', 'फुलकोबी', 'फ्लॉवर', 'गोभी'] },
  { canonical: 'cucumber', category: VEGETABLE, mr: 'काकडी', hi: 'खीरा', aliases: ['cucumber', 'kakdi', 'काकडी', 'खीरा', 'khira'] },
  { canonical: 'bottle gourd', category: VEGETABLE, mr: 'दुधी भोपळा', hi: 'लौकी', aliases: ['bottle gourd', 'dudhi', 'दुधी', 'दुधी भोपळा', 'लौकी', 'lauki'] },
  { canonical: 'bitter gourd', category: VEGETABLE, mr: 'कारले', hi: 'करेला', aliases: ['bitter gourd', 'karle', 'कारले', 'करेला', 'karela'] },
  { canonical: 'peas', category: VEGETABLE, mr: 'वाटाणा', hi: 'मटर', aliases: ['peas', 'green peas', 'vatana', 'वाटाणा', 'मटार', 'matar', 'मटर'] },
  { canonical: 'spinach', category: VEGETABLE, mr: 'पालक', aliases: ['spinach', 'palak', 'पालक'] },
  { canonical: 'fenugreek', category: VEGETABLE, mr: 'मेथी', aliases: ['fenugreek', 'methi', 'मेथी'] },
  { canonical: 'drumstick', category: VEGETABLE, mr: 'शेवगा', hi: 'सहजन', aliases: ['drumstick', 'moringa', 'shevga', 'शेवगा', 'सहजन'] },

  // ---- फळपीक / Fruit ----
  { canonical: 'banana', category: FRUIT, mr: 'केळी', hi: 'केला', aliases: ['banana', 'keli', 'केळी', 'केला', 'kela'] },
  { canonical: 'mango', category: FRUIT, mr: 'आंबा', hi: 'आम', aliases: ['mango', 'amba', 'आंबा', 'आम', 'aam'] },
  { canonical: 'grapes', category: FRUIT, mr: 'द्राक्ष', hi: 'अंगूर', aliases: ['grapes', 'grape', 'draksha', 'द्राक्ष', 'अंगूर', 'angur'] },
  { canonical: 'pomegranate', category: FRUIT, mr: 'डाळिंब', hi: 'अनार', aliases: ['pomegranate', 'dalimb', 'डाळिंब', 'अनार', 'anar'] },
  { canonical: 'orange', category: FRUIT, mr: 'संत्रा', aliases: ['orange', 'santra', 'संत्रा', 'संत्री'] },
  { canonical: 'sweet lime', category: FRUIT, mr: 'मोसंबी', aliases: ['sweet lime', 'mosambi', 'mausambi', 'मोसंबी'] },
  { canonical: 'guava', category: FRUIT, mr: 'पेरू', hi: 'अमरूद', aliases: ['guava', 'peru', 'पेरू', 'अमरूद', 'amrud'] },
  { canonical: 'papaya', category: FRUIT, mr: 'पपई', hi: 'पपीता', aliases: ['papaya', 'papai', 'पपई', 'पपीता', 'papita'] },
  { canonical: 'custard apple', category: FRUIT, mr: 'सीताफळ', hi: 'शरीफा', aliases: ['custard apple', 'sitaphal', 'सीताफळ', 'शरीफा'] },
  { canonical: 'sapota', category: FRUIT, mr: 'चिकू', aliases: ['sapota', 'chiku', 'chikoo', 'चिकू'] },
  { canonical: 'lemon', category: FRUIT, mr: 'लिंबू', hi: 'नींबू', aliases: ['lemon', 'lime', 'limbu', 'लिंबू', 'नींबू', 'nimbu'] },
  { canonical: 'watermelon', category: FRUIT, mr: 'कलिंगड', hi: 'तरबूज', aliases: ['watermelon', 'kalingad', 'कलिंगड', 'तरबूज', 'tarbuz'] },
  { canonical: 'muskmelon', category: FRUIT, mr: 'खरबूज', aliases: ['muskmelon', 'kharbuj', 'खरबूज'] },

  // ---- चारा पीक / Fodder ----
  { canonical: 'lucerne', category: FODDER, mr: 'लसूणघास', aliases: ['lucerne', 'alfalfa', 'lasunghas', 'लसूणघास'] },
  { canonical: 'napier grass', category: FODDER, mr: 'नेपियर गवत', aliases: ['napier grass', 'napier', 'नेपियर', 'नेपियर गवत'] },
];

const CANONICAL_CROPS = CROPS.map((crop) => crop.canonical);

/**
 * Flat alias -> canonical lookup, keyed on the lowercased alias exactly as
 * written above. Kept in this shape because `ai/aiUtils.normalizeCrop` and the
 * pre-Phase-7 voice dictionary both indexed a plain object directly, and a stored
 * crop value must keep resolving the same way it always did.
 */
const CROP_DICTIONARY = {};
CROPS.forEach(({ canonical, mr, hi, aliases }) => {
  // Canonical and display names are always accepted inputs too, listed or not.
  [canonical, mr, hi, ...aliases].forEach((alias) => {
    if (alias) CROP_DICTIONARY[alias.toLowerCase().trim()] = canonical;
  });
});

const CROP_BY_CANONICAL = new Map(CROPS.map((crop) => [crop.canonical, crop]));

function cropCategory(canonical) {
  return CROP_BY_CANONICAL.get(canonical)?.category || null;
}

function cropsInCategory(category) {
  return CROPS.filter((crop) => crop.category === category).map((crop) => crop.canonical);
}

function isKnownCrop(canonical) {
  return CROP_BY_CANONICAL.has(canonical);
}

/**
 * Display name for a crop in the farmer's language.
 *
 * Hindi falls back to the Marathi name where no distinct Hindi one is listed —
 * both are Devanagari and a shared name is far better than dropping to the
 * English canonical for a Hindi-preferring farmer.
 */
function cropLabel(canonical, language = 'mr') {
  const crop = CROP_BY_CANONICAL.get(canonical);
  if (!crop) return canonical;
  if (language === 'en') return crop.canonical;
  if (language === 'hi') return crop.hi || crop.mr || crop.canonical;
  return crop.mr || crop.canonical;
}

module.exports = {
  CROP_CATEGORIES,
  CROPS,
  CANONICAL_CROPS,
  CROP_DICTIONARY,
  cropCategory,
  cropsInCategory,
  isKnownCrop,
  cropLabel,
};
