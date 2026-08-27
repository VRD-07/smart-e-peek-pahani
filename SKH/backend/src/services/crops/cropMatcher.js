/**
 * Fuzzy matching of a free-text or speech-transcribed crop name onto the
 * catalogue in ./cropCatalogue.js.
 *
 * Crop name is the one survey field that cannot be a button or a list — there are
 * dozens of varieties and WhatsApp caps a list at ten rows — so a farmer types or
 * says it. That means accepting "सोयाबीन", "soyabean" and "sobean" as the same
 * crop, and doing it without a round trip to a model.
 *
 * The matching runs in three passes, cheapest first:
 *   1. exact  — the word is a listed alias.
 *   2. folded — the word matches an alias once script-level spelling variation is
 *               normalised away (long vs short matras, doubled Latin letters).
 *   3. fuzzy  — edit distance against every folded alias.
 *
 * Only pass 3 can be wrong, so it is deliberately fenced in: it runs only when
 * the first two found nothing, skips words shorter than four characters, skips a
 * stopword list of ordinary sentence filler, and needs a high similarity before
 * it will accept a match outright. Below that bar it returns candidates for the
 * bot to ask about rather than guessing — the brief's "only prompt for
 * clarification if no confident match above a reasonable threshold".
 */

const { CROPS, CROP_DICTIONARY } = require('./cropCatalogue');

// Accept a fuzzy match outright at or above this similarity.
const MIN_ACCEPT_SIMILARITY = 0.82;
// Below MIN_ACCEPT but at or above this, offer the crop as a candidate to confirm.
const MIN_SUGGEST_SIMILARITY = 0.62;
// Fuzzy matching needs enough characters to be meaningful. "ऊस" / "us" are real
// crop names but two characters are one edit away from far too much, so short
// words are exact-match only.
const MIN_FUZZY_LENGTH = 4;
// WhatsApp Quick Replies cap at three buttons, so a clarification prompt can
// never usefully offer more than three candidates.
const MAX_CANDIDATES = 3;

const MATCH_STATUS = {
  EMPTY: 'EMPTY',
  MATCHED: 'MATCHED',
  // One word, but not confidently enough — ask the farmer to confirm.
  NEEDS_CONFIRMATION: 'NEEDS_CONFIRMATION',
  // Several different crops named at once — this system records one crop entry
  // at a time, so the farmer has to pick.
  MULTIPLE: 'MULTIPLE',
  NO_MATCH: 'NO_MATCH',
};

const MATCH_METHOD = {
  EXACT: 'EXACT',
  FOLDED: 'FOLDED',
  FUZZY: 'FUZZY',
};

/**
 * Ordinary sentence filler, in the three languages a farmer might mix freely.
 * Without this, "माझ्या शेतात आहे" offers up a fuzzy match on आले (ginger) at a
 * similarity uncomfortably close to the accept threshold.
 */
const STOPWORDS = new Set([
  // Marathi / Hindi
  'आहे', 'आहेत', 'माझ्या', 'माझे', 'माझी', 'शेतात', 'शेती', 'शेत', 'मध्ये', 'आणि',
  'पीक', 'पिक', 'पिके', 'पेरणी', 'पेरले', 'केली', 'केले', 'लावले', 'लावली', 'लागवड',
  'हेक्टर', 'एकर', 'गुंठा', 'यावर्षी', 'नाही', 'मला', 'तसेच', 'सांगा',
  'खरीप', 'रब्बी', 'उन्हाळी', 'हंगाम',
  'मेरे', 'मेरा', 'खेत', 'बोया', 'लगाया', 'फसल', 'इस', 'साल',
  // English
  'have', 'planted', 'planting', 'sowing', 'sowed', 'sown', 'field', 'fields',
  'farm', 'this', 'that', 'crop', 'crops', 'acre', 'acres', 'hectare', 'hectares',
  'year', 'land', 'area', 'grown', 'growing', 'will', 'been', 'with', 'season',
  'kharif', 'rabi', 'summer',
]);

