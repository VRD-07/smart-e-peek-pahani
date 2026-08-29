const env = require('../../config/env');
const { NOTIFICATION_TYPES } = require('./constants');

/**
 * Pre-recorded Marathi audio for the voice rung of the escalation ladder.
 *
 * `<Play>` of a real recording, not `<Say>` text-to-speech. Twilio's TTS has no
 * Marathi voice at all — the nearest it offers is Hindi, which mispronounces
 * Marathi badly enough that a farmer would not reliably understand a date or a
 * Gat number. A short human recording per message type is both clearer and
 * cheaper than trying to make TTS work.
 *
 * DEMO ASSETS: the .wav files in assets/voice/ are generated placeholder tones,
 * NOT Marathi speech. See assets/voice/README.md. `script` below is the Marathi
 * text each file is a stand-in for, so a real recording can be dropped in without
 * touching this code.
 */
const VOICE_ASSETS = {
  [NOTIFICATION_TYPES.DEADLINE_REMINDER]: {
    file: 'reminder-mr.mp3',
    script: 'नमस्कार. ई-पीक पाहणी नोंदणीची अंतिम तारीख जवळ आली आहे. '
      + 'या हंगामात तुमच्या पिकाची नोंद आमच्याकडे दिसत नाही. '
      + 'नोंद करण्यासाठी आमच्या व्हॉट्सअ‍ॅप क्रमांकावर हाय असा संदेश पाठवा. धन्यवाद.',
  },
  [NOTIFICATION_TYPES.CALAMITY_RELIEF]: {
    file: 'calamity-relief-mr.wav',
    script: 'नमस्कार. तुमच्या नोंदणीकृत शेताच्या भागासाठी नैसर्गिक आपत्ती जाहीर झाली आहे. '
      + 'तुमची पडताळणी झालेली पीक नोंद नुकसान भरपाईच्या तपासणीसाठी वापरली जाऊ शकते. '
      + 'कृपया तुमच्या गावातील तलाठ्यांशी संपर्क साधा. '
      + 'ही मंजुरी नाही — पात्रता महसूल कार्यालय ठरवते.',
  },
  [NOTIFICATION_TYPES.SUBMISSION_REVIEW]: {
    file: 'submission-review-mr.wav',
    script: 'नमस्कार. तुमची पीक नोंद आम्हाला मिळाली आहे, पण ती अधिकाऱ्यांच्या तपासणीसाठी पाठवली आहे. '
      + 'तुमची नोंद रद्द झालेली नाही. कृपया पुन्हा नोंद करू नका. '
      + 'तपासणी पूर्ण झाल्यावर तुम्हाला कळवले जाईल.',
  },
};

/**
 * Public URL Twilio should fetch the recording from.
 *
 * Twilio's media fetcher lives on the internet, so localhost will not do — the
 * demo needs VOICE_AUDIO_BASE_URL pointing at a tunnel or a deployed host. When
 * it is unset we return null and the TwiML falls back to speech, rather than
 * handing Twilio a URL it cannot resolve and getting a silent call.
 */
function audioUrlFor(type) {
  const asset = VOICE_ASSETS[type];
  if (!asset) return null;

  const base = env.voiceAudioBaseUrl;
  if (!base) return null;

  return `${base.replace(/\/+$/, '')}/${asset.file}`;
}

/** Escapes the five XML entities so a script with punctuation cannot break TwiML. */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * TwiML for one outbound reminder call.
 *
 * Plays the recording twice with a pause between: a farmer who picks up mid-first
 * sentence still hears the whole message, which matters more on a call than in
 * text because there is no scrolling back.
 *
 * The `<Say>` branch is a degraded fallback for when no recording is hosted yet.
 * It is marked hi-IN because Twilio has no Marathi voice; the text stays Marathi,
 * so it will be accented and imperfect. That is a stopgap, not the intended path.
 */
function buildVoiceTwiml(type) {
  const asset = VOICE_ASSETS[type];
  if (!asset) return null;

  const url = audioUrlFor(type);

  if (url) {
    return '<?xml version="1.0" encoding="UTF-8"?>'
      + '<Response>'
      + `<Play>${escapeXml(url)}</Play>`
      + '<Pause length="1"/>'
      + `<Play>${escapeXml(url)}</Play>`
      + '</Response>';
  }

  return '<?xml version="1.0" encoding="UTF-8"?>'
    + '<Response>'
    + `<Say language="hi-IN">${escapeXml(asset.script)}</Say>`
    + '</Response>';
}

module.exports = {
  VOICE_ASSETS,
  audioUrlFor,
  buildVoiceTwiml,
  escapeXml,
};
