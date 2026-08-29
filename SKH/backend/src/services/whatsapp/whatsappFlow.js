/**
 * The WhatsApp conversation, as a state machine.
 *
 * Phase 7 widened this from "which crop" to the field set the real E-Peek Pahani
 * form asks for, and added a farm action hub in front of it. The order below is
 * the form's order — season, peek type, area, water source, crop class, crop
 * name, sowing date — and only then the location and photo steps that already
 * existed. Everything downstream of the photo is untouched.
 *
 * ---------------------------------------------------------------------------
 * Marathi is the default, not a menu option.
 *
 * There is no language-selection step any more. A farmer who has never texted
 * before is answered in Marathi, because in Maharashtra that is the likely right
 * answer and a wrong default costs one keyword to fix — whereas a menu costs
 * every farmer a turn, every time, forever. Hindi and English are switched into
 * with a word (see LANGUAGE_KEYWORDS) at any point in the conversation, and the
 * choice is persisted onto the Farmer record via `farmerUpdates` so it is asked
 * for once and never again.
 *
 * ---------------------------------------------------------------------------
 * Still pure. Reads no database and calls no service.
 *
 * Which is why there is a fourth argument. The area prompt needs the parcel's
 * registered size and the season's running total; the history action needs the
 * Gat's filings. Those are reads, so the controller does them and passes them in
 * as `context`. Two things leave here as *requests* rather than actions:
 *
 *   - `nextState === READY_FOR_VALIDATION` — the controller creates the
 *     Submission and runs the validation engine.
 *   - `sideEffect` — a record to write that is not a submission. Currently only
 *     the boundary planting, which is informational and deliberately never goes
 *     through the validation gate.
 */

const {
  STATES,
  MESSAGE_TYPES,
  LANGUAGES,
  LANGUAGE_KEYWORDS,
  RESTART_KEYWORDS,
} = require('./constants');
const { getMessage } = require('./messages');
const { renderPrompt, matchOption, MAX_LIST_ROWS } = require('./interactive');
const {
  promptForState,
  actionHubPrompt,
  cropConfirmPrompt,
  historyMessage,
  notImplementedMessage,
} = require('./surveyPrompts');
const { WATER_SOURCES, SURVEY_ACTIONS, cropYear } = require('../survey/constants');
const { parseArea, formatHectares } = require('../survey/areaUnits');
const { parseSowingDate } = require('../survey/sowingDate');
const { cropCategory: categoryOfCrop } = require('../crops/cropCatalogue');
const {
  getDivisions,
  findDivision,
  getDistricts,
  findDistrict,
  getTalukas,
  findTaluka,
  getVillagesInTaluka,
  getFeaturedVillages,
  findVillage,
} = require('../../data/maharashtraData');

// Why a crop declaration did not land, and what to say about it. Voice and text
// share this table because the failure is about the *words*, not the channel —
// except for the two rows only speech can produce.
//
// Every row keeps the farmer at WAITING_FOR_CROP with something actionable. A
// farmer stuck at the crop step with a generic "I didn't understand" has no way
// to work out what to try next, and the flow has nowhere else to send them.
const CROP_FAILURE_MESSAGES = {
  MULTIPLE_CROPS_DETECTED: 'MULTIPLE_CROPS',
  UNSUPPORTED_CROP: 'UNSUPPORTED_CROP',
  // Close to a crop name but under the matcher's accept threshold. Only reached
  // when the matcher offered no candidates to confirm; with candidates the flow
  // asks instead of complaining.
  LOW_MATCH_CONFIDENCE: 'UNSUPPORTED_CROP',
  // Speech only. Both point at the keyboard, but they differ on whose fault it
  // was: VOICE_FAILED owns the failure, VOICE_UNCLEAR does not blame the farmer
  // for words we could not resolve.
  STT_ERROR: 'VOICE_FAILED',
  EMPTY_TRANSCRIPT: 'VOICE_UNCLEAR',
  LOW_CONFIDENCE: 'VOICE_UNCLEAR',
};

// Outcomes where the matcher has something worth showing the farmer, so the
// answer is a question rather than an error.
const CROP_CONFIRMATION_REASONS = ['LOW_MATCH_CONFIDENCE', 'MULTIPLE_CROPS_DETECTED'];

