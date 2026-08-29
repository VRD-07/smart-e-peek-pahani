const CalamityZone = require('../../models/CalamityZone');
const SchemeDeadline = require('../../models/SchemeDeadline');

/**
 * Normalizes strings for flexible matching.
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Keep letters and numbers across scripts
    .replace(/\s+/g, ' ');
}

// Synonyms map across English and Marathi
const SYNONYMS = {
  kharif: ['kharif', 'खरीप', 'kharip'],
  rabi: ['rabi', 'रब्बी', 'rabi'],
  summer: ['summer', 'उन्हाळी', 'unhali'],
  flood: ['flood', 'पूर', 'अतिवृष्टी', 'ativrushti', 'excess rainfall', 'heavy rain', 'पाऊस'],
  excess_rainfall: ['excess rainfall', 'अतिवृष्टी', 'ativrushti', 'flood', 'पूर', 'heavy rain', 'पाऊस'],
  drought: ['drought', 'दुष्काळ', 'dushkal', 'korda dushkal'],
  unseasonal_rain: ['unseasonal rain', 'अवकाळी पाऊस', 'avkali paous', 'avkali'],
  hailstorm: ['hailstorm', 'गारपीट', 'garpit', 'gara'],
  pest_attack: ['pest attack', 'कीड रोग', 'kid rog', 'ali'],
  cyclone: ['cyclone', 'चक्रीवादळ', 'chakrivadal'],
};

/**
 * Checks if incoming text looks like a scheme or calamity verification query.
 */
function isVerificationQuery(text) {
  if (!text || typeof text !== 'string') return { isQuery: false };

  const raw = text.trim();
  const lower = raw.toLowerCase();

  // English patterns
  const enMatch = lower.match(/^(?:verify|check|is|status of|check status of|check scheme|verify scheme|check calamity|is it real|is scheme)\s+(.+)$/i) ||
                  lower.match(/(.+)\s+(?:is real|is active|is real or fake|status|real\?|fake\?)$/i);

  // Marathi patterns
  const mrMatch = raw.match(/^(?:योजना तपासा|आपत्ती तपासा|तपासा|पडताळणी|सत्यता|माहिती)\s+(.+)$/i) ||
                  raw.match(/(.+)\s+(?:खरी आहे का|चालू आहे का|सत्य आहे का|तपासा|पडताळणी करा|फेक आहे का)$/i);

  if (mrMatch) {
    const query = mrMatch[1].replace(/योजना|आपत्ती|क्षेत्र|बाबतीत|बद्दल/g, '').trim();
    return { isQuery: true, query: query || raw, language: 'mr' };
  }

  if (enMatch) {
    const query = enMatch[1].replace(/\b(?:scheme|calamity|zone|real|fake|status|is)\b/gi, '').trim();
    return { isQuery: true, query: query || raw, language: 'en' };
  }

  // Keywords anywhere in short text
  if (
    lower.includes('verify ') ||
    lower.includes('check ') ||
    lower.includes('is real') ||
    raw.includes('तपासा') ||
    raw.includes('खरी आहे का') ||
    raw.includes('सत्यता')
  ) {
    const query = raw
      .replace(/verify|check|is real|तपासा|खरी आहे का|सत्यता|योजना/gi, '')
      .trim();
    return {
      isQuery: true,
      query: query || raw,
      language: /[\u0900-\u097F]/.test(raw) ? 'mr' : 'en',
    };
  }

  return { isQuery: false };
}

/**
 * Computes token overlap score between query and target string.
 */
function tokenSimilarity(query, target) {
  const qTokens = normalizeText(query).split(' ').filter(Boolean);
  const tTokens = normalizeText(target).split(' ').filter(Boolean);
  if (!qTokens.length || !tTokens.length) return 0;

  let matches = 0;
  for (const q of qTokens) {
    if (tTokens.some(t => t.includes(q) || q.includes(t))) {
      matches++;
    }
  }
  return matches / qTokens.length;
}

/**
 * Verifies a scheme or calamity zone query against official backend models.
 */
