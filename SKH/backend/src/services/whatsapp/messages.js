const { LANGUAGES } = require('./constants');

const DICTIONARY = {
  [LANGUAGES.MR]: {
    WELCOME: 'नमस्कार! ई-पीक पाहणी मध्ये आपले स्वागत आहे. कृपया तुमची भाषा निवडा:\n1. मराठी\n2. हिंदी\n3. English',
    ASK_CROP: 'कृपया तुम्ही लावलेल्या पिकाचे नाव सांगा.',
    ASK_LOCATION: 'कृपया तुमचे लोकेशन शेअर करा.',
    ASK_IMAGE: 'कृपया तुमच्या शेताचा फोटो पाठवा.',
    READY: 'धन्यवाद. तुमची माहिती पडताळणीसाठी तयार आहे.',
    INVALID_LANGUAGE: 'चुकीची निवड. कृपया 1, 2, किंवा 3 पाठवा.',
    ERROR: 'क्षमस्व, मला ते समजले नाही.',
    MULTIPLE_CROPS: 'अनेक पिके आढळली. कृपया फक्त एका पिकाचे नाव सांगा.',
    UNSUPPORTED_CROP: 'आम्हाला ते पीक ओळखता आले नाही. कृपया तुम्ही लावलेल्या पिकाचे नाव सांगा.',
    UNREGISTERED_FARMER: 'तुमचा WhatsApp नंबर नोंदणीकृत नाही. कृपया प्रथम शेतकरी नोंदणी पूर्ण करा.',
    MISSING_GAT: 'तुमचे प्रोफाईल कोणत्याही गटाशी जोडलेले नाही. कृपया प्रोफाईल अपडेट करा.',
    ASK_GAT_SELECTION: 'कृपया तुम्ही कोणत्या गटाची नोंदणी करत आहात ते निवडा:',
    INVALID_GAT_SELECTION: 'चुकीची निवड. कृपया योग्य क्रमांक पाठवा:'
  },
  [LANGUAGES.HI]: {
    WELCOME: 'नमस्ते! ई-पीक पाहणी में आपका स्वागत है। कृपया अपनी भाषा चुनें:\n1. मराठी\n2. हिंदी\n3. English',
    ASK_CROP: 'कृपया उस फसल का नाम बताएं जो आपने बोई है।',
    ASK_LOCATION: 'कृपया अपनी लोकेशन साझा करें।',
    ASK_IMAGE: 'कृपया अपने खेत की फोटो भेजें।',
    READY: 'धन्यवाद। आपका विवरण सत्यापन के लिए तैयार है.',
    INVALID_LANGUAGE: 'अमान्य चयन। कृपया 1, 2, या 3 भेजें।',
    ERROR: 'क्षमा करें, मुझे समझ नहीं आया।',
    MULTIPLE_CROPS: 'कई फसलें मिलीं। कृपया केवल एक फसल का नाम बताएं।',
    UNSUPPORTED_CROP: 'हम उस फसल को नहीं पहचान सके। कृपया उस फसल का नाम बताएं जो आपने बोई है।',
    UNREGISTERED_FARMER: 'आपका WhatsApp नंबर पंजीकृत नहीं है। कृपया पहले किसान पंजीकरण पूरा करें।',
    MISSING_GAT: 'आपका प्रोफ़ाइल किसी गट से नहीं जुड़ा है। कृपया प्रोफ़ाइल अपडेट करें।',
    ASK_GAT_SELECTION: 'कृपया चुनें कि आप किस गट की रिपोर्ट कर रहे हैं:',
    INVALID_GAT_SELECTION: 'अमान्य चयन। कृपया सही संख्या भेजें:'
  },
  [LANGUAGES.EN]: {
    WELCOME: 'Namaskar! 🙏\n\nWelcome to Smart E-Peek Pahani.\n\nPlease select your language:\n1. मराठी\n2. हिंदी\n3. English',
    ASK_CROP: 'Please tell us your crop.\n\nExample:\nCotton\nSoybean',
    ASK_LOCATION: 'Please share your field location on WhatsApp.',
    ASK_IMAGE: 'Please send a clear photo of your crop.',
    READY: 'Information gathered. Validation in progress...',
    INVALID_LANGUAGE: 'Please select a valid option (1, 2, or 3).',
    ERROR: 'Something went wrong. Please try again.',
    MULTIPLE_CROPS: 'Multiple crops detected. Please declare only one crop.',
    UNSUPPORTED_CROP: 'We did not recognize that crop. Please tell us the crop you planted.',
    UNREGISTERED_FARMER: 'Your WhatsApp number is not registered. Please complete farmer registration before submitting your crop details.',
    MISSING_GAT: 'Your farmer profile is not linked to a Gat. Please complete your profile registration.',
    ASK_GAT_SELECTION: 'Please select which field you want to report:',
    INVALID_GAT_SELECTION: 'Invalid selection. Please reply with a valid number:'
  }
};

/**
 * Gets a translated message for a specific key and language.
 * Defaults to English if language is not set or not found.
 */
function getMessage(key, language = LANGUAGES.EN) {
  const langDict = DICTIONARY[language] || DICTIONARY[LANGUAGES.EN];
  return langDict[key] || DICTIONARY[LANGUAGES.EN][key] || 'Message not found.';
}

module.exports = {
  getMessage,
  DICTIONARY
};