// Long vowel signs and independent vowels folded to their short forms, plus the
// Marathi letters most often swapped for their Hindi counterparts. Both the
// farmer's word and the alias go through this, so folding can only ever make two
// spellings of the same name meet — it never invents a match on its own.
const DEVANAGARI_FOLD = {
  'ी': 'ि', 'ू': 'ु', 'ै': 'े', 'ौ': 'ो', 'ॄ': 'ृ',
  'ई': 'इ', 'ऊ': 'उ', 'ऐ': 'ए', 'औ': 'ओ',
  'ळ': 'ल', 'ष': 'श', 'ऱ': 'र', 'ऴ': 'ल',
};

// Nukta, anusvara, chandrabindu, visarga — carried inconsistently by every
// Devanagari keyboard, and never the only difference between two crops.
const DEVANAGARI_STRIP = /[़ँंः‌‍]/g;

function foldDevanagari(text) {
  let out = text.replace(DEVANAGARI_STRIP, '');
  out = out.replace(/[ऀ-ॿ]/g, (char) => DEVANAGARI_FOLD[char] || char);
  return out;
}

function foldLatin(text) {
  return text
    .replace(/ph/g, 'f')
    .replace(/w/g, 'v')
    .replace(/z/g, 'j')
    .replace(/y/g, 'i')
    .replace(/(.)\1+/g, '$1'); // soyaa -> soya, bhendii -> bhendi
}

/**
 * Collapse a word to the form both sides of a comparison are measured in.
 * Whitespace goes too, so the two-word "bottle gourd" and "दुधी भोपळा" fold to
 * single tokens and can be compared against a two-word phrase from the farmer.
 */
function fold(text) {
  if (typeof text !== 'string') return '';
  const lower = text.toLowerCase().trim();
  const devanagari = foldDevanagari(lower);
  // Keep Devanagari and Latin letters and digits; drop punctuation and spaces.
  const stripped = devanagari.replace(/[^ऀ-ॿa-z0-9]/g, '');
  return foldLatin(stripped);
}

// folded alias -> canonical. Built once at require time.
const FOLDED_INDEX = new Map();
CROPS.forEach(({ canonical, mr, hi, aliases }) => {
  [canonical, mr, hi, ...aliases].forEach((alias) => {
    if (!alias) return;
    const key = fold(alias);
    // First writer wins, so a longer, more specific alias never gets shadowed by
    // a shorter one folding onto the same key.
    if (key && !FOLDED_INDEX.has(key)) FOLDED_INDEX.set(key, canonical);
  });
});

/**
 * Optimal string alignment distance — Levenshtein plus adjacent transposition,
 * so "soyabaen" costs one edit against "soyabean" rather than two.
 */
function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = [];
  for (let i = 0; i <= a.length; i += 1) rows.push([i, ...new Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + cost);
      }
    }
  }

  return rows[a.length][b.length];
}

function similarity(a, b) {
  const longest = Math.max(a.length, b.length);
  if (!longest) return 0;
  return 1 - editDistance(a, b) / longest;
}

/**
 * Every adjacent word-pair in the input followed by every single word, as
 * {text, words} windows over the word list.
 *
 * Pairs matter because several crop names are two words in both scripts
 * ("bottle gourd", "green gram", "नेपियर गवत"). Pairs come first, and a matched
 * window marks its word positions used, so "green gram" resolves to moong alone
 * rather than to moong *and* the gram sitting inside it. No crop in the catalogue
 * is longer than two words, so two is as wide as a window needs to be.
 */
function windows(text) {
  const words = text
    // Danda and double danda sit inside the Devanagari block, so they have to go
    // before the block-aware split below or "सोयाबीन." keeps its full stop.
    .replace(/[।॥]/g, ' ')
    .split(/[^ऀ-ॿa-zA-Z0-9]+/)
    .filter(Boolean);
  const out = [];

  for (let i = 0; i < words.length - 1; i += 1) {
    out.push({ text: `${words[i]} ${words[i + 1]}`, words: [i, i + 1] });
  }
  words.forEach((word, i) => out.push({ text: word, words: [i] }));

  return out;
}

function isStopword(phrase) {
  return phrase.split(/\s+/).every((word) => STOPWORDS.has(word.toLowerCase()));
}

