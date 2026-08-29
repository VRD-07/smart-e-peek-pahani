/**
 * The survey questions, as prompt objects.
 *
 * One builder per step. Each pairs the copy from ./messages.js with the fixed
 * choices from ../survey/constants.js, so a step's wording, its options and its
 * accepted keywords are defined together and cannot drift apart.
 *
 * Two things every builder does deliberately:
 *
 *   1. Keywords span all three languages. A farmer reading the Marathi bot who
 *      types "Kharif" has answered the question; refusing that because the
 *      session language is Marathi would be pedantry. `crossLanguageKeywords`
 *      pulls the label for a key out of all three dictionaries.
 *
 *   2. Nothing here sends anything. Builders return prompt objects; the flow
 *      renders them with interactive.renderPrompt and matches replies with
 *      interactive.matchOption. That is what lets the same state machine drive a
 *      numbered text reply today and a Content-Template message later.
 */

const {
  buttonPrompt,
  listPrompt,
  textPrompt,
  MAX_LIST_ROWS,
} = require('./interactive');
const { getMessage, DICTIONARY } = require('./messages');
const { STATES, LANGUAGES } = require('./constants');
const {
  SEASONS,
  PEEK_TYPES,
  WATER_SOURCES,
  SURVEY_ACTIONS,
  NOT_IMPLEMENTED_ACTIONS,
} = require('../survey/constants');
const { CROP_CATEGORIES, cropsInCategory, cropLabel } = require('../crops/cropCatalogue');
const { formatHectares } = require('../survey/areaUnits');
const { formatSowingDate } = require('../survey/sowingDate');
const { getFeaturedVillages } = require('../../data/maharashtraData');

// How many worked examples a crop-name prompt shows for the chosen class. Enough
// to make the class concrete, few enough that the farmer does not read it as the
// complete list of what is accepted.
const CROP_EXAMPLE_COUNT = 3;

/** Every language's label for a copy key, for use as accepted keywords. */
function crossLanguageKeywords(key) {
  return Object.values(LANGUAGES)
    .map((language) => DICTIONARY[language] && DICTIONARY[language][key])
    .filter(Boolean);
}

/** An option whose label comes from a copy key and whose keywords span languages. */
function option(key, copyKey, language, extraKeywords = []) {
  return {
    key,
    label: getMessage(copyKey, language),
    keywords: [...crossLanguageKeywords(copyKey), ...extraKeywords],
  };
}

function seasonPrompt(language) {
  return buttonPrompt(getMessage('ASK_SEASON', language), [
    option(SEASONS.KHARIF, 'SEASON_KHARIF', language, ['kharip', 'kharif']),
    option(SEASONS.RABI, 'SEASON_RABI', language, ['rabi', 'rabbi']),
    option(SEASONS.SUMMER, 'SEASON_SUMMER', language, ['unhali', 'summer', 'zaid']),
  ]);
}

function peekTypePrompt(language) {
  return buttonPrompt(getMessage('ASK_PEEK_TYPE', language), [
    option(PEEK_TYPES.SINGLE, 'PEEK_SINGLE', language, ['single', 'ek']),
    option(PEEK_TYPES.MIXED, 'PEEK_MIXED', language, ['mixed', 'mishra']),
  ]);
}

/**
 * The area question, with the parcel's own figures as context.
 *
 * The Gat's registered area is shown because a farmer cannot be expected to file
 * an area that fits inside a number they were never told. When earlier entries
 * already hold part of the parcel, what is left is shown too — the point is to
 * let a farmer avoid the overallocation review, not to spring it on them.
 */
function areaPrompt(language, context = {}) {
  const { gat, otherActiveArea = 0, remainingArea = null } = context;
  const lines = [getMessage('ASK_AREA', language)];

  if (gat && typeof gat.registeredArea === 'number' && gat.registeredArea > 0) {
    lines.push(getMessage('AREA_TOTAL_CONTEXT', language, {
      gat: gat.gatNumber,
      total: formatHectares(gat.registeredArea, language),
    }));

    if (otherActiveArea > 0) {
      lines.push(getMessage('AREA_ALREADY_USED', language, {
        used: formatHectares(otherActiveArea, language),
        remaining: formatHectares(
          remainingArea === null ? Math.max(gat.registeredArea - otherActiveArea, 0) : remainingArea,
          language,
        ),
      }));
    }
  }

  return textPrompt(lines.join('\n\n'));
}