// Cleared when a farmer starts a crop entry, so a form abandoned halfway cannot
// leak its answers into the next one. Nulls rather than deletes because the
// controller applies this with Object.assign onto a Mongoose document.
const BLANK_CROP_ENTRY = {
  season: null,
  cropYear: null,
  peekType: null,
  registeredArea: null,
  waterSource: null,
  waterSourceOther: null,
  sowingDate: null,
  declaredCrop: null,
  cropCategory: null,
  declaredCropText: null,
  matchConfidence: null,
  matchMethod: null,
  pendingCropCandidates: [],
};

// Area and date parsers report why they failed; each reason has its own copy,
// because "we could not read that" and "that date is in the future" ask the
// farmer to do two completely different things.
const AREA_REASON_MESSAGES = {
  EMPTY: 'AREA_NO_NUMBER',
  NO_NUMBER: 'AREA_NO_NUMBER',
  NOT_POSITIVE: 'AREA_NOT_POSITIVE',
  UNKNOWN_UNIT: 'AREA_UNKNOWN_UNIT',
};

const SOWING_DATE_REASON_MESSAGES = {
  UNPARSEABLE: 'SOWING_DATE_UNPARSEABLE',
  IN_FUTURE: 'SOWING_DATE_FUTURE',
  TOO_OLD: 'SOWING_DATE_TOO_OLD',
};

function joinParts(...parts) {
  return parts.filter((part) => typeof part === 'string' && part.trim()).join('\n\n');
}

/**
 * Move to a state and ask its question.
 *
 * The reply is always whatever `promptForState` says that state is waiting for,
 * so a question is worded in exactly one place regardless of which transition
 * arrived at it.
 */
function advance(nextState, language, context, sessionUpdates = {}, prefix = null) {
  const prompt = promptForState(nextState, language, context);
  return {
    nextState,
    replyText: joinParts(prefix, prompt ? renderPrompt(prompt) : null),
    updatedSessionData: { ...sessionUpdates, state: nextState },
  };
}

/** Stay put and ask again, saying what was wrong with the answer. */
function reask(state, language, context, messageKey = 'INVALID_CHOICE') {
  const prompt = promptForState(state, language, context);
  return {
    nextState: state,
    replyText: joinParts(getMessage(messageKey, language), prompt ? renderPrompt(prompt) : null),
    updatedSessionData: {},
  };
}

function plainReply(state, language, messageKey) {
  return {
    nextState: state,
    replyText: getMessage(messageKey, language),
    updatedSessionData: {},
  };
}

/**
 * Initial step of the WhatsApp flow: Division (Region) Selection.
 *
 * Prompts the farmer to select their Administrative Division (Region),
 * then District -> Taluka -> Village -> Gat.
 */
function divisionSelection(language, farmer, context, prefix = null) {
  const divisions = (context && context.divisions && context.divisions.length)
    ? context.divisions
    : getDivisions();

  return advance(
    STATES.WAITING_FOR_DIVISION_SELECTION,
    language,
    { ...context, divisions },
    {
      selectedDivision: null,
      selectedDistrict: null,
      selectedTaluka: null,
      selectedVillage: null,
      selectedGatId: null,
    },
    prefix,
  );
}

function villageSelection(language, farmer, context, prefix = null) {
  return divisionSelection(language, farmer, context, prefix);
}

function farmSelection(language, farmer, context, prefix = null) {
  return divisionSelection(language, farmer, context, prefix);
}

/**
 * Record a crop the matcher resolved, ask about one it half-resolved, or explain
 * why it resolved nothing.
 *
 * The crop's own class overrides the class the farmer picked a step earlier. They
 * are two answers to the same question and the catalogue is the one that cannot
 * be wrong; storing both as given would let a submission claim सोयाबीन is a
 * cereal.
 */
function declareCrop(extraction, parsedMessage, language, context, session) {
  const rawText = parsedMessage.data.text || parsedMessage.data.transcript || null;

  if (extraction && extraction.declaredCrop) {
    return advance(STATES.WAITING_FOR_SOWING_DATE, language, context, {
      declaredCrop: extraction.declaredCrop,
      cropCategory: categoryOfCrop(extraction.declaredCrop) || session.cropCategory || null,
      declaredCropText: extraction.matchedText || rawText,
      matchConfidence: typeof extraction.matchConfidence === 'number' ? extraction.matchConfidence : null,
      matchMethod: extraction.matchMethod || null,
      pendingCropCandidates: [],
    });
  }

  const candidates = (extraction && extraction.candidates) || [];
  if (candidates.length && CROP_CONFIRMATION_REASONS.includes(extraction.reason)) {
    return advance(
      STATES.WAITING_FOR_CROP_CONFIRMATION,
      language,
      {
        ...context,
        cropCandidates: candidates,
        multiple: extraction.reason === 'MULTIPLE_CROPS_DETECTED',
      },
      { pendingCropCandidates: candidates, declaredCropText: rawText },
    );
  }

  const failureMessage = extraction && CROP_FAILURE_MESSAGES[extraction.reason];
  if (failureMessage) {
    return plainReply(STATES.WAITING_FOR_CROP, language, failureMessage);
  }

  return advance(STATES.WAITING_FOR_CROP, language, context, {});
}

