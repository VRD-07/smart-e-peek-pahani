const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const WhatsAppSession = require('../src/models/WhatsAppSession');
const whatsappRoutes = require('../src/routes/whatsappRoutes');
const { STATES, LANGUAGES } = require('../src/services/whatsapp/constants');
const { DICTIONARY } = require('../src/services/whatsapp/messages');

// processMedia really downloads the voice note to a temp file and returns a
// file:// URL. Keep the basename so the mock STT provider can still select the
// scenario from the URL, and so the cleanup assertions see a realistic path.
jest.mock('../src/services/whatsapp/mediaService', () => ({
  processMedia: jest.fn().mockImplementation((url, mimeType) => {
    const name = url.split('/').pop();
    return Promise.resolve({ url: `file:///tmp/${name}`, mimeType, size: 5000 });
  })
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  unlink: jest.fn((path, cb) => cb(null))
}));

jest.mock('../src/config/env', () => ({
  twilioAuthToken: 'mock_twilio_token',
  storageProvider: 'mock',
  jwtSecret: 'mock_jwt_secret',
  notificationProvider: 'mock',
}));

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/api/whatsapp', whatsappRoutes);

jest.setTimeout(60000);

// A Twilio voice-note webhook payload.
const voicePayload = (sender, scenario) => ({
  From: sender,
  NumMedia: '1',
  MediaUrl0: `http://example.com/${scenario}.ogg`,
  MediaContentType0: 'audio/ogg',
  MessageSid: `SM${scenario}${Date.now()}`
});

const postWebhook = (payload) => request(app).post('/api/whatsapp/webhook').send(payload);

