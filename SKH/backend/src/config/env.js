require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
  // Separate senders per channel: the WhatsApp sandbox number cannot send SMS and
  // cannot place calls. Left unset, those two rungs of the escalation ladder
  // report SENDER_NOT_CONFIGURED instead of failing the whole notification.
  twilioSmsNumber: process.env.TWILIO_SMS_NUMBER,
  twilioVoiceNumber: process.env.TWILIO_VOICE_NUMBER,
  // Publicly reachable base URL for the pre-recorded voice files in assets/voice/.
  // Twilio fetches the audio itself, so localhost will not do — unset falls back
  // to <Say>, which has no Marathi voice and is a stopgap, not the intended path.
  voiceAudioBaseUrl: process.env.VOICE_AUDIO_BASE_URL,
  // How long to wait for a confirmation on a channel before escalating to the
  // next one. Config rather than constants so a demo can set both to 0 and walk
  // the whole ladder in a single sweep.
  escalationWhatsappWindowHours: process.env.ESCALATION_WHATSAPP_WINDOW_HOURS || '24',
  escalationSmsWindowHours: process.env.ESCALATION_SMS_WINDOW_HOURS || '24',
  // Whether a WhatsApp message must be *read* rather than merely delivered to
  // count as having reached the farmer. See whatsappRequiresRead() for the
  // trade-off — farmers with read receipts off are always escalated when true.
  escalationWhatsappRequireRead: process.env.ESCALATION_WHATSAPP_REQUIRE_READ || 'true',
  // Outbound WhatsApp notifications (deadline reminders, awareness intros).
  // Defaults to 'mock' so the awareness job is demoable without live credentials.
  notificationProvider: process.env.NOTIFICATION_PROVIDER || 'mock',
  // Cron expression for the awareness reminder job. Defaults to 08:00 daily.
  awarenessCron: process.env.AWARENESS_CRON || '0 8 * * *',
  geminiApiKey: process.env.GEMINI_API_KEY,
  visionProvider: process.env.VISION_PROVIDER || 'mock',
  // Marathi/Hindi/English voice entry for the crop step. Defaults to 'mock' so
  // the voice flow is demoable with no API key; 'gemini' reuses GEMINI_API_KEY.
  sttProvider: process.env.STT_PROVIDER || 'mock',
  // Below this confidence a transcript is not treated as a crop declaration and
  // the farmer is asked to type the name instead.
  sttMinConfidence: process.env.STT_MIN_CONFIDENCE || '0.70',
  // Submissions inside a Gat but within this many metres of its edge are routed
  // to human review instead of auto-approved. Capped by parcel size at runtime so
  // small plots are not put entirely under review.
  nearBoundaryThresholdMeters: process.env.NEAR_BOUNDARY_THRESHOLD_METERS || '15',
  storageProvider: process.env.STORAGE_PROVIDER || 'cloudinary',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  nodeEnv: process.env.NODE_ENV || 'development'
};
