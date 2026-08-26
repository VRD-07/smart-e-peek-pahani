const { STATES, MESSAGE_TYPES, LANGUAGES } = require('./constants');
const { getMessage } = require('./messages');

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
  // Speech only. Both point at the keyboard, but they differ on whose fault it
  // was: VOICE_FAILED owns the failure, VOICE_UNCLEAR does not blame the farmer
  // for words we could not resolve.
  STT_ERROR: 'VOICE_FAILED',
  EMPTY_TRANSCRIPT: 'VOICE_UNCLEAR',
  LOW_CONFIDENCE: 'VOICE_UNCLEAR',
};

/**
 * Executes a state transition based on the current session and parsed message.
 * Returns the next state, the response text, and the updated session fields.
 * This is a pure function and interacts with NO external services (DB, Twilio, APIs).
 *
 * @param {Object} currentSession - The current session object
 * @param {Object} parsedMessage - The output from whatsappParser.parseMessage
 * @returns {Object} { nextState, replyText, updatedSessionData }
 */
function processFlow(currentSession, parsedMessage, farmer = null) {
  const currentState = currentSession?.state || STATES.START;
  let language = currentSession?.language || LANGUAGES.EN;

  // Handle unknown/invalid inputs gracefully at any state
  if (parsedMessage.type === MESSAGE_TYPES.UNKNOWN) {
    return {
      nextState: currentState, // stay in current state
      replyText: getMessage('ERROR', language),
      updatedSessionData: {}
    };
  }

  // Special case: if user says "hi" or something to restart
  if (parsedMessage.type === MESSAGE_TYPES.TEXT) {
    const textLower = parsedMessage.data.text.toLowerCase();
    if (textLower === 'hi' || textLower === 'hello' || textLower === 'start') {
      return {
        nextState: STATES.LANGUAGE_SELECTION,
        replyText: getMessage('WELCOME', language),
        updatedSessionData: { state: STATES.LANGUAGE_SELECTION }
      };
    }
  }

  switch (currentState) {
    case STATES.START:
      return {
        nextState: STATES.LANGUAGE_SELECTION,
        replyText: getMessage('WELCOME', language),
        updatedSessionData: { state: STATES.LANGUAGE_SELECTION }
      };

    case STATES.LANGUAGE_SELECTION:
      if (parsedMessage.type === MESSAGE_TYPES.TEXT) {
        const choice = parsedMessage.data.text.trim();
        let selectedLang = null;
        if (choice === '1') selectedLang = LANGUAGES.MR;
        else if (choice === '2') selectedLang = LANGUAGES.HI;
        else if (choice === '3') selectedLang = LANGUAGES.EN;

        if (selectedLang) {
          if (farmer && farmer.associatedGats && farmer.associatedGats.length > 0) {
            if (farmer.associatedGats.length === 1) {
              return {
                nextState: STATES.WAITING_FOR_CROP,
                replyText: getMessage('ASK_CROP', selectedLang),
                updatedSessionData: {
                  state: STATES.WAITING_FOR_CROP,
                  language: selectedLang,
                  selectedGatId: farmer.associatedGats[0]._id
                }
              };
            } else {
              const gatsList = farmer.associatedGats.map((g, i) => `${i + 1}. Gat ${g.gatNumber} — ${g.village}`).join('\n');
              return {
                nextState: STATES.WAITING_FOR_GAT_SELECTION,
                replyText: `${getMessage('ASK_GAT_SELECTION', selectedLang)}\n\n${gatsList}`,
                updatedSessionData: { state: STATES.WAITING_FOR_GAT_SELECTION, language: selectedLang }
              };
            }
          }
          return {
            nextState: STATES.START,
            replyText: getMessage('MISSING_GAT', selectedLang),
            updatedSessionData: { state: STATES.START, language: selectedLang }
          };
        }
      }
      // Invalid input for language selection
      return {
        nextState: STATES.LANGUAGE_SELECTION,
        replyText: getMessage('INVALID_LANGUAGE', language),
        updatedSessionData: {}
      };

    case STATES.WAITING_FOR_GAT_SELECTION:
      if (parsedMessage.type === MESSAGE_TYPES.TEXT && farmer && farmer.associatedGats) {
        const choiceIdx = parseInt(parsedMessage.data.text.trim(), 10) - 1;
        if (!isNaN(choiceIdx) && choiceIdx >= 0 && choiceIdx < farmer.associatedGats.length) {
          return {
            nextState: STATES.WAITING_FOR_CROP,
            replyText: getMessage('ASK_CROP', language),
            updatedSessionData: {
              state: STATES.WAITING_FOR_CROP,
              selectedGatId: farmer.associatedGats[choiceIdx]._id
            }
          };
        }
      }

      const gatsList = farmer?.associatedGats?.map((g, i) => `${i + 1}. Gat ${g.gatNumber} — ${g.village}`).join('\n') || '';
      return {
        nextState: STATES.WAITING_FOR_GAT_SELECTION,
        replyText: `${getMessage('INVALID_GAT_SELECTION', language)}\n\n${gatsList}`,
        updatedSessionData: {}
      };

    case STATES.WAITING_FOR_CROP:
      // Handle both TEXT and VOICE which contain the extraction result
      if (parsedMessage.type === MESSAGE_TYPES.TEXT || parsedMessage.type === MESSAGE_TYPES.VOICE) {
        const extraction = parsedMessage.data.extraction;

        if (extraction && extraction.declaredCrop) {
          return {
            nextState: STATES.WAITING_FOR_LOCATION,
            replyText: getMessage('ASK_LOCATION', language),
            updatedSessionData: {
              state: STATES.WAITING_FOR_LOCATION,
              declaredCrop: extraction.declaredCrop
            }
          };
        }

        const failureMessage = extraction && CROP_FAILURE_MESSAGES[extraction.reason];
        if (failureMessage) {
          return {
            nextState: STATES.WAITING_FOR_CROP,
            replyText: getMessage(failureMessage, language),
            updatedSessionData: {}
          };
        }
      }
      return {
        nextState: STATES.WAITING_FOR_CROP,
        replyText: getMessage('ASK_CROP', language), // Prompt again
        updatedSessionData: {}
      };

    case STATES.WAITING_FOR_LOCATION:
      if (parsedMessage.type === MESSAGE_TYPES.LOCATION) {
        return {
          nextState: STATES.WAITING_FOR_IMAGE,
          replyText: getMessage('ASK_IMAGE', language),
          updatedSessionData: {
            state: STATES.WAITING_FOR_IMAGE,
            location: parsedMessage.data
          }
        };
      }
      return {
        nextState: STATES.WAITING_FOR_LOCATION,
        replyText: getMessage('ASK_LOCATION', language),
        updatedSessionData: {}
      };

    case STATES.WAITING_FOR_IMAGE:
      if (parsedMessage.type === MESSAGE_TYPES.IMAGE) {
        return {
          nextState: STATES.READY_FOR_VALIDATION,
          replyText: getMessage('READY', language),
          updatedSessionData: {
            state: STATES.READY_FOR_VALIDATION,
            image: parsedMessage.data
          }
        };
      }
      return {
        nextState: STATES.WAITING_FOR_IMAGE,
        replyText: getMessage('ASK_IMAGE', language),
        updatedSessionData: {}
      };

    case STATES.READY_FOR_VALIDATION:
    case STATES.VALIDATING:
    case STATES.COMPLETED:
    case STATES.FAILED:
      // In these states, usually the backend handles next steps, or we tell them to restart.
      return {
        nextState: STATES.START,
        replyText: getMessage('WELCOME', language),
        updatedSessionData: { state: STATES.LANGUAGE_SELECTION } // Resetting essentially
      };

    default:
      return {
        nextState: STATES.START,
        replyText: getMessage('WELCOME', language),
        updatedSessionData: { state: STATES.LANGUAGE_SELECTION }
      };
  }
}

module.exports = {
  processFlow
};
