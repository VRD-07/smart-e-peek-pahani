const { LANGUAGES } = require('./constants');

/**
 * Every farmer-facing string the bot can send, in Marathi, Hindi and English.
 *
 * Marathi is the default, not an option. The users are Marathi-speaking farmers in
 * Maharashtra, so the bot opens in Marathi and stays there unless a farmer asks
 * otherwise — there is no language menu at the start of a conversation, and
 * `getMessage` falls back to Marathi rather than English for a missing key. A
 * farmer who wants another language types "English" or "हिंदी" once and that
 * preference is stored on their record.
 *
 * Copy rules that are not style preferences:
 *   - Nothing here claims a filing is approved, guaranteed, verified beyond doubt,
 *     or fraud-proof. The bot records and routes; the revenue office decides.
 *   - A message that reports a problem says whose problem it is. VOICE_FAILED owns
 *     the failure; VOICE_UNCLEAR does not blame the farmer for words we could not
 *     resolve.
 *   - A filing sent to review is described as sent to review, never as rejected,
 *     and always tells the farmer not to file it again.
 */

const DICTIONARY = {
  [LANGUAGES.MR]: {
    // ---- Session and language ----
    WELCOME: 'नमस्कार! ई-पीक पाहणी मध्ये आपले स्वागत आहे.\n\n(भाषा बदलण्यासाठी English किंवा हिंदी असे लिहा.)',
    LANGUAGE_SWITCHED: 'भाषा मराठी केली आहे.',
    ERROR: 'क्षमस्व, मला ते समजले नाही.',
    INVALID_CHOICE: 'चुकीची निवड. कृपया यादीतील क्रमांक पाठवा.',
    UNREGISTERED_FARMER: 'तुमचा WhatsApp नंबर नोंदणीकृत नाही. कृपया प्रथम शेतकरी नोंदणी पूर्ण करा.',
    MISSING_GAT: 'तुमचे प्रोफाईल कोणत्याही गटाशी जोडलेले नाही. कृपया प्रोफाईल अपडेट करा.',

    // ---- Farm selection ----
    GAT_LABEL: 'गट {{gat}} — {{village}}',
    ASK_GAT_SELECTION: 'कृपया तुम्ही कोणत्या गटाची नोंदणी करत आहात ते निवडा:',
    INVALID_GAT_SELECTION: 'चुकीची निवड. कृपया योग्य क्रमांक पाठवा:',
    ASK_VILLAGE_SELECTION: 'कृपया आपले गाव निवडा (किंवा गावाचे नाव थेट टाइप करा):',
    INVALID_VILLAGE_SELECTION: 'चुकीचे गाव किंवा क्रमांक. कृपया यादीतील क्रमांक निवडा किंवा गावाचे नाव टाइप करा:',
    MANY_GATS_HINT: 'यादीत {{total}} पैकी पहिली {{shown}} शेते दिसत आहेत. तुमचा गट क्रमांक थेट टाइप करूनही निवडता येईल.',

    // ---- Farm action hub ----
    ASK_ACTION: 'गट {{gat}} — {{village}}\n\nतुम्हाला काय करायचे आहे?',
    ACTION_REGISTER_CROP: 'नवीन पीक नोंद करा',
    ACTION_VIEW_HISTORY: 'या शेताच्या नोंदी पहा',
    ACTION_REGISTER_PLANTING: 'हद्दीवरील झाडांची नोंद',
    ACTION_OTHER: 'इतर नोंदी',
    // Says plainly that these exist in the real form and are not built here yet.
    NOT_IMPLEMENTED: 'खालील नोंदी ई-पीक पाहणीमध्ये असतात, पण या आवृत्तीत अद्याप बनवलेल्या नाहीत:\n\n{{list}}\n\nसध्या पीक नोंद आणि हद्दीवरील झाडांची नोंद करता येते.',
    ACTION_REGISTER_ROAD: 'शेतरस्ता / पाणंद नोंद',
    ACTION_REGISTER_STRUCTURE: 'विहीर, शेततळे व इतर बांधकाम नोंद',
    ACTION_DECLARE_FALLOW: 'पड जमीन नोंद',

    // ---- Submission history ----
    HISTORY_HEADER: 'गट {{gat}} — पीक नोंदींचा इतिहास',
    HISTORY_EMPTY: 'गट {{gat}} साठी अद्याप कोणतीही पीक नोंद नाही.\n\nनोंद करण्यासाठी \'Hi\' पाठवा.',
    HISTORY_FOOTER: 'नवीन नोंद करण्यासाठी \'Hi\' पाठवा.',
    STATUS_DRAFT: 'अपूर्ण',
    STATUS_PENDING_VALIDATION: 'पडताळणी सुरू',
    STATUS_VALID: 'पडताळणी झाली',
    STATUS_REVIEW: 'अधिकाऱ्यांच्या तपासणीसाठी',
    STATUS_INVALID: 'नाकारली',
    STATUS_SYNC_PENDING: 'सिंक बाकी',
    STATUS_SYNCED: 'सिंक झाली',

    // ---- Survey form ----
    ASK_SEASON: 'कोणत्या हंगामाची नोंद करायची आहे?',
    SEASON_KHARIF: 'खरीप',
    SEASON_RABI: 'रब्बी',
    SEASON_SUMMER: 'उन्हाळी',
    ASK_PEEK_TYPE: 'या क्षेत्रात एकच पीक आहे की मिश्र पीक?',
    PEEK_SINGLE: 'एकच पीक',
    PEEK_MIXED: 'मिश्र पीक',
    ASK_AREA: 'या पिकाखालील क्षेत्र किती आहे?\n\nहेक्टर, एकर किंवा गुंठे मध्ये लिहू शकता.\n\nउदाहरण:\n0.6\n1 एकर\n20 गुंठे',
    AREA_TOTAL_CONTEXT: 'गट {{gat}} चे नोंदणीकृत क्षेत्र: {{total}}',
    AREA_ALREADY_USED: 'या हंगामात या गटावर आधीच नोंदवलेले क्षेत्र: {{used}}\nशिल्लक: {{remaining}}',
    AREA_NO_NUMBER: 'क्षेत्र समजले नाही. कृपया आकड्यात लिहा.\n\nउदाहरण:\n0.6\n1 एकर\n20 गुंठे',
    AREA_NOT_POSITIVE: 'क्षेत्र शून्यापेक्षा मोठे असावे. कृपया पुन्हा लिहा.',
    AREA_UNKNOWN_UNIT: 'क्षेत्राचे एकक ओळखता आले नाही. हेक्टर, आर, एकर किंवा गुंठे वापरा.\n\nउदाहरण:\n1 एकर\n20 गुंठे',
    AREA_ACCEPTED: 'क्षेत्र नोंदवले: {{area}}',
    ASK_WATER_SOURCE: 'पाण्याचा स्रोत कोणता?',
    WATER_WELL: 'विहीर / बोरवेल',
    WATER_RIVER: 'नदी / कालवा',
    WATER_DRIP: 'ठिबक सिंचन',
    WATER_OTHER: 'इतर',
    // WhatsApp allows three Quick Reply buttons and there are four water sources,
    // so the fourth is offered as a keyword instead of being dropped.
    WATER_OTHER_HINT: 'यापैकी नसेल तर \'इतर\' असे लिहा.',
    ASK_WATER_OTHER: 'पाण्याचा स्रोत थोडक्यात लिहा.',
    ASK_CROP_CATEGORY: 'पिकाचा वर्ग निवडा:',
    CROP_CLASS_CEREAL: 'तृणधान्य',
    CROP_CLASS_PULSE: 'कडधान्य',
    CROP_CLASS_OILSEED: 'तेलबिया',
    CROP_CLASS_CASH: 'नगदी पीक',
    CROP_CLASS_SPICE: 'मसाला पीक',
    CROP_CLASS_VEGETABLE: 'भाजीपाला',
    CROP_CLASS_FRUIT: 'फळपीक',
    CROP_CLASS_FODDER: 'चारा पीक',
    ASK_CROP: 'कृपया तुम्ही लावलेल्या पिकाचे नाव सांगा.\n\nतुम्ही टाइप करू शकता किंवा व्हॉईस मेसेज पाठवू शकता.\n\nउदाहरण:\nसोयाबीन\nकापूस\nऊस',
    CROP_EXAMPLES: 'उदाहरण: {{examples}}',
    MULTIPLE_CROPS: 'अनेक पिके आढळली. कृपया फक्त एका पिकाचे नाव सांगा.',
    CROP_PICK_ONE: 'तुम्हाला कोणते पीक नोंदवायचे आहे?',
    CROP_CONFIRM: 'तुम्हाला हे पीक म्हणायचे आहे का?',
    CROP_CONFIRM_NONE: 'यापैकी नाही — पुन्हा लिहा',
    UNSUPPORTED_CROP: 'आम्हाला ते पीक ओळखता आले नाही. कृपया तुम्ही लावलेल्या पिकाचे नाव सांगा.\n\nतृणधान्य, कडधान्य, तेलबिया, नगदी, मसाला, भाजीपाला, फळपिके आणि चारा पिके नोंदवता येतात.\n\nउदाहरण:\nसोयाबीन\nकापूस\nऊस',
    // Two separate messages on purpose. VOICE_UNCLEAR says "I could not make out
    // what you said"; VOICE_FAILED says "our system could not process it". The
    // farmer should never be told they were unclear when the fault was ours.
    VOICE_UNCLEAR: 'तुमच्या व्हॉईस मेसेजमधून पिकाचे नाव स्पष्ट ऐकू आले नाही.\n\nकृपया पिकाचे नाव टाइप करा.\n\nउदाहरण:\nसोयाबीन\nकापूस',
    VOICE_FAILED: 'तुमचा व्हॉईस मेसेज आम्हाला आत्ता तपासता आला नाही. ही आमच्या बाजूची अडचण आहे.\n\nकृपया पिकाचे नाव टाइप करा.\n\nउदाहरण:\nसोयाबीन\nकापूस',
    ASK_SOWING_DATE: 'पेरणीची तारीख सांगा.\n\nउदाहरण:\n12/06/2026\n12 जून\nआज',
    SOWING_DATE_UNPARSEABLE: 'तारीख समजली नाही. कृपया दिवस/महिना/वर्ष अशा स्वरूपात लिहा.\n\nउदाहरण:\n12/06/2026\n12 जून\nआज',
    SOWING_DATE_FUTURE: 'पेरणीची तारीख भविष्यातील असू शकत नाही. कृपया प्रत्यक्ष पेरणीची तारीख लिहा.',
    SOWING_DATE_TOO_OLD: 'ही तारीख फार जुनी वाटते. कृपया या हंगामातील पेरणीची तारीख तपासून लिहा.',

    // ---- Photo and location (unchanged from earlier phases) ----
    ASK_LOCATION: 'कृपया तुमचे लोकेशन शेअर करा.',
    ASK_IMAGE: 'कृपया तुमच्या शेताचा फोटो पाठवा.',
    READY: 'धन्यवाद. तुमची माहिती पडताळणीसाठी तयार आहे.',

    // ---- Tree / boundary planting ----
    ASK_PLANTING_TYPE: 'शेताच्या हद्दीवर कोणत्या प्रकारची झाडे लावली आहेत?\n\nउदाहरण:\nसागवान\nआंबा\nबांबू',
    ASK_PLANTING_LOCATION: 'झाडे शेताच्या कोणत्या बाजूला आहेत? लोकेशन शेअर करा किंवा थोडक्यात लिहा.\n\nउदाहरण:\nपूर्वेकडील बांध\nरस्त्याच्या कडेला',
    PLANTING_SAVED: 'झाडांची नोंद घेतली.\n\nप्रकार: {{treeType}}\nठिकाण: {{location}}',
    // The brief keeps this record outside the validation gate, and the farmer is
    // told so — a record that is never checked must not look like one that passed.
    PLANTING_INFO_ONLY: 'ही नोंद केवळ माहितीसाठी आहे. ती पीक पडताळणीचा भाग नाही आणि तिची पडताळणी होत नाही.',

    // ---- Area overallocation outcome ----
    AREA_OVERALLOCATION_NOTICE: 'तुम्ही नोंदवलेले क्षेत्र या गटाच्या नोंदणीकृत क्षेत्रात बसत नाही.\n\nनोंदणीकृत क्षेत्र: {{registered}}\nया हंगामातील एकूण नोंद: {{claimed}}\n\nतुमची नोंद रद्द झालेली नाही — ती अधिकाऱ्यांच्या तपासणीसाठी पाठवली आहे. पुन्हा नोंद करू नका.',

    // ---- Out-of-boundary outcome ----
    OUT_OF_BOUNDS_DISTANCE_NOTICE: 'तुम्ही तुमच्या नोंदणीकृत शेताच्या हद्दीपासून अंदाजे {{distance}} अंतरावर आहात.\n\nतुमच्या शेतात उभे राहून पुन्हा नोंद करा, किंवा यादीतून योग्य गट निवडा.',

    // ---- Awareness (Phase 6) ----
    AWARENESS_INTRO: 'ई-पीक पाहणी म्हणजे काय?\n\nतुमच्या शेतात कोणते पीक आहे याची शासकीय नोंद. ही नोंद शेतकऱ्याने स्वतः करायची असते.\n\nही नोंद का महत्त्वाची आहे?\nअतिवृष्टी, दुष्काळ किंवा गारपीट यासाठी शासन नुकसान भरपाई जाहीर करते. पण भरपाई मिळण्यासाठी त्या हंगामात तुमच्या पिकाची नोंद झालेली असणे आवश्यक असते. नोंद नसेल, तर खरोखर नुकसान होऊनही मदत मिळत नाही.\n\nनोंद करण्यासाठी कधीही \'Hi\' पाठवा. फक्त दोन मिनिटे लागतात.',
    DEADLINE_REMINDER: 'स्मरणपत्र: {{season}} {{year}} ई-पीक पाहणीची अंतिम तारीख {{date}} आहे — {{days}} दिवस शिल्लक.\n\nया हंगामात तुमच्या पिकाची नोंद आमच्याकडे दिसत नाही. नोंद नसेल तर पिकाचे नुकसान झाले तरी नुकसान भरपाईसाठी तुम्ही पात्र ठरणार नाही.\n\nआता नोंद करण्यासाठी \'Hi\' पाठवा. फक्त दोन मिनिटे लागतात.',
    CALAMITY_FLOOD: 'पूर',
    CALAMITY_DROUGHT: 'दुष्काळ',
    CALAMITY_HAILSTORM: 'गारपीट',
    CALAMITY_CYCLONE: 'चक्रीवादळ',
    CALAMITY_UNSEASONAL_RAIN: 'अवकाळी पाऊस',
    CALAMITY_OTHER: 'नैसर्गिक आपत्ती',
    CALAMITY_RELIEF_MATCH: 'तुमच्या नोंदणीकृत शेतासाठी आपत्ती जाहीर झाली आहे.\n\nआपत्ती: {{calamity}}\nशेत: गट {{gat}}\nजाहीर दिनांक: {{declaredDate}}\n\nतुमची {{date}} रोजीची पडताळणी झालेली {{crop}} नोंद तुम्हाला नुकसान भरपाईसाठी पात्र ठरवू शकते.\n\nपुढील पायरी: तुमच्या गावातील तलाठ्यांशी संपर्क साधा आणि भरपाईची पडताळणी सुरू झाल्यावर ही पीक नोंद सांगा.\n\nहा संदेश मंजुरी नाही. पात्रता महसूल कार्यालय ठरवते — ही नोंद ते तपासणारा पुरावा आहे.',
    // SMS fallback copy: the same message stripped to what survives a text.
    // No emoji, no line-art, no long paragraphs. Devanagari forces UCS-2
    // encoding, so an SMS segment holds 70 characters rather than 160 — these
    // are written to fit two segments, which is why they say less than the
    // WhatsApp versions rather than being a truncation of them.
    SMS_DEADLINE_REMINDER: 'ई-पीक पाहणी: {{season}} {{year}} अंतिम तारीख {{date}}. तुमची पीक नोंद नाही. नोंदीशिवाय नुकसान भरपाई मिळत नाही. नोंदणीसाठी WhatsApp वर Hi पाठवा.',
    SMS_CALAMITY_RELIEF: 'ई-पीक पाहणी: तुमच्या गट {{gat}} साठी {{calamity}} जाहीर. तुमची पडताळणी झालेली नोंद भरपाईसाठी पात्र ठरू शकते. तलाठ्यांशी संपर्क साधा. ही मंजुरी नाही.',
    SMS_SUBMISSION_REVIEW: 'ई-पीक पाहणी: तुमची पीक नोंद मिळाली, पण ती अधिकाऱ्यांच्या तपासणीसाठी पाठवली आहे. नोंद रद्द झालेली नाही. पुन्हा नोंद करू नका.',
    SMS_AWARENESS_INTRO: 'ई-पीक पाहणी: शेतातील पिकाची शासकीय नोंद शेतकऱ्याने स्वतः करायची असते. नोंदीशिवाय नुकसान भरपाई मिळत नाही. नोंदणीसाठी WhatsApp वर Hi पाठवा.'
  },
  [LANGUAGES.HI]: {
    // ---- Session and language ----
    WELCOME: 'नमस्ते! ई-पीक पाहणी में आपका स्वागत है।\n\n(भाषा बदलने के लिए English या मराठी लिखें।)',
    LANGUAGE_SWITCHED: 'भाषा हिंदी कर दी गई है।',
    ERROR: 'क्षमा करें, मुझे समझ नहीं आया।',
    INVALID_CHOICE: 'अमान्य चयन। कृपया सूची में दिया गया नंबर भेजें।',
    UNREGISTERED_FARMER: 'आपका WhatsApp नंबर पंजीकृत नहीं है। कृपया पहले किसान पंजीकरण पूरा करें।',
    MISSING_GAT: 'आपका प्रोफ़ाइल किसी गट से नहीं जुड़ा है। कृपया प्रोफ़ाइल अपडेट करें।',

    // ---- Farm selection ----
    GAT_LABEL: 'गट {{gat}} — {{village}}',
    ASK_GAT_SELECTION: 'कृपया चुनें कि आप किस गट की रिपोर्ट कर रहे हैं:',
    INVALID_GAT_SELECTION: 'अमान्य चयन। कृपया सही संख्या भेजें:',
    ASK_VILLAGE_SELECTION: 'कृपया अपना गाँव चुनें (या गाँव का नाम सीधे टाइप करें):',
    INVALID_VILLAGE_SELECTION: 'अमान्य गाँव या संख्या। कृपया सूची में से संख्या चुनें या गाँव का नाम टाइप करें:',
    MANY_GATS_HINT: 'सूची में {{total}} में से पहले {{shown}} खेत दिख रहे हैं। आप अपना गट नंबर सीधे टाइप करके भी चुन सकते हैं।',

    // ---- Farm action hub ----
    ASK_ACTION: 'गट {{gat}} — {{village}}\n\nआप क्या करना चाहते हैं?',
    ACTION_REGISTER_CROP: 'नई फसल दर्ज करें',
    ACTION_VIEW_HISTORY: 'इस खेत की नोंद देखें',
    ACTION_REGISTER_PLANTING: 'मेड़ पर लगे पेड़ों की नोंद',
    ACTION_OTHER: 'अन्य नोंद',
    NOT_IMPLEMENTED: 'नीचे दी गई नोंद ई-पीक पाहणी में होती हैं, पर इस संस्करण में अभी बनाई नहीं गई हैं:\n\n{{list}}\n\nअभी फसल नोंद और मेड़ के पेड़ों की नोंद की जा सकती है।',
    ACTION_REGISTER_ROAD: 'खेत रास्ता नोंद',
    ACTION_REGISTER_STRUCTURE: 'कुआँ, खेत तालाब व अन्य निर्माण नोंद',
    ACTION_DECLARE_FALLOW: 'परती ज़मीन नोंद',

    // ---- Submission history ----
    HISTORY_HEADER: 'गट {{gat}} — फसल नोंद का इतिहास',
    HISTORY_EMPTY: 'गट {{gat}} के लिए अभी कोई फसल नोंद नहीं है।\n\nदर्ज करने के लिए \'Hi\' भेजें।',
    HISTORY_FOOTER: 'नई नोंद के लिए \'Hi\' भेजें।',
    STATUS_DRAFT: 'अपूर्ण',
    STATUS_PENDING_VALIDATION: 'सत्यापन जारी',
    STATUS_VALID: 'सत्यापित',
    STATUS_REVIEW: 'अधिकारी की जाँच के लिए',
    STATUS_INVALID: 'अस्वीकृत',
    STATUS_SYNC_PENDING: 'सिंक बाकी',
    STATUS_SYNCED: 'सिंक हुई',

    // ---- Survey form ----
    ASK_SEASON: 'किस मौसम की नोंद करनी है?',
    SEASON_KHARIF: 'खरीफ',
    SEASON_RABI: 'रबी',
    SEASON_SUMMER: 'ज़ायद',
    ASK_PEEK_TYPE: 'इस क्षेत्र में एक ही फसल है या मिश्र फसल?',
    PEEK_SINGLE: 'एक ही फसल',
    PEEK_MIXED: 'मिश्र फसल',
    ASK_AREA: 'इस फसल के नीचे कितना क्षेत्र है?\n\nहेक्टर, एकड़ या गुंठे में लिख सकते हैं।\n\nउदाहरण:\n0.6\n1 एकड़\n20 गुंठे',
    AREA_TOTAL_CONTEXT: 'गट {{gat}} का पंजीकृत क्षेत्र: {{total}}',
    AREA_ALREADY_USED: 'इस मौसम में इस गट पर पहले से दर्ज क्षेत्र: {{used}}\nशेष: {{remaining}}',
    AREA_NO_NUMBER: 'क्षेत्र समझ नहीं आया। कृपया अंकों में लिखें।\n\nउदाहरण:\n0.6\n1 एकड़\n20 गुंठे',
    AREA_NOT_POSITIVE: 'क्षेत्र शून्य से बड़ा होना चाहिए। कृपया दोबारा लिखें।',
    AREA_UNKNOWN_UNIT: 'क्षेत्र की इकाई पहचान नहीं सके। हेक्टर, आर, एकड़ या गुंठे का प्रयोग करें।\n\nउदाहरण:\n1 एकड़\n20 गुंठे',
    AREA_ACCEPTED: 'क्षेत्र दर्ज किया: {{area}}',
    ASK_WATER_SOURCE: 'पानी का स्रोत कौन सा है?',
    WATER_WELL: 'कुआँ / बोरवेल',
    WATER_RIVER: 'नदी / नहर',
    WATER_DRIP: 'ठिबक सिंचन (ड्रिप)',
    WATER_OTHER: 'अन्य',
    WATER_OTHER_HINT: 'इनमें से न हो तो \'अन्य\' लिखें।',
    ASK_WATER_OTHER: 'पानी का स्रोत संक्षेप में लिखें।',
    ASK_CROP_CATEGORY: 'फसल का वर्ग चुनें:',
    CROP_CLASS_CEREAL: 'अनाज',
    CROP_CLASS_PULSE: 'दलहन',
    CROP_CLASS_OILSEED: 'तिलहन',
    CROP_CLASS_CASH: 'नकदी फसल',
    CROP_CLASS_SPICE: 'मसाला फसल',
    CROP_CLASS_VEGETABLE: 'सब्ज़ी',
    CROP_CLASS_FRUIT: 'फल फसल',
    CROP_CLASS_FODDER: 'चारा फसल',
    ASK_CROP: 'कृपया उस फसल का नाम बताएं जो आपने बोई है।\n\nआप टाइप कर सकते हैं या वॉइस मैसेज भेज सकते हैं।\n\nउदाहरण:\nसोयाबीन\nकपास\nगन्ना',
    CROP_EXAMPLES: 'उदाहरण: {{examples}}',
    MULTIPLE_CROPS: 'कई फसलें मिलीं। कृपया केवल एक फसल का नाम बताएं।',
    CROP_PICK_ONE: 'आप कौन सी फसल दर्ज करना चाहते हैं?',
    CROP_CONFIRM: 'क्या आपका मतलब यही फसल है?',
    CROP_CONFIRM_NONE: 'इनमें से नहीं — दोबारा लिखें',
    UNSUPPORTED_CROP: 'हम उस फसल को नहीं पहचान सके। कृपया उस फसल का नाम बताएं जो आपने बोई है।\n\nअनाज, दलहन, तिलहन, नकदी, मसाला, सब्ज़ी, फल और चारा फसलें दर्ज की जा सकती हैं।\n\nउदाहरण:\nसोयाबीन\nकपास\nगन्ना',
    VOICE_UNCLEAR: 'आपके वॉइस मैसेज से फसल का नाम साफ़ सुनाई नहीं आया।\n\nकृपया फसल का नाम टाइप करें।\n\nउदाहरण:\nसोयाबीन\nकपास',
    VOICE_FAILED: 'हम आपका वॉइस मैसेज अभी जाँच नहीं सके। यह हमारी तरफ़ की दिक्कत है।\n\nकृपया फसल का नाम टाइप करें।\n\nउदाहरण:\nसोयाबीन\nकपास',
    ASK_SOWING_DATE: 'बुवाई की तारीख बताएं।\n\nउदाहरण:\n12/06/2026\n12 जून\nआज',
    SOWING_DATE_UNPARSEABLE: 'तारीख समझ नहीं आई। कृपया दिन/महीना/वर्ष के रूप में लिखें।\n\nउदाहरण:\n12/06/2026\n12 जून\nआज',
    SOWING_DATE_FUTURE: 'बुवाई की तारीख भविष्य की नहीं हो सकती। कृपया वास्तविक बुवाई तारीख लिखें।',
    SOWING_DATE_TOO_OLD: 'यह तारीख बहुत पुरानी लगती है। कृपया इस मौसम की बुवाई तारीख जाँच कर लिखें।',

    // ---- Photo and location ----
    ASK_LOCATION: 'कृपया अपनी लोकेशन साझा करें।',
    ASK_IMAGE: 'कृपया अपने खेत की फोटो भेजें।',
    READY: 'धन्यवाद। आपका विवरण सत्यापन के लिए तैयार है.',

    // ---- Tree / boundary planting ----
    ASK_PLANTING_TYPE: 'खेत की मेड़ पर किस प्रकार के पेड़ लगाए हैं?\n\nउदाहरण:\nसागवान\nआम\nबाँस',
    ASK_PLANTING_LOCATION: 'पेड़ खेत की किस तरफ़ हैं? लोकेशन साझा करें या संक्षेप में लिखें।\n\nउदाहरण:\nपूर्व की मेड़\nसड़क के किनारे',
    PLANTING_SAVED: 'पेड़ों की नोंद ले ली गई।\n\nप्रकार: {{treeType}}\nस्थान: {{location}}',
    PLANTING_INFO_ONLY: 'यह नोंद केवल जानकारी के लिए है। यह फसल सत्यापन का हिस्सा नहीं है और इसका सत्यापन नहीं होता।',

    // ---- Submission outcomes ----
    SUBMISSION_OUTCOME_VALID: '✅ बधाई! आपकी ई-पीक पाहणी नोंदणी सफलतापूर्वक सत्यापित हो गई है।\n\n📍 खेत: गट {{gat}} ({{village}})\n🌱 फसल: {{crop}}\n📐 क्षेत्र: {{area}}\n📅 मौसम: {{season}}\n\nनोंदणी क्रमांक: {{submissionId}}',
    SUBMISSION_OUTCOME_CROP_MISMATCH: '⚠️ फसल के फोटो में अंतर पाया गया।\n\nदर्ज की गई फसल: {{declaredCrop}}\nफोटो में पहचानी गई फसल: {{detectedCrop}}\n\nआपकी नोंद रद्द नहीं हुई है — यह तलाठी की जाँच (REVIEW) के लिए भेजी गई है। कृपया दोबारा दर्ज न करें।',
    SUBMISSION_OUTCOME_NEAR_BOUNDARY: 'ℹ️ आपकी लोकेशन खेत की सीमा के पास (मेड़ पर) पाई गई है।\n\nयह नोंद तलाठी की नियमित जाँच (REVIEW) के लिए भेजी गई है।',
    OUT_OF_BOUNDS_DISTANCE_NOTICE: 'आप अपने पंजीकृत खेत की सीमा से लगभग {{distance}} दूर हैं।\n\nअपने खेत में खड़े होकर दोबारा दर्ज करें, या सूची से सही गट चुनें।',

    // ---- Awareness (Phase 6) ----
    AWARENESS_INTRO: 'ई-पीक पाहणी क्या है?\n\nआपके खेत में कौन सी फसल खड़ी है, इसका सरकारी रिकॉर्ड। यह रिकॉर्ड किसान को खुद दर्ज करना होता है।\n\nयह क्यों ज़रूरी है?\nअतिवृष्टि, सूखा या ओलावृष्टि पर सरकार मुआवज़ा घोषित करती है। लेकिन मुआवज़े के लिए उस मौसम में आपकी फसल का रिकॉर्ड होना ज़रूरी है। रिकॉर्ड न हो तो नुकसान होने पर भी मदद नहीं मिलती।\n\nदर्ज करने के लिए कभी भी \'Hi\' भेजें। सिर्फ दो मिनट लगते हैं।',
    DEADLINE_REMINDER: 'स्मरण: {{season}} {{year}} ई-पीक पाहणी की अंतिम तारीख {{date}} है — {{days}} दिन बाकी।\n\nइस मौसम में आपकी फसल का रिकॉर्ड हमारे पास नहीं है। रिकॉर्ड न होने पर फसल का नुकसान होने पर भी आप मुआवज़े के पात्र नहीं होंगे।\n\nअभी दर्ज करने के लिए \'Hi\' भेजें। सिर्फ दो मिनट लगते हैं।',
    CALAMITY_FLOOD: 'बाढ़',
    CALAMITY_DROUGHT: 'सूखा',
    CALAMITY_HAILSTORM: 'ओलावृष्टि',
    CALAMITY_CYCLONE: 'चक्रवात',
    CALAMITY_UNSEASONAL_RAIN: 'बेमौसम बारिश',
    CALAMITY_OTHER: 'प्राकृतिक आपदा',
    CALAMITY_RELIEF_MATCH: 'आपके पंजीकृत खेत के लिए आपदा घोषित की गई है।\n\nआपदा: {{calamity}}\nखेत: गट {{gat}}\nघोषणा दिनांक: {{declaredDate}}\n\n{{date}} की आपकी सत्यापित {{crop}} नोंद आपको मुआवज़े के लिए पात्र बना सकती है।\n\nअगला कदम: अपने गाँव के तलाठी से संपर्क करें और मुआवज़े का आकलन शुरू होने पर यह फसल रिकॉर्ड बताएं।\n\nयह संदेश स्वीकृति नहीं है। पात्रता राजस्व कार्यालय तय करता है — यह रिकॉर्ड वही सबूत है जिसकी वे जाँच करते हैं।',
    SMS_DEADLINE_REMINDER: 'ई-पीक पाहणी: {{season}} {{year}} अंतिम तारीख {{date}}. आपकी फसल का रिकॉर्ड नहीं है. रिकॉर्ड बिना मुआवज़ा नहीं मिलता. दर्ज करने के लिए WhatsApp पर Hi भेजें.',
    SMS_CALAMITY_RELIEF: 'ई-पीक पाहणी: आपके गट {{gat}} के लिए {{calamity}} घोषित. आपका सत्यापित रिकॉर्ड मुआवज़े के लिए पात्र बना सकता है. तलाठी से संपर्क करें. यह स्वीकृति नहीं है.',
    SMS_SUBMISSION_REVIEW: 'ई-पीक पाहणी: आपकी फसल नोंद मिली, पर वह अधिकारी की जाँच के लिए भेजी गई है. नोंद रद्द नहीं हुई है. दोबारा दर्ज न करें.',
    SMS_AWARENESS_INTRO: 'ई-पीक पाहणी: खेत की फसल का सरकारी रिकॉर्ड किसान को खुद दर्ज करना होता है. रिकॉर्ड बिना मुआवज़ा नहीं मिलता. दर्ज करने के लिए WhatsApp पर Hi भेजें.'
  },
  [LANGUAGES.EN]: {
    // ---- Session and language ----
    WELCOME: 'Namaskar! 🙏\n\nWelcome to Smart E-Peek Pahani.\n\n(To change language, reply मराठी or हिंदी.)',
    LANGUAGE_SWITCHED: 'Language set to English.',
    ERROR: 'Something went wrong. Please try again.',
    INVALID_CHOICE: 'Invalid selection. Please reply with one of the numbers listed.',
    UNREGISTERED_FARMER: 'Your WhatsApp number is not registered. Please complete farmer registration before submitting your crop details.',
    MISSING_GAT: 'Your farmer profile is not linked to a Gat. Please complete your profile registration.',

    // ---- Farm selection ----
    GAT_LABEL: 'Gat {{gat}} — {{village}}',
    ASK_GAT_SELECTION: 'Please select which field you want to report:',
    INVALID_GAT_SELECTION: 'Invalid selection. Please reply with a valid number:',
    ASK_VILLAGE_SELECTION: 'Please select your village (or type the village name directly):',
    INVALID_VILLAGE_SELECTION: 'Invalid village or selection. Please choose a number or type the village name:',
    MANY_GATS_HINT: 'Showing the first {{shown}} of {{total}} fields. You can also type your Gat number directly.',

    // ---- Farm action hub ----
    ASK_ACTION: 'Gat {{gat}} — {{village}}\n\nWhat would you like to do?',
    ACTION_REGISTER_CROP: 'Register a new crop',
    ACTION_VIEW_HISTORY: 'View this field\'s records',
    ACTION_REGISTER_PLANTING: 'Record trees on the field boundary',
    ACTION_OTHER: 'Other records',
    NOT_IMPLEMENTED: 'The records below are part of E-Peek Pahani but are not built in this version yet:\n\n{{list}}\n\nFor now you can register a crop and record boundary trees.',
    ACTION_REGISTER_ROAD: 'Farm road / cart track',
    ACTION_REGISTER_STRUCTURE: 'Well, farm pond or other structure',
    ACTION_DECLARE_FALLOW: 'Fallow land declaration',

    // ---- Submission history ----
    HISTORY_HEADER: 'Gat {{gat}} — crop record history',
    HISTORY_EMPTY: 'No crop records for Gat {{gat}} yet.\n\nSend \'Hi\' to file one.',
    HISTORY_FOOTER: 'Send \'Hi\' to file a new record.',
    STATUS_DRAFT: 'Incomplete',
    STATUS_PENDING_VALIDATION: 'Validation in progress',
    STATUS_VALID: 'Validated',
    STATUS_REVIEW: 'Sent to an officer for review',
    STATUS_INVALID: 'Not accepted',
    STATUS_SYNC_PENDING: 'Waiting to sync',
    STATUS_SYNCED: 'Synced',

    // ---- Survey form ----
    ASK_SEASON: 'Which season are you filing for?',
    SEASON_KHARIF: 'Kharif',
    SEASON_RABI: 'Rabi',
    SEASON_SUMMER: 'Summer',
    ASK_PEEK_TYPE: 'Is this area under a single crop or mixed cropping?',
    PEEK_SINGLE: 'Single crop',
    PEEK_MIXED: 'Mixed crop',
    ASK_AREA: 'How much area is under this crop?\n\nYou can use hectares, acres or gunthe.\n\nExample:\n0.6\n1 acre\n20 gunthe',
    AREA_TOTAL_CONTEXT: 'Registered area of Gat {{gat}}: {{total}}',
    AREA_ALREADY_USED: 'Already recorded on this Gat this season: {{used}}\nRemaining: {{remaining}}',
    AREA_NO_NUMBER: 'We could not read that area. Please reply with a number.\n\nExample:\n0.6\n1 acre\n20 gunthe',
    AREA_NOT_POSITIVE: 'The area has to be greater than zero. Please reply again.',
    AREA_UNKNOWN_UNIT: 'We did not recognise that unit. Please use hectare, are, acre or guntha.\n\nExample:\n1 acre\n20 gunthe',
    AREA_ACCEPTED: 'Area recorded: {{area}}',
    ASK_WATER_SOURCE: 'What is the water source?',
    WATER_WELL: 'Well / borewell',
    WATER_RIVER: 'River / canal',
    WATER_DRIP: 'Drip irrigation (ठिबक सिंचन)',
    WATER_OTHER: 'Other',
    WATER_OTHER_HINT: 'If it is none of these, reply \'other\'.',
    ASK_WATER_OTHER: 'Please describe the water source briefly.',
    ASK_CROP_CATEGORY: 'Pick the crop class:',
    CROP_CLASS_CEREAL: 'Cereal',
    CROP_CLASS_PULSE: 'Pulse',
    CROP_CLASS_OILSEED: 'Oilseed',
    CROP_CLASS_CASH: 'Cash crop',
    CROP_CLASS_SPICE: 'Spice',
    CROP_CLASS_VEGETABLE: 'Vegetable',
    CROP_CLASS_FRUIT: 'Fruit',
    CROP_CLASS_FODDER: 'Fodder',
    ASK_CROP: 'Please tell us your crop.\n\nYou can type it or send a voice message.\n\nExample:\nCotton\nSoybean\nSugarcane',
    CROP_EXAMPLES: 'Example: {{examples}}',
    MULTIPLE_CROPS: 'Multiple crops detected. Please declare only one crop.',
    CROP_PICK_ONE: 'Which crop do you want to record?',
    CROP_CONFIRM: 'Did you mean this crop?',
    CROP_CONFIRM_NONE: 'None of these — let me retype',
    UNSUPPORTED_CROP: 'We did not recognize that crop. Please tell us the crop you planted.\n\nCereals, pulses, oilseeds, cash crops, spices, vegetables, fruit and fodder crops can all be recorded.\n\nExample:\nCotton\nSoybean\nSugarcane',
    VOICE_UNCLEAR: 'We could not make out the crop name from your voice message.\n\nPlease type the crop name instead.\n\nExample:\nCotton\nSoybean',
    VOICE_FAILED: 'We could not process your voice message just now — that is a problem on our side.\n\nPlease type the crop name instead.\n\nExample:\nCotton\nSoybean',
    ASK_SOWING_DATE: 'What was the sowing date?\n\nExample:\n12/06/2026\n12 June\ntoday',
    SOWING_DATE_UNPARSEABLE: 'We could not read that date. Please reply as day/month/year.\n\nExample:\n12/06/2026\n12 June\ntoday',
    SOWING_DATE_FUTURE: 'A sowing date cannot be in the future. Please reply with the actual sowing date.',
    SOWING_DATE_TOO_OLD: 'That date looks too far back. Please check the sowing date for this season and reply again.',

    // ---- Photo and location ----
    ASK_LOCATION: 'Please share your field location on WhatsApp.',
    ASK_IMAGE: 'Please send a clear photo of your crop.',
    READY: 'Information gathered. Validation in progress...',

    // ---- Tree / boundary planting ----
    ASK_PLANTING_TYPE: 'What kind of trees are planted on the field boundary?\n\nExample:\nTeak\nMango\nBamboo',
    ASK_PLANTING_LOCATION: 'Which side of the field are they on? Share a location or describe it briefly.\n\nExample:\nEastern bund\nAlong the road',
    PLANTING_SAVED: 'Planting recorded.\n\nType: {{treeType}}\nLocation: {{location}}',
    PLANTING_INFO_ONLY: 'This record is informational only. It is not part of crop validation and is not validated.',

    // ---- Submission outcomes ----
    SUBMISSION_OUTCOME_VALID: '✅ Congratulations! Your E-Peek Pahani crop filing has been verified successfully.\n\n📍 Field: Gat {{gat}} ({{village}})\n🌱 Crop: {{crop}}\n📐 Area: {{area}}\n📅 Season: {{season}}\n\nFiling ID: {{submissionId}}',
    SUBMISSION_OUTCOME_CROP_MISMATCH: '⚠️ Crop photo discrepancy detected.\n\nDeclared crop: {{declaredCrop}}\nAI detected crop: {{detectedCrop}}\n\nYour filing has not been rejected — it has been forwarded to the talathi for review (REVIEW). Please do not file again.',
    SUBMISSION_OUTCOME_NEAR_BOUNDARY: 'ℹ️ Your GPS location is right on the field boundary ({{distance}}).\n\nThis filing has been sent for routine officer review (REVIEW).',
    OUT_OF_BOUNDS_DISTANCE_NOTICE: 'You are approximately {{distance}} away from your registered field boundary.\n\nPlease file again while standing in your field, or select the correct Gat from the list.',

    // ---- Awareness (Phase 6) ----
    AWARENESS_INTRO: 'What is E-Peek Pahani?\n\nIt is the government record of which crop is standing in your field. The record has to be filed by you, the farmer.\n\nWhy it matters:\nWhen heavy rain, drought or hailstorm is declared a calamity, the state announces compensation — but relief is assessed against the crop record filed for that season. With no record, help does not reach you even when the loss is real.\n\nSend \'Hi\' whenever you are ready to file. It takes about two minutes.',
    DEADLINE_REMINDER: 'Reminder: {{season}} {{year}} E-Peek Pahani closes on {{date}} — {{days}} day(s) left.\n\nWe do not see a crop record on file for you this season. Without one you will not be eligible for calamity relief for this season, even if your crop is damaged.\n\nSend \'Hi\' to file now. It takes about two minutes.',
    CALAMITY_FLOOD: 'Flood',
    CALAMITY_DROUGHT: 'Drought',
    CALAMITY_HAILSTORM: 'Hailstorm',
    CALAMITY_CYCLONE: 'Cyclone',
    CALAMITY_UNSEASONAL_RAIN: 'Unseasonal rain',
    CALAMITY_OTHER: 'Natural calamity',
    CALAMITY_RELIEF_MATCH: 'A calamity has been declared covering your registered field.\n\nCalamity: {{calamity}}\nField: Gat {{gat}}\nDeclared on: {{declaredDate}}\n\nYour verified {{crop}} submission from {{date}} may qualify you for relief.\n\nNext steps: contact your village talathi and quote this crop record when the relief assessment for your village opens.\n\nThis message is not an approval. Eligibility is decided by the revenue office — this record is the evidence they assess.',
    SMS_DEADLINE_REMINDER: 'E-Peek Pahani: {{season}} {{year}} closes {{date}}. No crop record on file. Without one, calamity relief cannot be claimed. Send Hi on WhatsApp to file.',
    SMS_CALAMITY_RELIEF: 'E-Peek Pahani: {{calamity}} declared for your Gat {{gat}}. Your verified crop record may qualify you for relief. Contact your talathi. Not an approval.',
    SMS_SUBMISSION_REVIEW: 'E-Peek Pahani: your crop record was received but sent to an officer for review. It has not been rejected. Please do not file it again.',
    SMS_AWARENESS_INTRO: 'E-Peek Pahani: the government crop record for your field has to be filed by you. Without it, calamity relief cannot be claimed. Send Hi on WhatsApp to file.'
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
 *
 * Defaults to Marathi, and falls back to Marathi for a key a translation is
 * missing: the users are Marathi-first, so an untranslated string should surface
 * in the language they read rather than in English. Pass `vars` to fill
 * {{token}} placeholders (used by awareness reminders).
 */
function getMessage(key, language = LANGUAGES.MR, vars = null) {
  const langDict = DICTIONARY[language] || DICTIONARY[LANGUAGES.MR];
  const template = langDict[key] || DICTIONARY[LANGUAGES.MR][key] || 'Message not found.';
  return interpolate(template, vars);
}

module.exports = {
  getMessage,
  DICTIONARY
};
