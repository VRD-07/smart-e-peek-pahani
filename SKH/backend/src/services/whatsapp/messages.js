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
    INVALID_GAT_SELECTION: 'चुकीची निवड. कृपया योग्य क्रमांक पाठवा:',
    SEASON_KHARIF: 'खरीप',
    SEASON_RABI: 'रब्बी',
    SEASON_SUMMER: 'उन्हाळी',
    AWARENESS_INTRO: 'ई-पीक पाहणी म्हणजे काय?\n\nतुमच्या शेतात कोणते पीक आहे याची शासकीय नोंद. ही नोंद शेतकऱ्याने स्वतः करायची असते.\n\nही नोंद का महत्त्वाची आहे?\nअतिवृष्टी, दुष्काळ किंवा गारपीट यासाठी शासन नुकसान भरपाई जाहीर करते. पण भरपाई मिळण्यासाठी त्या हंगामात तुमच्या पिकाची नोंद झालेली असणे आवश्यक असते. नोंद नसेल, तर खरोखर नुकसान होऊनही मदत मिळत नाही.\n\nनोंद करण्यासाठी कधीही \'Hi\' पाठवा. फक्त दोन मिनिटे लागतात.',
    DEADLINE_REMINDER: 'स्मरणपत्र: {{season}} {{year}} ई-पीक पाहणीची अंतिम तारीख {{date}} आहे — {{days}} दिवस शिल्लक.\n\nया हंगामात तुमच्या पिकाची नोंद आमच्याकडे दिसत नाही. नोंद नसेल तर पिकाचे नुकसान झाले तरी नुकसान भरपाईसाठी तुम्ही पात्र ठरणार नाही.\n\nआता नोंद करण्यासाठी \'Hi\' पाठवा. फक्त दोन मिनिटे लागतात.',
    CALAMITY_FLOOD: 'पूर',
    CALAMITY_DROUGHT: 'दुष्काळ',
    CALAMITY_HAILSTORM: 'गारपीट',
    CALAMITY_CYCLONE: 'चक्रीवादळ',
    CALAMITY_UNSEASONAL_RAIN: 'अवकाळी पाऊस',
    CALAMITY_OTHER: 'नैसर्गिक आपत्ती',
    CALAMITY_RELIEF_MATCH: 'तुमच्या नोंदणीकृत शेतासाठी आपत्ती जाहीर झाली आहे.\n\nआपत्ती: {{calamity}}\nशेत: गट {{gat}}\nजाहीर दिनांक: {{declaredDate}}\n\nतुमची {{date}} रोजीची पडताळणी झालेली {{crop}} नोंद तुम्हाला नुकसान भरपाईसाठी पात्र ठरवू शकते.\n\nपुढील पायरी: तुमच्या गावातील तलाठ्यांशी संपर्क साधा आणि भरपाईची पडताळणी सुरू झाल्यावर ही पीक नोंद सांगा.\n\nहा संदेश मंजुरी नाही. पात्रता महसूल कार्यालय ठरवते — ही नोंद ते तपासणारा पुरावा आहे.'
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
    INVALID_GAT_SELECTION: 'अमान्य चयन। कृपया सही संख्या भेजें:',
    SEASON_KHARIF: 'खरीफ',
    SEASON_RABI: 'रबी',
    SEASON_SUMMER: 'ज़ायद',
    AWARENESS_INTRO: 'ई-पीक पाहणी क्या है?\n\nआपके खेत में कौन सी फसल खड़ी है, इसका सरकारी रिकॉर्ड। यह रिकॉर्ड किसान को खुद दर्ज करना होता है।\n\nयह क्यों ज़रूरी है?\nअतिवृष्टि, सूखा या ओलावृष्टि पर सरकार मुआवज़ा घोषित करती है। लेकिन मुआवज़े के लिए उस मौसम में आपकी फसल का रिकॉर्ड होना ज़रूरी है। रिकॉर्ड न हो तो नुकसान होने पर भी मदद नहीं मिलती।\n\nदर्ज करने के लिए कभी भी \'Hi\' भेजें। सिर्फ दो मिनट लगते हैं।',
    DEADLINE_REMINDER: 'स्मरण: {{season}} {{year}} ई-पीक पाहणी की अंतिम तारीख {{date}} है — {{days}} दिन बाकी।\n\nइस मौसम में आपकी फसल का रिकॉर्ड हमारे पास नहीं है। रिकॉर्ड न होने पर फसल का नुकसान होने पर भी आप मुआवज़े के पात्र नहीं होंगे।\n\nअभी दर्ज करने के लिए \'Hi\' भेजें। सिर्फ दो मिनट लगते हैं।',
    CALAMITY_FLOOD: 'बाढ़',
    CALAMITY_DROUGHT: 'सूखा',
    CALAMITY_HAILSTORM: 'ओलावृष्टि',
    CALAMITY_CYCLONE: 'चक्रवात',
    CALAMITY_UNSEASONAL_RAIN: 'बेमौसम बारिश',
    CALAMITY_OTHER: 'प्राकृतिक आपदा',
    CALAMITY_RELIEF_MATCH: 'आपके पंजीकृत खेत के लिए आपदा घोषित की गई है।\n\nआपदा: {{calamity}}\nखेत: गट {{gat}}\nघोषणा दिनांक: {{declaredDate}}\n\n{{date}} की आपकी सत्यापित {{crop}} नोंद आपको मुआवज़े के लिए पात्र बना सकती है।\n\nअगला कदम: अपने गाँव के तलाठी से संपर्क करें और मुआवज़े का आकलन शुरू होने पर यह फसल रिकॉर्ड बताएं।\n\nयह संदेश स्वीकृति नहीं है। पात्रता राजस्व कार्यालय तय करता है — यह रिकॉर्ड वही सबूत है जिसकी वे जाँच करते हैं।'
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
    INVALID_GAT_SELECTION: 'Invalid selection. Please reply with a valid number:',
    SEASON_KHARIF: 'Kharif',
    SEASON_RABI: 'Rabi',
    SEASON_SUMMER: 'Summer',
    AWARENESS_INTRO: 'What is E-Peek Pahani?\n\nIt is the government record of which crop is standing in your field. The record has to be filed by you, the farmer.\n\nWhy it matters:\nWhen heavy rain, drought or hailstorm is declared a calamity, the state announces compensation — but relief is assessed against the crop record filed for that season. With no record, help does not reach you even when the loss is real.\n\nSend \'Hi\' whenever you are ready to file. It takes about two minutes.',
    DEADLINE_REMINDER: 'Reminder: {{season}} {{year}} E-Peek Pahani closes on {{date}} — {{days}} day(s) left.\n\nWe do not see a crop record on file for you this season. Without one you will not be eligible for calamity relief for this season, even if your crop is damaged.\n\nSend \'Hi\' to file now. It takes about two minutes.',
    CALAMITY_FLOOD: 'Flood',
    CALAMITY_DROUGHT: 'Drought',
    CALAMITY_HAILSTORM: 'Hailstorm',
    CALAMITY_CYCLONE: 'Cyclone',
    CALAMITY_UNSEASONAL_RAIN: 'Unseasonal rain',
    CALAMITY_OTHER: 'Natural calamity',
    CALAMITY_RELIEF_MATCH: 'A calamity has been declared covering your registered field.\n\nCalamity: {{calamity}}\nField: Gat {{gat}}\nDeclared on: {{declaredDate}}\n\nYour verified {{crop}} submission from {{date}} may qualify you for relief.\n\nNext steps: contact your village talathi and quote this crop record when the relief assessment for your village opens.\n\nThis message is not an approval. Eligibility is decided by the revenue office — this record is the evidence they assess.'
  }
};

/**
 * Replaces {{token}} placeholders with the supplied values.
 * Missing tokens are left untouched so a copy change never yields 'undefined'.
 */
function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => (
    vars[key] === undefined || vars[key] === null ? match : String(vars[key])
  ));
}

/**
 * Gets a translated message for a specific key and language.
 * Defaults to English if language is not set or not found.
 * Pass `vars` to fill {{token}} placeholders (used by awareness reminders).
 */
function getMessage(key, language = LANGUAGES.EN, vars = null) {
  const langDict = DICTIONARY[language] || DICTIONARY[LANGUAGES.EN];
  const template = langDict[key] || DICTIONARY[LANGUAGES.EN][key] || 'Message not found.';
  return interpolate(template, vars);
}

module.exports = {
  getMessage,
  DICTIONARY
};
