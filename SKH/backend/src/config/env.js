require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
  // Outbound WhatsApp notifications (deadline reminders, awareness intros).
  // Defaults to 'mock' so the awareness job is demoable without live credentials.
  notificationProvider: process.env.NOTIFICATION_PROVIDER || 'mock',
  // Cron expression for the awareness reminder job. Defaults to 08:00 daily.
  awarenessCron: process.env.AWARENESS_CRON || '0 8 * * *',
  geminiApiKey: process.env.GEMINI_API_KEY,
  visionProvider: process.env.VISION_PROVIDER || 'mock',
  storageProvider: process.env.STORAGE_PROVIDER || 'cloudinary',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  nodeEnv: process.env.NODE_ENV || 'development'
};