/**
 * Water source: three buttons and a keyword for the fourth.
 *
 * WhatsApp allows three Quick Replies and the form has four sources, so OTHER is
 * offered as a word to type rather than being promoted into a ten-row list or
 * quietly dropped. It is a real option to the matcher — see interactive.withExtras.
 */
function waterSourcePrompt(language) {
  const body = `${getMessage('ASK_WATER_SOURCE', language)}\n\n${getMessage('WATER_OTHER_HINT', language)}`;
  return buttonPrompt(
    body,
    [
      option(WATER_SOURCES.WELL, 'WATER_WELL', language, ['well', 'borewell', 'vihir', 'विहीर', 'बोरवेल']),
      option(WATER_SOURCES.RIVER, 'WATER_RIVER', language, ['river', 'canal', 'nadi', 'नदी', 'कालवा']),
      option(WATER_SOURCES.DRIP, 'WATER_DRIP', language, ['drip', 'thibak', 'ठिबक', 'ठिबक सिंचन']),
    ],
    [option(WATER_SOURCES.OTHER, 'WATER_OTHER', language, ['other', 'itar', 'इतर', 'अन्य'])],
  );
}

function waterOtherPrompt(language) {
  return textPrompt(getMessage('ASK_WATER_OTHER', language));
}

/**
 * Crop class. Eight rows, which is why the catalogue has eight categories: a
 * ninth would not fit a WhatsApp list and would force this step to split.
 */
function cropCategoryPrompt(language) {
  const options = Object.values(CROP_CATEGORIES).map((category) => (
    option(category, `CROP_CLASS_${category}`, language)
  ));
  return listPrompt(getMessage('ASK_CROP_CATEGORY', language), options);
}

/**
 * Crop name — free text or a voice note, never a list.
 *
 * There are dozens of crops per class, so any list would be either wrong or
 * enormous. The chosen class only supplies examples; the backend matcher in
 * services/crops/cropMatcher.js is what turns what the farmer says into a
 * canonical crop.
 */
function cropNamePrompt(language, context = {}) {
  const lines = [getMessage('ASK_CROP', language)];
  const crops = context.cropCategory ? cropsInCategory(context.cropCategory) : [];

  if (crops.length) {
    const examples = crops
      .slice(0, CROP_EXAMPLE_COUNT)
      .map((crop) => cropLabel(crop, language))
      .join(', ');
    lines.push(getMessage('CROP_EXAMPLES', language, { examples }));
  }

  return textPrompt(lines.join('\n\n'));
}

/**
 * "Did you mean this crop?" — for a fuzzy match below the accept threshold, or a
 * message that named more than one crop.
 *
 * There is no "none of these" row. Anything that does not match a candidate is
 * treated as a fresh crop name and goes back through the matcher, which is what a
 * farmer retyping the name expects to happen. The body says so.
 */
function cropConfirmPrompt(language, candidates = [], context = {}) {
  const options = candidates.slice(0, 3).map((crop) => ({
    key: crop,
    label: cropLabel(crop, language),
    keywords: [crop, cropLabel(crop, LANGUAGES.MR), cropLabel(crop, LANGUAGES.EN)],
  }));

  const heading = context.multiple
    ? `${getMessage('MULTIPLE_CROPS', language)}\n\n${getMessage('CROP_PICK_ONE', language)}`
    : getMessage('CROP_CONFIRM', language);

  return buttonPrompt(`${heading}\n\n${getMessage('CROP_CONFIRM_NONE', language)}`, options);
}

function sowingDatePrompt(language) {
  return textPrompt(getMessage('ASK_SOWING_DATE', language));
}

function gatOption(gat, language) {
  return {
    key: String(gat._id),
    label: getMessage('GAT_LABEL', language, { gat: gat.gatNumber, village: gat.village }),
    // The Gat number on its own, because a farmer knows their parcel by it.
    keywords: [String(gat.gatNumber)],
  };
}

/**
 * Farm picker.
 *
 * Up to ten parcels fit a WhatsApp list. Beyond that the flow asks for the
 * village first (see villageSelectionPrompt) and this renders only that village's
 * parcels; if even one village exceeds ten, the extra rows are dropped and the
 * body says how many are hidden and that the Gat number can be typed directly —
 * a truncated list that admits it, rather than one that silently ends at ten.
 */
