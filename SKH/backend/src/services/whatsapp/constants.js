const MESSAGE_TYPES = {
  TEXT: 'TEXT',
  LOCATION: 'LOCATION',
  IMAGE: 'IMAGE',
  VOICE: 'VOICE',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Every state the WhatsApp conversation can sit in.
 *
 * The survey states run in the order the E-Peek Pahani form asks for them —
 * season, peek type, area, water source, crop class, crop name, sowing date —
 * and only then hand over to the location and photo steps that existed before.
 *
 * LANGUAGE_SELECTION is retained but no longer reachable. Marathi is the default
 * and a farmer switches language with a keyword instead of answering a menu, so
 * nothing routes here any more; the value stays because sessions live for 24
 * hours and one stored mid-upgrade would otherwise fail to save against the
 * WhatsAppSession enum. The flow treats it as a restart.
 */
const STATES = {
  START: 'START',
  LANGUAGE_SELECTION: 'LANGUAGE_SELECTION',
  WAITING_FOR_DIVISION_SELECTION: 'WAITING_FOR_DIVISION_SELECTION',
  WAITING_FOR_DISTRICT_SELECTION: 'WAITING_FOR_DISTRICT_SELECTION',
  WAITING_FOR_TALUKA_SELECTION: 'WAITING_FOR_TALUKA_SELECTION',
  WAITING_FOR_VILLAGE_SELECTION: 'WAITING_FOR_VILLAGE_SELECTION',
  WAITING_FOR_GAT_SELECTION: 'WAITING_FOR_GAT_SELECTION',
  WAITING_FOR_ACTION: 'WAITING_FOR_ACTION',
  WAITING_FOR_SEASON: 'WAITING_FOR_SEASON',
  WAITING_FOR_PEEK_TYPE: 'WAITING_FOR_PEEK_TYPE',
  WAITING_FOR_AREA: 'WAITING_FOR_AREA',
  WAITING_FOR_WATER_SOURCE: 'WAITING_FOR_WATER_SOURCE',
  WAITING_FOR_WATER_OTHER: 'WAITING_FOR_WATER_OTHER',
  WAITING_FOR_CROP_CATEGORY: 'WAITING_FOR_CROP_CATEGORY',
  WAITING_FOR_CROP: 'WAITING_FOR_CROP',
  WAITING_FOR_CROP_CONFIRMATION: 'WAITING_FOR_CROP_CONFIRMATION',
  WAITING_FOR_SOWING_DATE: 'WAITING_FOR_SOWING_DATE',
  WAITING_FOR_LOCATION: 'WAITING_FOR_LOCATION',
  WAITING_FOR_IMAGE: 'WAITING_FOR_IMAGE',
  WAITING_FOR_PLANTING_TYPE: 'WAITING_FOR_PLANTING_TYPE',
  WAITING_FOR_PLANTING_LOCATION: 'WAITING_FOR_PLANTING_LOCATION',
  READY_FOR_VALIDATION: 'READY_FOR_VALIDATION',
  VALIDATING: 'VALIDATING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

const LANGUAGES = {
  MR: 'mr',
  HI: 'hi',
  EN: 'en'
};

/**
 * Words that switch the bot's language, and the language each switches to.
 *
 * This replaces the language menu. Marathi is the default for every new and
 * unknown farmer, so the only farmers who need to say anything are the minority
 * who want something else — and they say it once, in their own words, at whatever
 * point in the conversation they notice.
 *
 * Matched on the whole message, not on a substring: a farmer who types a crop
 * name that happens to contain "hi" is naming a crop.
 */
const LANGUAGE_KEYWORDS = {
  मराठी: LANGUAGES.MR,
  marathi: LANGUAGES.MR,
  मराठि: LANGUAGES.MR,
  हिंदी: LANGUAGES.HI,
  हिन्दी: LANGUAGES.HI,
  hindi: LANGUAGES.HI,
  english: LANGUAGES.EN,
  इंग्रजी: LANGUAGES.EN,
  इंग्लिश: LANGUAGES.EN,
  अंग्रेजी: LANGUAGES.EN,
};

// Words that take a farmer back to their farm list from wherever they are.
const RESTART_KEYWORDS = ['hi', 'hello', 'start', 'नमस्कार', 'नमस्ते', 'सुरू'];

module.exports = {
  MESSAGE_TYPES,
  STATES,
  LANGUAGES,
  LANGUAGE_KEYWORDS,
  RESTART_KEYWORDS
};
