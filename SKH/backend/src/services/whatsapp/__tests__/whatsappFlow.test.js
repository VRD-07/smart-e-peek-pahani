const { processFlow } = require('../whatsappFlow');
const { STATES, MESSAGE_TYPES, LANGUAGES } = require('../constants');
const { DICTIONARY } = require('../messages');

describe('whatsappFlow', () => {
  it('should transition START -> LANGUAGE_SELECTION on start', () => {
    const session = { state: STATES.START, language: LANGUAGES.EN };
    const message = { type: MESSAGE_TYPES.UNKNOWN, data: null }; // Any input in START leads to LANGUAGE_SELECTION except specific handling

    // In our implementation, START goes to LANGUAGE_SELECTION automatically, ignoring the parsed message unless handled specifically.
    const result = processFlow(session, message);

    // BUT wait, in our implementation if message is UNKNOWN, it returns ERROR and stays in current state.
    // Let's test with a valid text message.
    const validMessage = { type: MESSAGE_TYPES.TEXT, data: { text: 'hi' } };
    const validResult = processFlow(session, validMessage);

    expect(validResult.nextState).toBe(STATES.LANGUAGE_SELECTION);
    expect(validResult.updatedSessionData.state).toBe(STATES.LANGUAGE_SELECTION);
    expect(validResult.replyText).toBe(DICTIONARY[LANGUAGES.EN].WELCOME);
  });

  it('should transition LANGUAGE_SELECTION -> WAITING_FOR_CROP on valid language selection (Marathi) with single Gat', () => {
    const session = { state: STATES.LANGUAGE_SELECTION, language: LANGUAGES.EN };
    const message = { type: MESSAGE_TYPES.TEXT, data: { text: '1' } }; // '1' is Marathi
    const farmer = { associatedGats: [{ _id: 'gat123' }] };

    const result = processFlow(session, message, farmer);

    expect(result.nextState).toBe(STATES.WAITING_FOR_CROP);
    expect(result.updatedSessionData.language).toBe(LANGUAGES.MR);
    expect(result.updatedSessionData.selectedGatId).toBe('gat123');
    expect(result.replyText).toBe(DICTIONARY[LANGUAGES.MR].ASK_CROP);
  });

  it('should transition LANGUAGE_SELECTION -> WAITING_FOR_GAT_SELECTION on valid language selection with multiple Gats', () => {
    const session = { state: STATES.LANGUAGE_SELECTION, language: LANGUAGES.EN };
    const message = { type: MESSAGE_TYPES.TEXT, data: { text: '1' } };
    const farmer = { associatedGats: [{ _id: 'gat123', gatNumber: '1', village: 'V1' }, { _id: 'gat456', gatNumber: '2', village: 'V2' }] };

    const result = processFlow(session, message, farmer);

    expect(result.nextState).toBe(STATES.WAITING_FOR_GAT_SELECTION);
    expect(result.updatedSessionData.language).toBe(LANGUAGES.MR);
  });

  it('should transition WAITING_FOR_GAT_SELECTION -> WAITING_FOR_CROP on valid Gat selection', () => {
    const session = { state: STATES.WAITING_FOR_GAT_SELECTION, language: LANGUAGES.MR };
    const message = { type: MESSAGE_TYPES.TEXT, data: { text: '2' } };
    const farmer = { associatedGats: [{ _id: 'gat123' }, { _id: 'gat456' }] };

    const result = processFlow(session, message, farmer);

    expect(result.nextState).toBe(STATES.WAITING_FOR_CROP);
    expect(result.updatedSessionData.selectedGatId).toBe('gat456');
    expect(result.replyText).toBe(DICTIONARY[LANGUAGES.MR].ASK_CROP);
  });

  it('should reject invalid input in LANGUAGE_SELECTION and preserve state', () => {
    const session = { state: STATES.LANGUAGE_SELECTION, language: LANGUAGES.EN };
    const message = { type: MESSAGE_TYPES.TEXT, data: { text: '4' } }; // Invalid option

    const result = processFlow(session, message);

    expect(result.nextState).toBe(STATES.LANGUAGE_SELECTION);
    expect(result.replyText).toBe(DICTIONARY[LANGUAGES.EN].INVALID_LANGUAGE);
  });

  it('should transition WAITING_FOR_CROP -> WAITING_FOR_LOCATION when crop received', () => {
    const session = { state: STATES.WAITING_FOR_CROP, language: LANGUAGES.MR };
    const message = {
      type: MESSAGE_TYPES.TEXT,
      data: { text: 'Soybean', extraction: { declaredCrop: 'soybean' } }
    };

    const result = processFlow(session, message);

    expect(result.nextState).toBe(STATES.WAITING_FOR_LOCATION);
    expect(result.updatedSessionData.declaredCrop).toBe('soybean');
    expect(result.replyText).toBe(DICTIONARY[LANGUAGES.MR].ASK_LOCATION);
  });

  it('should return MULTIPLE_CROPS error in WAITING_FOR_CROP', () => {
    const session = { state: STATES.WAITING_FOR_CROP, language: LANGUAGES.EN };
    const message = {
      type: MESSAGE_TYPES.TEXT,
      data: { text: 'fake text', extraction: { reason: 'MULTIPLE_CROPS_DETECTED' } }
    };

    const result = processFlow(session, message);
    expect(result.nextState).toBe(STATES.WAITING_FOR_CROP);
    expect(result.replyText).toBe(DICTIONARY[LANGUAGES.EN].MULTIPLE_CROPS);
  });

  it('should return UNSUPPORTED_CROP error in WAITING_FOR_CROP', () => {
    const session = { state: STATES.WAITING_FOR_CROP, language: LANGUAGES.HI };
    const message = {
      type: MESSAGE_TYPES.TEXT,
      data: { text: 'fake text', extraction: { reason: 'UNSUPPORTED_CROP' } }
    };

    const result = processFlow(session, message);
    expect(result.nextState).toBe(STATES.WAITING_FOR_CROP);
    expect(result.replyText).toBe(DICTIONARY[LANGUAGES.HI].UNSUPPORTED_CROP);
  });

  it('should transition WAITING_FOR_LOCATION -> WAITING_FOR_IMAGE when location received', () => {
    const session = { state: STATES.WAITING_FOR_LOCATION, language: LANGUAGES.HI };
    const locationData = { latitude: 19.123, longitude: 74.123, source: 'WHATSAPP' };
    const message = { type: MESSAGE_TYPES.LOCATION, data: locationData };

    const result = processFlow(session, message);

    expect(result.nextState).toBe(STATES.WAITING_FOR_IMAGE);
    expect(result.updatedSessionData.location).toEqual(locationData);
    expect(result.replyText).toBe(DICTIONARY[LANGUAGES.HI].ASK_IMAGE);
  });

  it('should reject non-location messages in WAITING_FOR_LOCATION', () => {
    const session = { state: STATES.WAITING_FOR_LOCATION, language: LANGUAGES.EN };
    const message = { type: MESSAGE_TYPES.TEXT, data: { text: 'Here is my field' } }; // Text instead of Location

    const result = processFlow(session, message);

    expect(result.nextState).toBe(STATES.WAITING_FOR_LOCATION);
    expect(result.replyText).toBe(DICTIONARY[LANGUAGES.EN].ASK_LOCATION);
  });

  it('should transition WAITING_FOR_IMAGE -> READY_FOR_VALIDATION when image received', () => {
    const session = { state: STATES.WAITING_FOR_IMAGE, language: LANGUAGES.EN };
    const imageData = { url: 'https://img.com', mimeType: 'image/jpeg' };
    const message = { type: MESSAGE_TYPES.IMAGE, data: imageData };

    const result = processFlow(session, message);

    expect(result.nextState).toBe(STATES.READY_FOR_VALIDATION);
    expect(result.updatedSessionData.image).toEqual(imageData);
    expect(result.replyText).toBe(DICTIONARY[LANGUAGES.EN].READY);
  });

  it('should restart flow if a user sends "hi" during middle states', () => {
    const session = { state: STATES.WAITING_FOR_IMAGE, language: LANGUAGES.MR };
    const message = { type: MESSAGE_TYPES.TEXT, data: { text: 'start' } };

    const result = processFlow(session, message);

    expect(result.nextState).toBe(STATES.LANGUAGE_SELECTION);
    expect(result.updatedSessionData.state).toBe(STATES.LANGUAGE_SELECTION);
    expect(result.replyText).toBe(DICTIONARY[LANGUAGES.MR].WELCOME);
  });

  it('should handle UNKNOWN messages robustly in any state', () => {
    const session = { state: STATES.WAITING_FOR_LOCATION, language: LANGUAGES.EN };
    const message = { type: MESSAGE_TYPES.UNKNOWN, data: null };

    const result = processFlow(session, message);

    expect(result.nextState).toBe(STATES.WAITING_FOR_LOCATION);
    expect(result.replyText).toBe(DICTIONARY[LANGUAGES.EN].ERROR);
  });
});