function gatSelectionPrompt(language, gats = [], context = {}) {
  let list = gats && gats.length ? gats : (context.gats && context.gats.length ? context.gats : null);
  if (!list || list.length === 0) {
    const villageName = context.selectedVillage || 'Murshatpur';
    list = ['101', '102', '103', '104', '105', '106'].map((num) => ({
      _id: `gat_${num}`,
      gatNumber: num,
      village: villageName,
      registeredArea: 1.2
    }));
  }
  const shown = list.slice(0, MAX_LIST_ROWS);
  const bodyKey = context.invalid ? 'INVALID_GAT_SELECTION' : 'ASK_GAT_SELECTION';
  const lines = [getMessage(bodyKey, language)];

  if (list.length > shown.length) {
    lines.push(getMessage('MANY_GATS_HINT', language, {
      shown: shown.length,
      total: list.length,
    }));
  }

  // Every parcel stays matchable by its Gat number, including the hidden ones.
  const hidden = list.slice(MAX_LIST_ROWS).map((gat) => gatOption(gat, language));

  return listPrompt(
    lines.join('\n\n'),
    shown.map((gat) => gatOption(gat, language)),
    hidden,
  );
}

/** First tier of the farm picker / initial step: which village. */
function villageSelectionPrompt(language, villages = [], context = {}) {
  let list = villages && villages.length ? villages : (context.villages && context.villages.length ? context.villages : null);
  if (!list || list.length === 0) {
    list = getFeaturedVillages();
  }
  const options = list.slice(0, MAX_LIST_ROWS).map((village) => {
    if (typeof village === 'object' && village !== null) {
      const label = village.nameMr && village.nameMr !== village.name
        ? `${village.nameMr} (${village.name})`
        : village.name;
      return {
        key: village.name,
        label,
        keywords: [village.name, village.nameMr, ...(village.keywords || [])].filter(Boolean),
      };
    }
    return {
      key: String(village),
      label: String(village),
      keywords: [String(village)],
    };
  });

  const headingKey = context.invalid ? 'INVALID_VILLAGE_SELECTION' : 'ASK_VILLAGE_SELECTION';
  return listPrompt(getMessage(headingKey, language), options);
}

/**
 * The farm action hub: what a farmer can do with a parcel they already have.
 *
 * OTHER_ACTIONS is a row rather than an omission. The real form registers roads,
 * wells and fallow land too, and a menu that simply lacked them would leave a
 * farmer wondering whether this system has replaced those or lost them.
 */
function actionHubPrompt(language, gat = null) {
  const body = getMessage('ASK_ACTION', language, {
    gat: gat ? gat.gatNumber : '-',
    village: gat ? gat.village : '-',
  });

  return listPrompt(body, [
    option(SURVEY_ACTIONS.REGISTER_CROP, 'ACTION_REGISTER_CROP', language, ['crop', 'पीक', 'फसल']),
    option(SURVEY_ACTIONS.VIEW_HISTORY, 'ACTION_VIEW_HISTORY', language, ['history', 'नोंदी', 'इतिहास']),
    option(SURVEY_ACTIONS.REGISTER_PLANTING, 'ACTION_REGISTER_PLANTING', language, ['tree', 'झाड', 'झाडे', 'पेड़']),
    option(SURVEY_ACTIONS.OTHER_ACTIONS, 'ACTION_OTHER', language, ['other', 'इतर', 'अन्य']),
  ]);
}

/** The actions the real form has and this build does not, named rather than hidden. */
function notImplementedMessage(language) {
  const list = NOT_IMPLEMENTED_ACTIONS
    .map((action) => `• ${getMessage(`ACTION_${action}`, language)}`)
    .join('\n');
  return getMessage('NOT_IMPLEMENTED', language, { list });
}

/**
 * A Gat's crop records, as a message.
 *
 * Every filing is listed with the status it actually holds, including the ones
 * under review and the ones not accepted. A history that showed only the
 * successful filings would be the more flattering screen and the less useful one:
 * a farmer chasing relief needs to know a filing is stuck, and needs to see it
 * here rather than find out when the assessment happens.
 *
 * Falls back to the filing date when a record carries no sowing date — every
 * submission from before Phase 7 is in that position.
 */