/**
 * Match free text against the crop catalogue.
 *
 * @param {string} text - what the farmer typed, or the STT transcript.
 * @returns {{status: string, crop: string|null, confidence: number,
 *            method: string|null, candidates: string[], matchedText: string|null}}
 */
function matchCrop(text) {
  const empty = {
    status: MATCH_STATUS.EMPTY, crop: null, confidence: 0, method: null, candidates: [], matchedText: null,
  };
  if (typeof text !== 'string' || !text.trim()) return empty;

  const options = windows(text);

  // Passes 1 and 2: exact and folded. Both are certain enough that finding two
  // different crops means the farmer named two crops, not that we guessed twice.
  const found = new Map(); // canonical -> {confidence, method, matchedText}
  const usedWords = new Set();

  options.forEach((option) => {
    if (option.words.some((index) => usedWords.has(index))) return;

    const exact = CROP_DICTIONARY[option.text.toLowerCase().trim()];
    const folded = exact ? null : FOLDED_INDEX.get(fold(option.text));
    const crop = exact || folded;
    if (!crop) return;

    option.words.forEach((index) => usedWords.add(index));
    if (found.has(crop)) return;
    found.set(crop, {
      confidence: exact ? 1 : 0.95,
      method: exact ? MATCH_METHOD.EXACT : MATCH_METHOD.FOLDED,
      matchedText: option.text,
    });
  });

  if (found.size === 1) {
    const [crop, meta] = [...found.entries()][0];
    return { status: MATCH_STATUS.MATCHED, crop, candidates: [crop], ...meta };
  }
  if (found.size > 1) {
    return {
      status: MATCH_STATUS.MULTIPLE,
      crop: null,
      confidence: 0,
      method: null,
      candidates: [...found.keys()].slice(0, MAX_CANDIDATES),
      matchedText: null,
    };
  }

  // Pass 3: fuzzy. Best score per canonical crop, over the words worth fuzzing.
  const scores = new Map();
  options
    .map((option) => ({ text: option.text, folded: fold(option.text) }))
    .filter(({ text, folded }) => folded.length >= MIN_FUZZY_LENGTH && !isStopword(text))
    .forEach(({ text: option, folded }) => {
      FOLDED_INDEX.forEach((canonical, alias) => {
        // A length gap that large cannot be closed at the accept threshold, so
        // skip the distance computation entirely.
        if (Math.abs(alias.length - folded.length) / Math.max(alias.length, folded.length) > 1 - MIN_SUGGEST_SIMILARITY) return;
        const score = similarity(folded, alias);
        const best = scores.get(canonical);
        if (!best || score > best.confidence) {
          scores.set(canonical, { confidence: score, method: MATCH_METHOD.FUZZY, matchedText: option });
        }
      });
    });

  const ranked = [...scores.entries()]
    .map(([crop, meta]) => ({ crop, ...meta }))
    .filter((entry) => entry.confidence >= MIN_SUGGEST_SIMILARITY)
    .sort((a, b) => b.confidence - a.confidence);

  if (!ranked.length) {
    return {
      status: MATCH_STATUS.NO_MATCH, crop: null, confidence: 0, method: null, candidates: [], matchedText: null,
    };
  }

  const [top, runnerUp] = ranked;
  const tooCloseToCall = runnerUp && top.confidence - runnerUp.confidence < 0.05;

  if (top.confidence >= MIN_ACCEPT_SIMILARITY && !tooCloseToCall) {
    return {
      status: MATCH_STATUS.MATCHED,
      crop: top.crop,
      confidence: top.confidence,
      method: top.method,
      candidates: [top.crop],
      matchedText: top.matchedText,
    };
  }

  return {
    status: MATCH_STATUS.NEEDS_CONFIRMATION,
    crop: null,
    confidence: top.confidence,
    method: top.method,
    candidates: ranked.slice(0, MAX_CANDIDATES).map((entry) => entry.crop),
    matchedText: top.matchedText,
  };
}

module.exports = {
  matchCrop,
  fold,
  similarity,
  MATCH_STATUS,
  MATCH_METHOD,
  MIN_ACCEPT_SIMILARITY,
  MIN_SUGGEST_SIMILARITY,
  MAX_CANDIDATES,
  STOPWORDS,
};