async function verifySchemeOrCalamity(queryText, language = 'mr') {
  const normQuery = normalizeText(queryText);
  if (!normQuery) {
    return {
      matched: false,
      reply: language === 'en'
        ? "⚠️ Please provide a scheme or calamity zone name to verify."
        : "⚠️ कृपया पडताळणीसाठी योजना किंवा आपत्ती क्षेत्राचे नाव प्रविष्ट करा."
    };
  }

  // 1. Check Calamity Zones
  const calamityZones = await CalamityZone.find({});
  let bestCalamity = null;
  let highestCalamityScore = 0;

  for (const zone of calamityZones) {
    const target = `${zone.name} ${zone.calamityType} ${zone.district || ''} ${zone.notes || ''}`;
    const score = tokenSimilarity(queryText, target);

    // Direct check against synonyms
    let synonymMatch = false;
    const synList = SYNONYMS[zone.calamityType?.toLowerCase()] || [];
    if (synList.some(s => normQuery.includes(normalizeText(s)))) {
      synonymMatch = true;
    }

    const finalScore = synonymMatch ? Math.max(score, 0.8) : score;
    if (finalScore > highestCalamityScore && finalScore >= 0.4) {
      highestCalamityScore = finalScore;
      bestCalamity = zone;
    }
  }

  // 2. Check Scheme Deadlines
  const schemeDeadlines = await SchemeDeadline.find({});
  let bestScheme = null;
  let highestSchemeScore = 0;

  for (const scheme of schemeDeadlines) {
    const target = `${scheme.season} ${scheme.year} ${scheme.district || ''} ${scheme.notes || ''} e-peek pahani`;
    const score = tokenSimilarity(queryText, target);

    let synonymMatch = false;
    const synList = SYNONYMS[scheme.season?.toLowerCase()] || [];
    if (synList.some(s => normQuery.includes(normalizeText(s)))) {
      synonymMatch = true;
    }

    const finalScore = synonymMatch ? Math.max(score, 0.8) : score;
    if (finalScore > highestSchemeScore && finalScore >= 0.4) {
      highestSchemeScore = finalScore;
      bestScheme = scheme;
    }
  }

  // Priority to highest confidence match
  if (bestCalamity && highestCalamityScore >= highestSchemeScore) {
    const statusText = bestCalamity.isActive ? (language === 'en' ? 'ACTIVE / CONFIRMED' : 'अधिकृत सक्रिय (Active)') : (language === 'en' ? 'INACTIVE / EXPIRED' : 'कालबाह्य (Inactive)');
    const declaredDateStr = new Date(bestCalamity.declaredDate).toLocaleDateString('mr-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const crops = bestCalamity.affectedCropTypes?.length ? bestCalamity.affectedCropTypes.join(', ') : (language === 'en' ? 'All crops in zone' : 'हद्दीतील सर्व पिके');

    if (language === 'en') {
      return {
        matched: true,
        type: 'CALAMITY_ZONE',
        record: bestCalamity,
        reply: `🏛️ *OFFICIAL GOVERNMENT RECORD VERIFIED*\n\n` +
               `📍 *Zone / Declaration:* ${bestCalamity.name}\n` +
               `⚠️ *Calamity Type:* ${bestCalamity.calamityType}\n` +
               `✅ *Status:* ${statusText}\n` +
               `📅 *Declared Date:* ${declaredDateStr}\n` +
               `🌾 *Affected Crops:* ${crops}\n` +
               `📌 *District Scope:* ${bestCalamity.district || 'All Districts'}\n\n` +
               `ℹ️ *Official Note:* ${bestCalamity.notes || 'Official administrative calamity declaration recorded in state relief system.'}`
      };
    } else {
      return {
        matched: true,
        type: 'CALAMITY_ZONE',
        record: bestCalamity,
        reply: `🏛️ *महाराष्ट्र शासन — अधिकृत पडताळणी अहवाल*\n\n` +
               `📍 *आपत्ती घोषणा:* ${bestCalamity.name}\n` +
               `⚠️ *आपत्तीचा प्रकार:* ${bestCalamity.calamityType}\n` +
               `✅ *सद्यस्थिती:* ${statusText}\n` +
               `📅 *घोषित दिनांक:* ${declaredDateStr}\n` +
               `🌾 *समाविष्ट पिके:* ${crops}\n` +
               `📌 *जिल्हा कार्यक्षेत्र:* ${bestCalamity.district || 'सर्व जिल्हे'}\n\n` +
               `ℹ️ *अधिकृत नोंद:* ${bestCalamity.notes || 'महसूल विभागाच्या आपत्ती निवारण प्रणालीत अधिकृत नोंद उपलब्ध आहे.'}`
      };
    }
  }

  if (bestScheme && highestSchemeScore >= 0.4) {
    const statusText = bestScheme.isActive ? (language === 'en' ? 'ACTIVE FILING WINDOW' : 'नोंदणी सुरू आहे (Active)') : (language === 'en' ? 'CLOSED' : 'मुदत संपली (Closed)');
    const startStr = new Date(bestScheme.seasonStart).toLocaleDateString('mr-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const deadlineStr = new Date(bestScheme.deadlineDate).toLocaleDateString('mr-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    if (language === 'en') {
      return {
        matched: true,
        type: 'SCHEME_DEADLINE',
        record: bestScheme,
        reply: `🏛️ *OFFICIAL SCHEME / DEADLINE VERIFIED*\n\n` +
               `🌱 *Scheme / Season:* E-Peek Pahani (${bestScheme.season} ${bestScheme.year})\n` +
               `✅ *Status:* ${statusText}\n` +
               `📅 *Filing Window:* ${startStr} to ${deadlineStr}\n` +
               `📌 *District Scope:* ${bestScheme.district || 'Entire Maharashtra'}\n\n` +
               `ℹ️ *Official Note:* ${bestScheme.notes || 'Official crop filing deadline authorized by Agriculture Department.'}`
      };
    } else {
      return {
        matched: true,
        type: 'SCHEME_DEADLINE',
        record: bestScheme,
        reply: `🏛️ *महाराष्ट्र शासन — अधिकृत योजना पडताळणी*\n\n` +
               `🌱 *योजना / हंगाम:* ई-पीक पाहणी (${bestScheme.season} ${bestScheme.year})\n` +
               `✅ *सद्यस्थिती:* ${statusText}\n` +
               `📅 *नोंदणी मुदत:* ${startStr} ते ${deadlineStr}\n` +
               `📌 *जिल्हा कार्यक्षेत्र:* ${bestScheme.district || 'संपूर्ण महाराष्ट्र'}\n\n` +
               `ℹ️ *अधिकृत नोंद:* ${bestScheme.notes || 'कृषी व महसूल विभागामार्फत अधिकृत पीक नोंदणी मुदत लागू आहे.'}`
      };
    }
  }

  // 3. No match found — strict negative confirmation without fabrication
  if (language === 'en') {
    return {
      matched: false,
      reply: `⚠️ *NO OFFICIAL RECORD FOUND*\n\n` +
             `The system searched official state databases for: "${queryText}".\n\n` +
             `No matching scheme deadline or calamity declaration exists on the platform. The platform has no data to confirm or deny this. Please do not rely on unverified rumors and consult your local Talathi or Agriculture Officer.`
    };
  } else {
    return {
      matched: false,
      reply: `⚠️ *अधिकृत प्रणालीत कोणतीही नोंद आढळली नाही*\n\n` +
             `प्रणालीने "${queryText}" संदर्भात अधिकृत सरकारी डेटाबेस तपासला.\n\n` +
             `या नावाची कोणतीही अधिकृत योजना मुदत किंवा आपत्ती क्षेत्र नोंद प्रणालीत उपलब्ध नाही. या माहितीची पुष्टी किंवा खंडन करण्यासाठी अधिकृत डेटा उपलब्ध नाही. कृपया अफवांवर विश्वास न ठेवता आपल्या स्थानिक तलाठी किंवा कृषी सहाय्यकांशी संपर्क साधा.`
    };
  }
}

module.exports = {
  isVerificationQuery,
  verifySchemeOrCalamity,
  normalizeText,
};