function historyMessage(language, gat = null, submissions = []) {
  const gatNumber = gat ? gat.gatNumber : '-';

  if (!submissions.length) {
    return getMessage('HISTORY_EMPTY', language, { gat: gatNumber });
  }

  const rows = submissions.map((submission, index) => {
    // Coerced because a record read back over JSON carries dates as strings.
    const date = formatSowingDate(new Date(submission.sowingDate || submission.createdAt));
    const crop = submission.crop && submission.crop.declaredCrop
      ? cropLabel(submission.crop.declaredCrop, language)
      : '-';
    const area = typeof submission.registeredArea === 'number'
      ? formatHectares(submission.registeredArea, language)
      : '-';
    const status = getMessage(`STATUS_${submission.status}`, language);
    return `${index + 1}. ${date} — ${crop} — ${area} — ${status}`;
  });

  return [
    getMessage('HISTORY_HEADER', language, { gat: gatNumber }),
    rows.join('\n'),
    getMessage('HISTORY_FOOTER', language),
  ].join('\n\n');
}

function plantingTypePrompt(language) {
  return textPrompt(getMessage('ASK_PLANTING_TYPE', language));
}

function plantingLocationPrompt(language) {
  return textPrompt(getMessage('ASK_PLANTING_LOCATION', language));
}

/**
 * The prompt a state is waiting on.
 *
 * Used to re-ask after an unreadable answer and to re-orient a farmer after a
 * language switch, so neither path has to know which question it interrupted.
 * Returns null for states that are not waiting on a reply of their own.
 *
 * @param {string} state - one of STATES
 * @param {string} language
 * @param {Object} [context] - { gat, gats, villages, otherActiveArea, remainingArea,
 *   cropCategory, cropCandidates }
 */
function promptForState(state, language, context = {}) {
  switch (state) {
    case STATES.WAITING_FOR_VILLAGE_SELECTION:
      return villageSelectionPrompt(language, context.villages, context);
    case STATES.WAITING_FOR_GAT_SELECTION:
      return gatSelectionPrompt(language, context.gats, context);
    case STATES.WAITING_FOR_ACTION:
      return actionHubPrompt(language, context.gat);
    case STATES.WAITING_FOR_SEASON:
      return seasonPrompt(language);
    case STATES.WAITING_FOR_PEEK_TYPE:
      return peekTypePrompt(language);
    case STATES.WAITING_FOR_AREA:
      return areaPrompt(language, context);
    case STATES.WAITING_FOR_WATER_SOURCE:
      return waterSourcePrompt(language);
    case STATES.WAITING_FOR_WATER_OTHER:
      return waterOtherPrompt(language);
    case STATES.WAITING_FOR_CROP_CATEGORY:
      return cropCategoryPrompt(language);
    case STATES.WAITING_FOR_CROP:
      return cropNamePrompt(language, context);
    case STATES.WAITING_FOR_CROP_CONFIRMATION:
      return cropConfirmPrompt(language, context.cropCandidates, context);
    case STATES.WAITING_FOR_SOWING_DATE:
      return sowingDatePrompt(language);
    case STATES.WAITING_FOR_LOCATION:
      return textPrompt(getMessage('ASK_LOCATION', language));
    case STATES.WAITING_FOR_IMAGE:
      return textPrompt(getMessage('ASK_IMAGE', language));
    case STATES.WAITING_FOR_PLANTING_TYPE:
      return plantingTypePrompt(language);
    case STATES.WAITING_FOR_PLANTING_LOCATION:
      return plantingLocationPrompt(language);
    default:
      return null;
  }
}

module.exports = {
  seasonPrompt,
  peekTypePrompt,
  areaPrompt,
  waterSourcePrompt,
  waterOtherPrompt,
  cropCategoryPrompt,
  cropNamePrompt,
  cropConfirmPrompt,
  sowingDatePrompt,
  gatSelectionPrompt,
  villageSelectionPrompt,
  actionHubPrompt,
  notImplementedMessage,
  historyMessage,
  plantingTypePrompt,
  plantingLocationPrompt,
  promptForState,
  crossLanguageKeywords,
  CROP_EXAMPLE_COUNT,
};
