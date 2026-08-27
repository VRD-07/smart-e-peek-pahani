/**
 * The survey fields E-Peek Pahani actually asks for, and the units they come in.
 *
 * Phase 7 widened crop registration from "which crop" to the field set on the
 * real form: season, single or mixed crop, area under this crop, water source,
 * crop class and name, sowing date. These enums are shared by the WhatsApp flow,
 * the PWA form and the Submission model, so a value can only be added in one
 * place.
 */

// The three cropping seasons the state's crop calendar runs on. Matches the enum
// already on SchemeDeadline, so a submission's season lines up with the deadline
// it was filed against without a translation step.
const SEASONS = {
  KHARIF: 'KHARIF',
  RABI: 'RABI',
  SUMMER: 'SUMMER',
};

// "पीक प्रकार" — whether this parcel carries one crop or several intercropped.
const PEEK_TYPES = {
  SINGLE: 'SINGLE',
  MIXED: 'MIXED',
};

// "पाण्याचा स्रोत". WhatsApp Quick Replies cap at three buttons and there are four
// options, so the flow offers the three common ones plus a follow-up for OTHER
// rather than silently dropping one — see services/whatsapp/interactive.js.
const WATER_SOURCES = {
  WELL: 'WELL',
  RIVER: 'RIVER',
  DRIP: 'DRIP',
  OTHER: 'OTHER',
};

// What a farmer can do with a Gat they already have registered, from the farm
// action hub. REGISTER_ROAD and the rest of the real app's actions are listed as
// NOT_IMPLEMENTED_ACTIONS below rather than left out, so the menu tells a farmer
// the action exists and is not built yet instead of pretending it does not exist.
const SURVEY_ACTIONS = {
  REGISTER_CROP: 'REGISTER_CROP',
  VIEW_HISTORY: 'VIEW_HISTORY',
  REGISTER_PLANTING: 'REGISTER_PLANTING',
  OTHER_ACTIONS: 'OTHER_ACTIONS',
};

const NOT_IMPLEMENTED_ACTIONS = [
  // Road / cart-track registration on the parcel line.
  'REGISTER_ROAD',
  // Wells, farm ponds and other permanent structures.
  'REGISTER_STRUCTURE',
  // Fallow declaration for a season with no crop.
  'DECLARE_FALLOW',
];

/**
 * Area is stored in hectares.
 *
 * The 7/12 land record states area in हेक्टर-आर, so hectares is the unit the
 * authoritative document uses and the one the Gat's registered area is seeded in.
 * Farmers, though, routinely speak in एकर and गुंठे, so input accepts those and
 * converts — see ./areaUnits.js. One stored unit means the overallocation sum in
 * services/validation/areaValidator.js never adds unlike quantities.
 */
const AREA_UNIT = 'HECTARE';

// Multiply a value in the keyed unit by this to get hectares.
const AREA_UNIT_TO_HECTARE = {
  HECTARE: 1,
  ARE: 0.01,
  ACRE: 0.404686,
  GUNTHA: 0.0101171, // one-fortieth of an acre
  SQUARE_METRE: 0.0001,
};

/**
 * Which crop year a date belongs to.
 *
 * The agricultural year runs July to June, so a Rabi filing made in January 2027
 * belongs to crop year 2026 — the same year as the Kharif filing that preceded it
 * on the same parcel. Getting this wrong would split one season's entries across
 * two buckets and let the area overallocation check under-count.
 */
function cropYear(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  // Month index 5 is June; July (6) onward starts the next crop year.
  return value.getMonth() >= 6 ? value.getFullYear() : value.getFullYear() - 1;
}

/**
 * The season a date most likely falls in, used only as the default the farmer is
 * shown — the stored value is always whichever season they picked.
 *
 * Deliberately not a crop-calendar prediction: SchemeDeadline holds the real
 * season windows for filing, and those come from the Agriculture Department.
 */
function seasonForDate(date = new Date()) {
  const month = (date instanceof Date ? date : new Date(date)).getMonth();
  if (month >= 5 && month <= 9) return SEASONS.KHARIF; // June - October
  if (month >= 10 || month <= 2) return SEASONS.RABI; // November - March
  return SEASONS.SUMMER; // April - May
}

module.exports = {
  SEASONS,
  PEEK_TYPES,
  WATER_SOURCES,
  SURVEY_ACTIONS,
  NOT_IMPLEMENTED_ACTIONS,
  AREA_UNIT,
  AREA_UNIT_TO_HECTARE,
  cropYear,
  seasonForDate,
};
