const { processFlow } = require('../whatsappFlow');
const { STATES, MESSAGE_TYPES, LANGUAGES } = require('../constants');
const { DICTIONARY, getMessage } = require('../messages');
const { SEASONS, PEEK_TYPES, WATER_SOURCES, cropYear } = require('../../survey/constants');

const text = (value) => ({ type: MESSAGE_TYPES.TEXT, data: { text: value } });
const cropText = (value, extraction) => ({
  type: MESSAGE_TYPES.TEXT,
  data: { text: value, extraction },
});

const GAT_A = { _id: 'gatA', gatNumber: '101', village: 'शिरूर', registeredArea: 1.2 };
const GAT_B = { _id: 'gatB', gatNumber: '102', village: 'शिरूर', registeredArea: 0.8 };

const oneFarm = { associatedGats: [GAT_A] };
const twoFarms = { associatedGats: [GAT_A, GAT_B] };

describe('whatsappFlow', () => {
  describe('language', () => {
    it('should answer a session with no stored language in Marathi, with no language menu', () => {
      const result = processFlow({ state: STATES.START }, text('hi'), oneFarm);

      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].WELCOME);
      // The old flow asked "1 Marathi / 2 Hindi / 3 English" here.
      expect(result.replyText).not.toContain('1. मराठी');
      expect(result.nextState).toBe(STATES.WAITING_FOR_ACTION);
    });

    it('should switch language on a keyword and re-ask the question it interrupted', () => {
      const session = { state: STATES.WAITING_FOR_SEASON, language: LANGUAGES.MR };

      const result = processFlow(session, text('English'), oneFarm);

      expect(result.nextState).toBe(STATES.WAITING_FOR_SEASON);
      expect(result.updatedSessionData.language).toBe(LANGUAGES.EN);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.EN].LANGUAGE_SWITCHED);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.EN].ASK_SEASON);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.EN].SEASON_KHARIF);
    });

    it('should ask the controller to persist the language on the farmer, not just the session', () => {
      const result = processFlow({ state: STATES.START }, text('हिंदी'), oneFarm);

      expect(result.farmerUpdates).toEqual({ preferredLanguage: LANGUAGES.HI });
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.HI].LANGUAGE_SWITCHED);
    });

    it('should not read a language keyword inside a longer message as a switch', () => {
      const session = { state: STATES.WAITING_FOR_CROP, language: LANGUAGES.MR };

      const result = processFlow(session, cropText('chilli', { declaredCrop: 'chilli' }), oneFarm);

      expect(result.farmerUpdates).toBeUndefined();
      expect(result.nextState).toBe(STATES.WAITING_FOR_SOWING_DATE);
    });
  });

  describe('farm selection', () => {
    it('should send a farmer with one Gat straight to the action hub', () => {
      const result = processFlow({ state: STATES.START }, text('hi'), oneFarm);

      expect(result.nextState).toBe(STATES.WAITING_FOR_ACTION);
      expect(result.updatedSessionData.selectedGatId).toBe('gatA');
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].ACTION_REGISTER_CROP);
    });

    it('should tell an unregistered number it is not registered', () => {
      const result = processFlow({ state: STATES.START }, text('hi'), null);

      expect(result.nextState).toBe(STATES.START);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].UNREGISTERED_FARMER);
    });

    it('should tell a farmer with no linked Gat to complete their profile', () => {
      const result = processFlow({ state: STATES.START }, text('hi'), { associatedGats: [] });

      expect(result.nextState).toBe(STATES.START);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].MISSING_GAT);
    });

    it('should list the farms of a farmer with several Gats', () => {
      const result = processFlow({ state: STATES.START }, text('hi'), twoFarms);

      expect(result.nextState).toBe(STATES.WAITING_FOR_GAT_SELECTION);
      expect(result.replyText).toContain('1. गट 101 — शिरूर');
      expect(result.replyText).toContain('2. गट 102 — शिरूर');
    });

    it('should accept a farm selected by its row number', () => {
      const session = { state: STATES.WAITING_FOR_GAT_SELECTION, language: LANGUAGES.MR };

      const result = processFlow(session, text('2'), twoFarms, { gats: [GAT_A, GAT_B] });

      expect(result.nextState).toBe(STATES.WAITING_FOR_ACTION);
      expect(result.updatedSessionData.selectedGatId).toBe('gatB');
    });

    it('should accept a farm selected by its Gat number', () => {
      const session = { state: STATES.WAITING_FOR_GAT_SELECTION, language: LANGUAGES.MR };

      const result = processFlow(session, text('102'), twoFarms, { gats: [GAT_A, GAT_B] });

      expect(result.nextState).toBe(STATES.WAITING_FOR_ACTION);
      expect(result.updatedSessionData.selectedGatId).toBe('gatB');
    });

    it('should re-list the farms and preserve state on an unreadable selection', () => {
      const session = { state: STATES.WAITING_FOR_GAT_SELECTION, language: LANGUAGES.MR };

      const result = processFlow(session, text('nine'), twoFarms, { gats: [GAT_A, GAT_B] });

      expect(result.nextState).toBe(STATES.WAITING_FOR_GAT_SELECTION);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].INVALID_GAT_SELECTION);
      expect(result.replyText).toContain('1. गट 101 — शिरूर');
    });

    it('should ask for the village first when a farmer has more Gats than a list can hold', () => {
      const many = {
        associatedGats: Array.from({ length: 12 }, (unused, index) => ({
          _id: `gat${index}`,
          gatNumber: String(200 + index),
          village: index < 6 ? 'शिरूर' : 'बारामती',
        })),
      };

      const result = processFlow({ state: STATES.START }, text('hi'), many);

      expect(result.nextState).toBe(STATES.WAITING_FOR_VILLAGE_SELECTION);
      expect(result.replyText).toContain('1. शिरूर');
      expect(result.replyText).toContain('2. बारामती');
    });

    it('should narrow the farm list to the chosen village', () => {
      const many = {
        associatedGats: [
          { _id: 'g1', gatNumber: '201', village: 'शिरूर' },
          { _id: 'g2', gatNumber: '202', village: 'बारामती' },
        ],
      };
      const session = { state: STATES.WAITING_FOR_VILLAGE_SELECTION, language: LANGUAGES.MR };

      const result = processFlow(session, text('बारामती'), many, { villages: ['शिरूर', 'बारामती'] });

      expect(result.nextState).toBe(STATES.WAITING_FOR_GAT_SELECTION);
      expect(result.updatedSessionData.selectedVillage).toBe('बारामती');
      expect(result.replyText).toContain('1. गट 202 — बारामती');
      expect(result.replyText).not.toContain('201');
    });
  });

  describe('farm action hub', () => {
    const hubSession = {
      state: STATES.WAITING_FOR_ACTION,
      language: LANGUAGES.MR,
      selectedGatId: 'gatA',
    };

    it('should start a crop entry and clear any half-finished previous one', () => {
      const stale = { ...hubSession, declaredCrop: 'cotton', registeredArea: 9 };

      const result = processFlow(stale, text('1'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_SEASON);
      expect(result.updatedSessionData.declaredCrop).toBeNull();
      expect(result.updatedSessionData.registeredArea).toBeNull();
      expect(result.updatedSessionData.pendingCropCandidates).toEqual([]);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].ASK_SEASON);
    });

    it('should show the filing history for the selected Gat and re-offer the hub', () => {
      const submissions = [
        {
          status: 'VALID',
          registeredArea: 0.6,
          sowingDate: new Date(2026, 5, 12),
          crop: { declaredCrop: 'soybean' },
        },
        {
          status: 'REVIEW',
          registeredArea: 0.4,
          sowingDate: new Date(2026, 5, 20),
          crop: { declaredCrop: 'cotton' },
        },
      ];

      const result = processFlow(hubSession, text('2'), oneFarm, { gat: GAT_A, submissions });

      expect(result.nextState).toBe(STATES.WAITING_FOR_ACTION);
      expect(result.replyText).toContain('12/06/2026');
      expect(result.replyText).toContain('0.6 हेक्टर');
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].STATUS_VALID);
      // A filing under review is listed, not hidden.
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].STATUS_REVIEW);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].ACTION_REGISTER_CROP);
    });

    it('should say so plainly when a Gat has no filings yet', () => {
      const result = processFlow(hubSession, text('2'), oneFarm, { gat: GAT_A, submissions: [] });

      expect(result.replyText).toContain(getMessage('HISTORY_EMPTY', LANGUAGES.MR, { gat: '101' }));
    });

    it('should name the actions that are not built yet rather than omitting them', () => {
      const result = processFlow(hubSession, text('4'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_ACTION);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].ACTION_REGISTER_ROAD);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].ACTION_REGISTER_STRUCTURE);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].ACTION_DECLARE_FALLOW);
    });

    it('should re-offer the hub on an unreadable choice', () => {
      const result = processFlow(hubSession, text('99'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_ACTION);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].INVALID_CHOICE);
    });
  });

  describe('survey form', () => {
    const base = { language: LANGUAGES.MR, selectedGatId: 'gatA' };

    it('should accept a season by name in any of the three languages', () => {
      const session = { ...base, state: STATES.WAITING_FOR_SEASON };
      const now = new Date(2026, 7, 20);

      const result = processFlow(session, text('Kharif'), oneFarm, { gat: GAT_A, now });

      expect(result.nextState).toBe(STATES.WAITING_FOR_PEEK_TYPE);
      expect(result.updatedSessionData.season).toBe(SEASONS.KHARIF);
      expect(result.updatedSessionData.cropYear).toBe(cropYear(now));
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].ASK_PEEK_TYPE);
    });

    it('should re-ask the season on an unreadable answer', () => {
      const session = { ...base, state: STATES.WAITING_FOR_SEASON };

      const result = processFlow(session, text('maybe'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_SEASON);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].INVALID_CHOICE);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].SEASON_KHARIF);
    });

    it('should record the peek type and show the parcel figures with the area question', () => {
      const session = { ...base, state: STATES.WAITING_FOR_PEEK_TYPE, season: SEASONS.KHARIF };

      const result = processFlow(session, text('2'), oneFarm, {
        gat: GAT_A,
        otherActiveArea: 0.5,
        remainingArea: 0.7,
      });

      expect(result.nextState).toBe(STATES.WAITING_FOR_AREA);
      expect(result.updatedSessionData.peekType).toBe(PEEK_TYPES.MIXED);
      expect(result.replyText).toContain('1.2 हेक्टर');
      expect(result.replyText).toContain('0.7 हेक्टर');
    });

    it('should convert an area given in acres to hectares', () => {
      const session = { ...base, state: STATES.WAITING_FOR_AREA };

      const result = processFlow(session, text('1 एकर'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_WATER_SOURCE);
      expect(result.updatedSessionData.registeredArea).toBeCloseTo(0.404686, 6);
      expect(result.replyText).toContain('0.4047 हेक्टर');
    });

    it('should re-ask the area when there is no number in the answer', () => {
      const session = { ...base, state: STATES.WAITING_FOR_AREA };

      const result = processFlow(session, text('थोडं'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_AREA);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].AREA_NO_NUMBER);
    });

    it('should re-ask the area when the unit is not one we convert', () => {
      const session = { ...base, state: STATES.WAITING_FOR_AREA };

      const result = processFlow(session, text('2 bigha'), oneFarm, { gat: GAT_A });

      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].AREA_UNKNOWN_UNIT);
    });

    it('should accept an area that overruns the parcel and leave the routing to validation', () => {
      const session = { ...base, state: STATES.WAITING_FOR_AREA };

      const result = processFlow(session, text('5'), oneFarm, {
        gat: GAT_A,
        otherActiveArea: 1.0,
        remainingArea: 0.2,
      });

      // Not blocked at the keyboard: the area check in the validation engine routes
      // it to an officer, which is the whole point of the check.
      expect(result.nextState).toBe(STATES.WAITING_FOR_WATER_SOURCE);
      expect(result.updatedSessionData.registeredArea).toBe(5);
    });

    it('should accept a water source from the three offered buttons', () => {
      const session = { ...base, state: STATES.WAITING_FOR_WATER_SOURCE };

      const result = processFlow(session, text('3'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_CROP_CATEGORY);
      expect(result.updatedSessionData.waterSource).toBe(WATER_SOURCES.DRIP);
    });

    it('should accept the fourth water source, which has no button of its own', () => {
      const session = { ...base, state: STATES.WAITING_FOR_WATER_SOURCE };

      const result = processFlow(session, text('इतर'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_WATER_OTHER);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].ASK_WATER_OTHER);
    });

    it('should record what the farmer typed for an unlisted water source', () => {
      const session = { ...base, state: STATES.WAITING_FOR_WATER_OTHER };

      const result = processFlow(session, text('शेततळे'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_CROP_CATEGORY);
      expect(result.updatedSessionData.waterSource).toBe(WATER_SOURCES.OTHER);
      expect(result.updatedSessionData.waterSourceOther).toBe('शेततळे');
    });

    it('should follow a crop class with examples from that class, not a list of crops', () => {
      const session = { ...base, state: STATES.WAITING_FOR_CROP_CATEGORY };

      const result = processFlow(session, text('3'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_CROP);
      expect(result.updatedSessionData.cropCategory).toBe('OILSEED');
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].ASK_CROP);
      expect(result.replyText).toContain('सोयाबीन');
    });

    it('should ask for the sowing date once a crop is resolved', () => {
      const session = { ...base, state: STATES.WAITING_FOR_CROP, cropCategory: 'OILSEED' };
      const message = cropText('Soybean', {
        declaredCrop: 'soybean',
        reason: 'SUCCESS',
        matchConfidence: 1,
        matchMethod: 'EXACT',
        matchedText: 'soybean',
      });

      const result = processFlow(session, message, oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_SOWING_DATE);
      expect(result.updatedSessionData.declaredCrop).toBe('soybean');
      expect(result.updatedSessionData.matchMethod).toBe('EXACT');
      expect(result.replyText).toBe(DICTIONARY[LANGUAGES.MR].ASK_SOWING_DATE);
    });

    it('should take the crop class from the catalogue, not from what the farmer picked', () => {
      const session = { ...base, state: STATES.WAITING_FOR_CROP, cropCategory: 'CEREAL' };
      const message = cropText('सोयाबीन', { declaredCrop: 'soybean', reason: 'SUCCESS' });

      const result = processFlow(session, message, oneFarm, { gat: GAT_A });

      expect(result.updatedSessionData.cropCategory).toBe('OILSEED');
    });

    it('should ask a farmer to confirm a crop the matcher was not confident about', () => {
      const session = { ...base, state: STATES.WAITING_FOR_CROP };
      const message = cropText('sobean', {
        declaredCrop: null,
        reason: 'LOW_MATCH_CONFIDENCE',
        candidates: ['soybean'],
      });

      const result = processFlow(session, message, oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_CROP_CONFIRMATION);
      expect(result.updatedSessionData.pendingCropCandidates).toEqual(['soybean']);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].CROP_CONFIRM);
      expect(result.replyText).toContain('सोयाबीन');
    });

    it('should ask which crop was meant when a message named several', () => {
      const session = { ...base, state: STATES.WAITING_FOR_CROP, language: LANGUAGES.EN };
      const message = cropText('soybean and cotton', {
        declaredCrop: null,
        reason: 'MULTIPLE_CROPS_DETECTED',
        candidates: ['soybean', 'cotton'],
      });

      const result = processFlow(session, message, oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_CROP_CONFIRMATION);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.EN].MULTIPLE_CROPS);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.EN].CROP_PICK_ONE);
    });

    it('should record the crop a farmer confirms', () => {
      const session = {
        ...base,
        state: STATES.WAITING_FOR_CROP_CONFIRMATION,
        pendingCropCandidates: ['soybean', 'cotton'],
      };

      const result = processFlow(session, text('2'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_SOWING_DATE);
      expect(result.updatedSessionData.declaredCrop).toBe('cotton');
      expect(result.updatedSessionData.matchMethod).toBe('CONFIRMED');
      expect(result.updatedSessionData.pendingCropCandidates).toEqual([]);
    });

    it('should treat a retyped name at the confirmation step as a fresh crop answer', () => {
      const session = {
        ...base,
        state: STATES.WAITING_FOR_CROP_CONFIRMATION,
        pendingCropCandidates: ['soybean'],
      };
      const message = cropText('ऊस', { declaredCrop: 'sugarcane', reason: 'SUCCESS' });

      const result = processFlow(session, message, oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_SOWING_DATE);
      expect(result.updatedSessionData.declaredCrop).toBe('sugarcane');
    });

    it('should return MULTIPLE_CROPS and stay put when there is nothing to offer', () => {
      const session = { ...base, state: STATES.WAITING_FOR_CROP, language: LANGUAGES.EN };
      const message = cropText('fake text', { reason: 'MULTIPLE_CROPS_DETECTED' });

      const result = processFlow(session, message, oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_CROP);
      expect(result.replyText).toBe(DICTIONARY[LANGUAGES.EN].MULTIPLE_CROPS);
    });

    it('should return UNSUPPORTED_CROP for a name that matched nothing', () => {
      const session = { ...base, state: STATES.WAITING_FOR_CROP, language: LANGUAGES.HI };
      const message = cropText('fake text', { reason: 'UNSUPPORTED_CROP' });

      const result = processFlow(session, message, oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_CROP);
      expect(result.replyText).toBe(DICTIONARY[LANGUAGES.HI].UNSUPPORTED_CROP);
    });

    it('should accept a sowing date and hand over to the existing location step', () => {
      const session = { ...base, state: STATES.WAITING_FOR_SOWING_DATE };
      const now = new Date(2026, 5, 20);

      const result = processFlow(session, text('12/06/2026'), oneFarm, { gat: GAT_A, now });

      expect(result.nextState).toBe(STATES.WAITING_FOR_LOCATION);
      expect(result.updatedSessionData.sowingDate.getDate()).toBe(12);
      expect(result.updatedSessionData.sowingDate.getMonth()).toBe(5);
      expect(result.replyText).toBe(DICTIONARY[LANGUAGES.MR].ASK_LOCATION);
    });

    it('should refuse a sowing date in the future and say why', () => {
      const session = { ...base, state: STATES.WAITING_FOR_SOWING_DATE };
      const now = new Date(2026, 5, 20);

      const result = processFlow(session, text('30/06/2026'), oneFarm, { gat: GAT_A, now });

      expect(result.nextState).toBe(STATES.WAITING_FOR_SOWING_DATE);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].SOWING_DATE_FUTURE);
    });

    it('should re-ask an unreadable sowing date', () => {
      const session = { ...base, state: STATES.WAITING_FOR_SOWING_DATE };

      const result = processFlow(session, text('कधी तरी'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_SOWING_DATE);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].SOWING_DATE_UNPARSEABLE);
    });
  });

  describe('photo and location steps (unchanged by Phase 7)', () => {
    it('should transition WAITING_FOR_LOCATION -> WAITING_FOR_IMAGE when location received', () => {
      const session = { state: STATES.WAITING_FOR_LOCATION, language: LANGUAGES.HI };
      const locationData = { latitude: 19.123, longitude: 74.123, source: 'WHATSAPP' };

      const result = processFlow(session, { type: MESSAGE_TYPES.LOCATION, data: locationData });

      expect(result.nextState).toBe(STATES.WAITING_FOR_IMAGE);
      expect(result.updatedSessionData.location).toEqual(locationData);
      expect(result.replyText).toBe(DICTIONARY[LANGUAGES.HI].ASK_IMAGE);
    });

    it('should reject non-location messages in WAITING_FOR_LOCATION', () => {
      const session = { state: STATES.WAITING_FOR_LOCATION, language: LANGUAGES.EN };

      const result = processFlow(session, text('Here is my field'));

      expect(result.nextState).toBe(STATES.WAITING_FOR_LOCATION);
      expect(result.replyText).toBe(DICTIONARY[LANGUAGES.EN].ASK_LOCATION);
    });

    it('should transition WAITING_FOR_IMAGE -> READY_FOR_VALIDATION when image received', () => {
      const session = { state: STATES.WAITING_FOR_IMAGE, language: LANGUAGES.EN };
      const imageData = { url: 'https://img.com', mimeType: 'image/jpeg' };

      const result = processFlow(session, { type: MESSAGE_TYPES.IMAGE, data: imageData });

      expect(result.nextState).toBe(STATES.READY_FOR_VALIDATION);
      expect(result.updatedSessionData.image).toEqual(imageData);
      expect(result.replyText).toBe(DICTIONARY[LANGUAGES.EN].READY);
    });
  });

  describe('boundary planting', () => {
    it('should ask where the trees are once the type is given', () => {
      const session = {
        state: STATES.WAITING_FOR_PLANTING_TYPE,
        language: LANGUAGES.MR,
        selectedGatId: 'gatA',
      };

      const result = processFlow(session, text('सागवान'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_PLANTING_LOCATION);
      expect(result.updatedSessionData.plantingType).toBe('सागवान');
      expect(result.replyText).toBe(DICTIONARY[LANGUAGES.MR].ASK_PLANTING_LOCATION);
    });

    it('should ask the controller to save the planting and say it is not validated', () => {
      const session = {
        state: STATES.WAITING_FOR_PLANTING_LOCATION,
        language: LANGUAGES.MR,
        selectedGatId: 'gatA',
        plantingType: 'सागवान',
      };

      const result = processFlow(session, text('पूर्वेकडील बांध'), oneFarm, { gat: GAT_A });

      expect(result.nextState).toBe(STATES.WAITING_FOR_ACTION);
      expect(result.sideEffect).toEqual({
        type: 'CREATE_PLANTING',
        data: {
          gatId: 'gatA',
          plantingType: 'सागवान',
          locationText: 'पूर्वेकडील बांध',
          location: null,
        },
      });
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].PLANTING_INFO_ONLY);
    });

    it('should accept a shared pin as the approximate planting location', () => {
      const session = {
        state: STATES.WAITING_FOR_PLANTING_LOCATION,
        language: LANGUAGES.MR,
        selectedGatId: 'gatA',
        plantingType: 'बांबू',
      };
      const locationData = { latitude: 19.5, longitude: 74.5, source: 'WHATSAPP' };

      const result = processFlow(
        session,
        { type: MESSAGE_TYPES.LOCATION, data: locationData },
        oneFarm,
        { gat: GAT_A },
      );

      expect(result.sideEffect.data.location).toEqual(locationData);
      expect(result.sideEffect.data.locationText).toBe('19.5, 74.5');
    });

    it('should never route a planting through the validation gate', () => {
      const session = {
        state: STATES.WAITING_FOR_PLANTING_LOCATION,
        language: LANGUAGES.MR,
        selectedGatId: 'gatA',
        plantingType: 'आंबा',
      };

      const result = processFlow(session, text('रस्त्याच्या कडेला'), oneFarm, { gat: GAT_A });

      expect(result.nextState).not.toBe(STATES.READY_FOR_VALIDATION);
      expect(result.nextState).not.toBe(STATES.VALIDATING);
    });
  });

  describe('robustness', () => {
    it('should restart the flow if a farmer sends "start" mid-form', () => {
      const session = { state: STATES.WAITING_FOR_IMAGE, language: LANGUAGES.MR };

      const result = processFlow(session, text('start'), oneFarm);

      expect(result.nextState).toBe(STATES.WAITING_FOR_ACTION);
      expect(result.replyText).toContain(DICTIONARY[LANGUAGES.MR].WELCOME);
    });

    it('should handle UNKNOWN messages robustly in any state', () => {
      const session = { state: STATES.WAITING_FOR_LOCATION, language: LANGUAGES.EN };

      const result = processFlow(session, { type: MESSAGE_TYPES.UNKNOWN, data: null });

      expect(result.nextState).toBe(STATES.WAITING_FOR_LOCATION);
      expect(result.replyText).toBe(DICTIONARY[LANGUAGES.EN].ERROR);
    });

    it('should treat a session left in the removed LANGUAGE_SELECTION state as a restart', () => {
      const session = { state: STATES.LANGUAGE_SELECTION, language: LANGUAGES.MR };

      const result = processFlow(session, text('1'), oneFarm);

      expect(result.nextState).toBe(STATES.WAITING_FOR_ACTION);
    });
  });
});