describe('Marathi Voice-Assisted Crop Entry', () => {
  let mongoServer;

  beforeAll(async () => {
    process.env.STT_PROVIDER = 'mock';
    delete process.env.STT_MIN_CONFIDENCE;
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
    fs.unlink.mockClear();
  });

  const startAtCropStep = async (sender, language) => {
    await WhatsAppSession.create({
      phoneNumber: sender,
      state: STATES.WAITING_FOR_CROP,
      language
    });
  };

  describe('Speaking the crop instead of typing it', () => {
    it('1. should accept a Marathi voice note and advance to the sowing date step', async () => {
      const sender = 'whatsapp:+919000000001';
      await startAtCropStep(sender, LANGUAGES.MR);

      const res = await postWebhook(voicePayload(sender, 'marathi_soybean'));

      expect(res.status).toBe(200);
      expect(res.text).toContain(DICTIONARY[LANGUAGES.MR].ASK_SOWING_DATE);

      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.state).toBe(STATES.WAITING_FOR_SOWING_DATE);
      expect(session.declaredCrop).toBe('soybean');
    });

    it('2. should accept a Hindi voice note', async () => {
      const sender = 'whatsapp:+919000000002';
      await startAtCropStep(sender, LANGUAGES.HI);

      const res = await postWebhook(voicePayload(sender, 'hindi_cotton'));

      expect(res.text).toContain(DICTIONARY[LANGUAGES.HI].ASK_SOWING_DATE);
      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.declaredCrop).toBe('cotton');
    });

    it('3. should accept an English voice note', async () => {
      const sender = 'whatsapp:+919000000003';
      await startAtCropStep(sender, LANGUAGES.EN);

      const res = await postWebhook(voicePayload(sender, 'english_cotton'));

      expect(res.text).toContain(DICTIONARY[LANGUAGES.EN].ASK_SOWING_DATE);
      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.declaredCrop).toBe('cotton');
    });

    it('4. should store the same value a typed message would have stored', async () => {
      // Voice is an easier way in, not a looser one. Both channels land the same
      // canonical crop in the same field, and the validation engine downstream
      // cannot tell them apart — so neither channel is "the risky one".
      const spoken = 'whatsapp:+919000000004';
      const typed = 'whatsapp:+919000000005';
      await startAtCropStep(spoken, LANGUAGES.MR);
      await startAtCropStep(typed, LANGUAGES.MR);

      await postWebhook(voicePayload(spoken, 'marathi_soybean'));
      await postWebhook({ From: typed, Body: 'सोयाबीन' });

      const spokenSession = await WhatsAppSession.findOne({ phoneNumber: spoken });
      const typedSession = await WhatsAppSession.findOne({ phoneNumber: typed });

      expect(spokenSession.declaredCrop).toBe(typedSession.declaredCrop);
      expect(spokenSession.state).toBe(typedSession.state);
    });
  });

  describe('Low confidence falls back to typing', () => {
    it('5. should ask the farmer to type when it could not make out the crop confidently', async () => {
      const sender = 'whatsapp:+919000000006';
      await startAtCropStep(sender, LANGUAGES.MR);

      // The transcript behind this recording IS a valid crop name, heard at 0.31.
      // A guess would have been right here — and wrong the next time. The whole
      // point is that an uncertain hearing is never filed on the farmer's behalf.
      const res = await postWebhook(voicePayload(sender, 'lowconf'));

      expect(res.status).toBe(200);
      expect(res.text).toContain(DICTIONARY[LANGUAGES.MR].VOICE_UNCLEAR);

      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.state).toBe(STATES.WAITING_FOR_CROP);
      expect(session.declaredCrop).toBeUndefined();
    });

    it('6. should recover the filing when the farmer then types the crop', async () => {
      // This is the acceptance path for the whole phase: a failed voice note is
      // a detour, not a dead end. The farmer stays in the same session and the
      // filing continues from exactly where it stalled.
      const sender = 'whatsapp:+919000000007';
      await startAtCropStep(sender, LANGUAGES.MR);

      await postWebhook(voicePayload(sender, 'lowconf'));
      const res = await postWebhook({ From: sender, Body: 'सोयाबीन' });

      expect(res.text).toContain(DICTIONARY[LANGUAGES.MR].ASK_SOWING_DATE);

      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.state).toBe(STATES.WAITING_FOR_SOWING_DATE);
      expect(session.declaredCrop).toBe('soybean');
    });

    it('7. should let the farmer retry with a clearer voice note instead of typing', async () => {
      const sender = 'whatsapp:+919000000008';
      await startAtCropStep(sender, LANGUAGES.MR);

      await postWebhook(voicePayload(sender, 'lowconf'));
      const res = await postWebhook(voicePayload(sender, 'marathi_cotton'));

      expect(res.text).toContain(DICTIONARY[LANGUAGES.MR].ASK_SOWING_DATE);
      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.declaredCrop).toBe('cotton');
    });
  });

  describe('Telling the farmer what actually went wrong', () => {
    it('8. should own the failure when transcription itself broke', async () => {
      // Our fault, and the message says so. A farmer told they were unclear when
      // the outage was ours will keep re-recording a message that was fine.
      const sender = 'whatsapp:+919000000009';
      await startAtCropStep(sender, LANGUAGES.EN);

      const res = await postWebhook(voicePayload(sender, 'error'));

      expect(res.text).toContain(DICTIONARY[LANGUAGES.EN].VOICE_FAILED);
      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.state).toBe(STATES.WAITING_FOR_CROP);
    });

    it('9. should ask again when nothing was heard on the recording', async () => {
      const sender = 'whatsapp:+919000000010';
      await startAtCropStep(sender, LANGUAGES.EN);

      const res = await postWebhook(voicePayload(sender, 'empty'));

      expect(res.text).toContain(DICTIONARY[LANGUAGES.EN].VOICE_UNCLEAR);
    });

    it('10. should name the crops it can recognise when the spoken crop is not one', async () => {
      const sender = 'whatsapp:+919000000011';
      await startAtCropStep(sender, LANGUAGES.EN);

      const res = await postWebhook(voicePayload(sender, 'unclear'));

      expect(res.text).toContain(DICTIONARY[LANGUAGES.EN].UNSUPPORTED_CROP);
      expect(res.text).toContain('Soybean');
      expect(res.text).toContain('Cotton');
    });

    it('11. should ask for one crop when the farmer named several', async () => {
      const sender = 'whatsapp:+919000000012';
      await startAtCropStep(sender, LANGUAGES.EN);

      const res = await postWebhook(voicePayload(sender, 'english_multiple'));

      expect(res.text).toContain(DICTIONARY[LANGUAGES.EN].MULTIPLE_CROPS);
    });

    it.each([
      [LANGUAGES.MR],
      [LANGUAGES.HI],
      [LANGUAGES.EN],
    ])('12. should send the fallback in the session language (%s)', async (language) => {
      const sender = `whatsapp:+9190000001${language === LANGUAGES.MR ? 3 : language === LANGUAGES.HI ? 4 : 5}`;
      await startAtCropStep(sender, language);

      const res = await postWebhook(voicePayload(sender, 'lowconf'));

      expect(res.text).toContain(DICTIONARY[language].VOICE_UNCLEAR);
    });

    it.each([
      ['lowconf'],
      ['empty'],
      ['error'],
      ['unclear'],
      ['english_multiple'],
    ])('13. should never record a crop from a failed voice note (%s)', async (scenario) => {
      const sender = `whatsapp:+91900000${scenario.length}${scenario.charCodeAt(0)}`;
      await startAtCropStep(sender, LANGUAGES.EN);

      await postWebhook(voicePayload(sender, scenario));

      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.declaredCrop).toBeUndefined();
      const expectedState = scenario === 'english_multiple' ? STATES.WAITING_FOR_CROP_CONFIRMATION : STATES.WAITING_FOR_CROP;
      expect(session.state).toBe(expectedState);
    });
  });

  describe('The recording is not kept', () => {
    it('14. should delete the downloaded audio after transcribing it', async () => {
      // A voice note is a way of typing, not evidence. Unlike the crop photo it
      // is transcribed and thrown away — nothing downstream refers back to it.
      const sender = 'whatsapp:+919000000016';
      await startAtCropStep(sender, LANGUAGES.MR);

      await postWebhook(voicePayload(sender, 'marathi_soybean'));

      expect(fs.unlink).toHaveBeenCalledWith('/tmp/marathi_soybean.ogg', expect.any(Function));
    });

    it('15. should delete the downloaded audio even when transcription failed', async () => {
      const sender = 'whatsapp:+919000000017';
      await startAtCropStep(sender, LANGUAGES.EN);

      await postWebhook(voicePayload(sender, 'error'));

      expect(fs.unlink).toHaveBeenCalledWith('/tmp/error.ogg', expect.any(Function));
    });
  });

  describe('A voice note outside the crop step', () => {
    it('16. should not derail the flow when sent at the location step', async () => {
      const sender = 'whatsapp:+919000000018';
      await WhatsAppSession.create({
        phoneNumber: sender,
        state: STATES.WAITING_FOR_LOCATION,
        language: LANGUAGES.EN,
        declaredCrop: 'cotton'
      });

      const res = await postWebhook(voicePayload(sender, 'marathi_soybean'));

      expect(res.status).toBe(200);
      expect(res.text).toContain(DICTIONARY[LANGUAGES.EN].ASK_LOCATION);

      const session = await WhatsAppSession.findOne({ phoneNumber: sender });
      expect(session.state).toBe(STATES.WAITING_FOR_LOCATION);
      // The crop already on file is not overwritten by a stray recording.
      expect(session.declaredCrop).toBe('cotton');
    });
  });

  describe('Honest copy', () => {
    it('17. should not promise anything about the outcome of a filing', async () => {
      const forbidden = ['guarantee', 'guaranteed', '100%', 'fraud-proof', 'accurate',
        'perfect', 'will receive'];
      const keys = ['ASK_CROP', 'UNSUPPORTED_CROP', 'VOICE_UNCLEAR', 'VOICE_FAILED', 'MULTIPLE_CROPS'];

      for (const language of [LANGUAGES.MR, LANGUAGES.HI, LANGUAGES.EN]) {
        for (const key of keys) {
          const text = DICTIONARY[language][key].toLowerCase();
          for (const word of forbidden) {
            expect(text).not.toContain(word);
          }
        }
      }
    });

    it('18. should tell the farmer both entry options exist at the crop step', async () => {
      // A farmer who cannot type Devanagari on a feature phone has to be told
      // that speaking is allowed; the feature is worthless if it is invisible.
      expect(DICTIONARY[LANGUAGES.MR].ASK_CROP).toContain('व्हॉईस');
      expect(DICTIONARY[LANGUAGES.HI].ASK_CROP).toContain('वॉइस');
      expect(DICTIONARY[LANGUAGES.EN].ASK_CROP).toContain('voice message');
    });

    it('19. should point every voice failure back at the keyboard', async () => {
      expect(DICTIONARY[LANGUAGES.EN].VOICE_UNCLEAR).toContain('type the crop name');
      expect(DICTIONARY[LANGUAGES.EN].VOICE_FAILED).toContain('type the crop name');
      expect(DICTIONARY[LANGUAGES.MR].VOICE_UNCLEAR).toContain('टाइप करा');
      expect(DICTIONARY[LANGUAGES.MR].VOICE_FAILED).toContain('टाइप करा');
      expect(DICTIONARY[LANGUAGES.HI].VOICE_UNCLEAR).toContain('टाइप करें');
      expect(DICTIONARY[LANGUAGES.HI].VOICE_FAILED).toContain('टाइप करें');
    });
  });
});