/**
 * Executes a state transition based on the current session and parsed message.
 * Pure: interacts with NO external services (DB, Twilio, APIs).
 *
 * @param {Object} currentSession - the session as stored, including any survey
 *   answers already given
 * @param {Object} parsedMessage - the output from whatsappParser.parseMessage
 * @param {Object|null} farmer - the Farmer record with associatedGats populated
 * @param {Object} [context] - prefetched reads: { gat, gats, villages,
 *   otherActiveArea, remainingArea, submissions, cropCategory, now }
 * @returns {{nextState: string, replyText: string, updatedSessionData: Object,
 *   farmerUpdates?: Object, sideEffect?: Object}}
 */
function processFlow(currentSession, parsedMessage, farmer = null, context = {}) {
  const session = currentSession || {};
  const currentState = session.state || STATES.START;
  const language = session.language || LANGUAGES.MR;
  const now = context.now || new Date();

  // Session answers the prompt builders need but the controller cannot know
  // about — the crop class chosen a step ago, the candidates offered a step ago.
  const promptContext = {
    cropCategory: session.cropCategory || null,
    cropCandidates: session.pendingCropCandidates || [],
    villages: (context && context.villages && context.villages.length) ? context.villages : getFeaturedVillages(),
    ...context,
  };

  // Anything we could not parse leaves the farmer exactly where they were.
  if (parsedMessage.type === MESSAGE_TYPES.UNKNOWN) {
    return plainReply(currentState, language, 'ERROR');
  }

  if (parsedMessage.type === MESSAGE_TYPES.TEXT) {
    const trimmed = String(parsedMessage.data.text || '').trim();
    const lowered = trimmed.toLowerCase();

    // Language switch, available at every state. Matched on the whole message so
    // a farmer naming a crop that happens to contain "hi" is naming a crop.
    const switched = LANGUAGE_KEYWORDS[lowered];
    if (switched) {
      const notice = getMessage('LANGUAGE_SWITCHED', switched);
      const farmerUpdates = { preferredLanguage: switched };
      const prompt = promptForState(currentState, switched, promptContext);

      // Re-ask the question they were on, in the new language, so a switch does
      // not cost them their place in the form.
      if (prompt) {
        return {
          nextState: currentState,
          replyText: joinParts(notice, renderPrompt(prompt)),
          updatedSessionData: { language: switched },
          farmerUpdates,
        };
      }

      const restarted = divisionSelection(switched, farmer, promptContext, notice);
      return {
        ...restarted,
        updatedSessionData: { ...restarted.updatedSessionData, language: switched },
        farmerUpdates,
      };
    }

    if (RESTART_KEYWORDS.includes(lowered)) {
      return divisionSelection(language, farmer, promptContext, getMessage('WELCOME', language));
    }
  }

  switch (currentState) {
    // LANGUAGE_SELECTION is unreachable by design and only survives so a session
    // stored before the menu was removed can still be loaded. Treat it as a
    // restart rather than answering a question nobody was asked.
    case STATES.START:
    case STATES.LANGUAGE_SELECTION:
      return divisionSelection(language, farmer, promptContext, getMessage('WELCOME', language));

    case STATES.WAITING_FOR_DIVISION_SELECTION: {
      const pool = (promptContext.divisions && promptContext.divisions.length)
        ? promptContext.divisions
        : getDivisions();
      const prompt = promptForState(currentState, language, { ...promptContext, divisions: pool });
      let chosenDivision = null;

      if (parsedMessage.type === MESSAGE_TYPES.TEXT) {
        const chosen = matchOption(prompt, parsedMessage.data.text);
        if (chosen) {
          chosenDivision = findDivision(chosen.key);
        } else {
          chosenDivision = findDivision(parsedMessage.data.text);
        }
      }

      if (!chosenDivision) {
        return reask(currentState, language, { ...promptContext, divisions: pool, invalid: true }, 'INVALID_DIVISION_SELECTION');
      }

      const districts = getDistricts(chosenDivision.id);
      return advance(
        STATES.WAITING_FOR_DISTRICT_SELECTION,
        language,
        { ...promptContext, districts, selectedDivision: chosenDivision.id },
        { selectedDivision: chosenDivision.id, selectedDistrict: null, selectedTaluka: null, selectedVillage: null, selectedGatId: null },
      );
    }

    case STATES.WAITING_FOR_DISTRICT_SELECTION: {
      const pool = (promptContext.districts && promptContext.districts.length)
        ? promptContext.districts
        : getDistricts(session.selectedDivision || 'NASHIK');
      const prompt = promptForState(currentState, language, { ...promptContext, districts: pool });
      let chosenDistrict = null;

      if (parsedMessage.type === MESSAGE_TYPES.TEXT) {
        const chosen = matchOption(prompt, parsedMessage.data.text);
        if (chosen) {
          chosenDistrict = findDistrict(chosen.key, session.selectedDivision);
        } else {
          chosenDistrict = findDistrict(parsedMessage.data.text, session.selectedDivision);
        }
      }

      if (!chosenDistrict) {
        return reask(currentState, language, { ...promptContext, districts: pool, invalid: true }, 'INVALID_DISTRICT_SELECTION');
      }

      const talukas = getTalukas(chosenDistrict.name);
      return advance(
        STATES.WAITING_FOR_TALUKA_SELECTION,
        language,
        { ...promptContext, talukas, selectedDistrict: chosenDistrict.name },
        { selectedDistrict: chosenDistrict.name, selectedTaluka: null, selectedVillage: null, selectedGatId: null },
      );
    }

    case STATES.WAITING_FOR_TALUKA_SELECTION: {
      const pool = (promptContext.talukas && promptContext.talukas.length)
        ? promptContext.talukas
        : getTalukas(session.selectedDistrict || 'Nashik');
      const prompt = promptForState(currentState, language, { ...promptContext, talukas: pool });
      let chosenTaluka = null;

      if (parsedMessage.type === MESSAGE_TYPES.TEXT) {
        const chosen = matchOption(prompt, parsedMessage.data.text);
        if (chosen) {
          chosenTaluka = findTaluka(chosen.key, session.selectedDistrict);
        } else {
          chosenTaluka = findTaluka(parsedMessage.data.text, session.selectedDistrict);
        }
      }

      if (!chosenTaluka) {
        return reask(currentState, language, { ...promptContext, talukas: pool, invalid: true }, 'INVALID_TALUKA_SELECTION');
      }

      const villages = getVillagesInTaluka(chosenTaluka.name);
      return advance(
        STATES.WAITING_FOR_VILLAGE_SELECTION,
        language,
        { ...promptContext, villages, selectedTaluka: chosenTaluka.name },
        { selectedTaluka: chosenTaluka.name, selectedVillage: null, selectedGatId: null },
      );
    }

    case STATES.WAITING_FOR_VILLAGE_SELECTION: {
      const pool = (promptContext.villages && promptContext.villages.length)
        ? promptContext.villages
        : (session.selectedTaluka ? getVillagesInTaluka(session.selectedTaluka) : getFeaturedVillages());
      const prompt = promptForState(currentState, language, { ...promptContext, villages: pool });
      let chosenVillageName = null;

      if (parsedMessage.type === MESSAGE_TYPES.TEXT) {
        const chosen = matchOption(prompt, parsedMessage.data.text);
        if (chosen) {
          chosenVillageName = chosen.key;
        } else {
          const found = findVillage(parsedMessage.data.text, session.selectedTaluka);
          if (found) {
            chosenVillageName = found.name;
          }
        }
      }

      if (!chosenVillageName) {
        return reask(currentState, language, { ...promptContext, villages: pool, invalid: true }, 'INVALID_VILLAGE_SELECTION');
      }

      const allFarmerGats = farmer?.associatedGats || [];
      const inVillage = allFarmerGats.filter((gat) => gat.village && gat.village.toLowerCase() === chosenVillageName.toLowerCase());
      let gatsPool = inVillage.length > 0
        ? inVillage
        : ((promptContext.gats && promptContext.gats.length) ? promptContext.gats : allFarmerGats);

      if (!gatsPool || gatsPool.length === 0) {
        const found = findVillage(chosenVillageName, session.selectedTaluka);
        const defNumbers = found?.defaultGats || ['101', '102', '103', '104', '105', '106'];
        gatsPool = defNumbers.map((num) => ({
          _id: `gat_${num}`,
          gatNumber: num,
          village: chosenVillageName,
          registeredArea: 1.2
        }));
      }

      return advance(
        STATES.WAITING_FOR_GAT_SELECTION,
        language,
        { ...promptContext, gats: gatsPool, selectedVillage: chosenVillageName },
        { selectedVillage: chosenVillageName, selectedGatId: null },
      );
    }

    case STATES.WAITING_FOR_GAT_SELECTION: {
      let pool = (promptContext.gats && promptContext.gats.length)
        ? promptContext.gats
        : (farmer?.associatedGats || []);

      if ((!pool || pool.length === 0) && session.selectedVillage) {
        const found = findVillage(session.selectedVillage);
        const defNumbers = found?.defaultGats || ['101', '102', '103', '104', '105', '106'];
        pool = defNumbers.map((num) => ({
          _id: `gat_${num}`,
          gatNumber: num,
          village: session.selectedVillage,
          registeredArea: 1.2
        }));
      }

      const prompt = promptForState(currentState, language, { ...promptContext, gats: pool });
      const chosen = parsedMessage.type === MESSAGE_TYPES.TEXT
        ? matchOption(prompt, parsedMessage.data.text)
        : null;

      if (!chosen) {
        return reask(
          currentState,
          language,
          { ...promptContext, gats: pool, invalid: true },
          'INVALID_GAT_SELECTION',
        );
      }

      const gat = pool.find((candidate) => String(candidate._id) === chosen.key || String(candidate.gatNumber) === chosen.key) || null;
      return advance(
        STATES.WAITING_FOR_ACTION,
        language,
        { ...promptContext, gat },
        { selectedGatId: gat ? String(gat._id) : chosen.key },
      );
    }

    case STATES.WAITING_FOR_ACTION: {
      let activeGat = promptContext.gat;
      if (!activeGat && session.selectedGatId) {
        const pool = (promptContext.gats && promptContext.gats.length)
          ? promptContext.gats
          : (farmer?.associatedGats || []);
        activeGat = pool.find((g) => String(g._id) === String(session.selectedGatId) || String(g.gatNumber) === String(session.selectedGatId));
        if (!activeGat) {
          activeGat = {
            gatNumber: String(session.selectedGatId).replace(/^gat_/, ''),
            village: session.selectedVillage || 'शेतात'
          };
        }
      }
      const prompt = actionHubPrompt(language, activeGat);
      const chosen = parsedMessage.type === MESSAGE_TYPES.TEXT
        ? matchOption(prompt, parsedMessage.data.text)
        : null;

      if (!chosen) return reask(currentState, language, promptContext);

      switch (chosen.key) {
        case SURVEY_ACTIONS.REGISTER_CROP:
          return advance(STATES.WAITING_FOR_SEASON, language, promptContext, BLANK_CROP_ENTRY);

        // History and the not-implemented list both answer and then re-offer the
        // hub, so reading one does not end the conversation.
        case SURVEY_ACTIONS.VIEW_HISTORY:
          return advance(
            STATES.WAITING_FOR_ACTION,
            language,
            promptContext,
            {},
            historyMessage(language, promptContext.gat, promptContext.submissions),
          );

        case SURVEY_ACTIONS.REGISTER_PLANTING:
          return advance(
            STATES.WAITING_FOR_PLANTING_TYPE,
            language,
            promptContext,
            { plantingType: null, plantingLocationText: null },
          );

        default:
          return advance(
            STATES.WAITING_FOR_ACTION,
            language,
            promptContext,
            {},
            notImplementedMessage(language),
          );
      }
    }

    case STATES.WAITING_FOR_SEASON: {
      const prompt = promptForState(currentState, language, promptContext);
      const chosen = parsedMessage.type === MESSAGE_TYPES.TEXT
        ? matchOption(prompt, parsedMessage.data.text)
        : null;

      if (!chosen) return reask(currentState, language, promptContext);

      return advance(STATES.WAITING_FOR_PEEK_TYPE, language, promptContext, {
        season: chosen.key,
        // The crop year the season's entries are summed within. Derived from the
        // filing date, not asked for: a farmer has no reason to know that a
        // January Rabi filing belongs to the previous crop year.
        cropYear: cropYear(now),
      });
    }

    case STATES.WAITING_FOR_PEEK_TYPE: {
      const prompt = promptForState(currentState, language, promptContext);
      const chosen = parsedMessage.type === MESSAGE_TYPES.TEXT
        ? matchOption(prompt, parsedMessage.data.text)
        : null;

      if (!chosen) return reask(currentState, language, promptContext);

      return advance(STATES.WAITING_FOR_AREA, language, promptContext, { peekType: chosen.key });
    }

    case STATES.WAITING_FOR_AREA: {
      if (parsedMessage.type !== MESSAGE_TYPES.TEXT) {
        return reask(currentState, language, promptContext, 'AREA_NO_NUMBER');
      }

      const parsed = parseArea(parsedMessage.data.text);
      if (!parsed.ok) {
        return reask(
          currentState,
          language,
          promptContext,
          AREA_REASON_MESSAGES[parsed.reason] || 'AREA_NO_NUMBER',
        );
      }

      // An area larger than the parcel is accepted here on purpose. It is not the
      // conversation's job to adjudicate it — the validation engine's area check
      // does that, and routes the filing to an officer for review. Blocking it at
      // the keyboard would mean a farmer with a genuine records discrepancy could
      // never file at all, and nobody would ever see the discrepancy.
      return advance(
        STATES.WAITING_FOR_WATER_SOURCE,
        language,
        promptContext,
        { registeredArea: parsed.hectares },
        getMessage('AREA_ACCEPTED', language, {
          area: formatHectares(parsed.hectares, language),
        }),
      );
    }

    case STATES.WAITING_FOR_WATER_SOURCE: {
      const prompt = promptForState(currentState, language, promptContext);
      const chosen = parsedMessage.type === MESSAGE_TYPES.TEXT
        ? matchOption(prompt, parsedMessage.data.text)
        : null;

      if (!chosen) return reask(currentState, language, promptContext);

      if (chosen.key === WATER_SOURCES.OTHER) {
        return advance(STATES.WAITING_FOR_WATER_OTHER, language, promptContext, {});
      }

      return advance(STATES.WAITING_FOR_CROP_CATEGORY, language, promptContext, {
        waterSource: chosen.key,
        waterSourceOther: null,
      });
    }

    case STATES.WAITING_FOR_WATER_OTHER: {
      const text = parsedMessage.type === MESSAGE_TYPES.TEXT
        ? String(parsedMessage.data.text || '').trim()
        : '';

      if (!text) return reask(currentState, language, promptContext, 'ERROR');

      return advance(STATES.WAITING_FOR_CROP_CATEGORY, language, promptContext, {
        waterSource: WATER_SOURCES.OTHER,
        waterSourceOther: text,
      });
    }

    case STATES.WAITING_FOR_CROP_CATEGORY: {
      const prompt = promptForState(currentState, language, promptContext);
      const chosen = parsedMessage.type === MESSAGE_TYPES.TEXT
        ? matchOption(prompt, parsedMessage.data.text)
        : null;

      if (!chosen) return reask(currentState, language, promptContext);

      return advance(
        STATES.WAITING_FOR_CROP,
        language,
        { ...promptContext, cropCategory: chosen.key },
        { cropCategory: chosen.key },
      );
    }

    case STATES.WAITING_FOR_CROP:
      if (parsedMessage.type === MESSAGE_TYPES.TEXT || parsedMessage.type === MESSAGE_TYPES.VOICE) {
        return declareCrop(parsedMessage.data.extraction, parsedMessage, language, promptContext, session);
      }
      return advance(STATES.WAITING_FOR_CROP, language, promptContext, {});

    case STATES.WAITING_FOR_CROP_CONFIRMATION: {
      const candidates = session.pendingCropCandidates || [];
      const prompt = cropConfirmPrompt(language, candidates, promptContext);
      const chosen = parsedMessage.type === MESSAGE_TYPES.TEXT
        ? matchOption(prompt, parsedMessage.data.text)
        : null;

      if (chosen) {
        return advance(STATES.WAITING_FOR_SOWING_DATE, language, promptContext, {
          declaredCrop: chosen.key,
          cropCategory: categoryOfCrop(chosen.key) || session.cropCategory || null,
          matchConfidence: null,
          matchMethod: 'CONFIRMED',
          pendingCropCandidates: [],
        });
      }

      // Not one of the offered crops, so treat it as a fresh attempt at the name
      // rather than an invalid menu choice — a farmer who retypes has answered
      // the question, just not with a number.
      if (parsedMessage.type === MESSAGE_TYPES.TEXT || parsedMessage.type === MESSAGE_TYPES.VOICE) {
        return declareCrop(parsedMessage.data.extraction, parsedMessage, language, promptContext, session);
      }
      return reask(currentState, language, promptContext);
    }

    case STATES.WAITING_FOR_SOWING_DATE: {
      if (parsedMessage.type !== MESSAGE_TYPES.TEXT) {
        return reask(currentState, language, promptContext, 'SOWING_DATE_UNPARSEABLE');
      }

      const parsed = parseSowingDate(parsedMessage.data.text, now);
      if (!parsed.ok) {
        return reask(
          currentState,
          language,
          promptContext,
          SOWING_DATE_REASON_MESSAGES[parsed.reason] || 'SOWING_DATE_UNPARSEABLE',
        );
      }

      return advance(STATES.WAITING_FOR_LOCATION, language, promptContext, {
        sowingDate: parsed.date,
      });
    }

    case STATES.WAITING_FOR_LOCATION:
      if (parsedMessage.type === MESSAGE_TYPES.LOCATION) {
        return advance(STATES.WAITING_FOR_IMAGE, language, promptContext, {
          location: parsedMessage.data,
        });
      }
      return advance(STATES.WAITING_FOR_LOCATION, language, promptContext, {});

    case STATES.WAITING_FOR_IMAGE:
      if (parsedMessage.type === MESSAGE_TYPES.IMAGE) {
        return {
          nextState: STATES.READY_FOR_VALIDATION,
          replyText: getMessage('READY', language),
          updatedSessionData: {
            state: STATES.READY_FOR_VALIDATION,
            image: parsedMessage.data,
          },
        };
      }
      return advance(STATES.WAITING_FOR_IMAGE, language, promptContext, {});

    case STATES.WAITING_FOR_PLANTING_TYPE: {
      const text = parsedMessage.type === MESSAGE_TYPES.TEXT
        ? String(parsedMessage.data.text || '').trim()
        : '';

      if (!text) return reask(currentState, language, promptContext, 'ERROR');

      return advance(STATES.WAITING_FOR_PLANTING_LOCATION, language, promptContext, {
        plantingType: text,
      });
    }

    case STATES.WAITING_FOR_PLANTING_LOCATION: {
      let locationText = null;
      let location = null;

      if (parsedMessage.type === MESSAGE_TYPES.LOCATION) {
        location = parsedMessage.data;
        locationText = `${location.latitude}, ${location.longitude}`;
      } else if (parsedMessage.type === MESSAGE_TYPES.TEXT) {
        locationText = String(parsedMessage.data.text || '').trim() || null;
      }

      if (!locationText) return reask(currentState, language, promptContext, 'ERROR');

      // Back to the hub, and explicit that this record is not validated. A
      // farmer who has just watched crop filings go through GPS, photo and AI
      // checks would otherwise reasonably assume this one did too.
      const saved = advance(
        STATES.WAITING_FOR_ACTION,
        language,
        promptContext,
        { plantingType: null, plantingLocationText: null },
        joinParts(
          getMessage('PLANTING_SAVED', language, {
            treeType: session.plantingType || '-',
            location: locationText,
          }),
          getMessage('PLANTING_INFO_ONLY', language),
        ),
      );

      return {
        ...saved,
        sideEffect: {
          type: 'CREATE_PLANTING',
          data: {
            gatId: session.selectedGatId || null,
            plantingType: session.plantingType || null,
            locationText,
            location,
          },
        },
      };
    }

    // The controller owns what happens next in these states; anything a farmer
    // sends meanwhile puts them back at their farm list.
    case STATES.READY_FOR_VALIDATION:
    case STATES.VALIDATING:
    case STATES.COMPLETED:
    case STATES.FAILED:
    default:
      return farmSelection(language, farmer, promptContext, getMessage('WELCOME', language));
  }
}

module.exports = {
  processFlow,
  CROP_FAILURE_MESSAGES,
  BLANK_CROP_ENTRY,
  AREA_REASON_MESSAGES,
  SOWING_DATE_REASON_MESSAGES,
};
