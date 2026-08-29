const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const errorHandler = require('./src/middleware/errorHandler');

// Import Routes
const farmerRoutes = require('./src/routes/farmerRoutes');
const gatRoutes = require('./src/routes/gatRoutes');
const submissionRoutes = require('./src/routes/submissionRoutes');
const validationRoutes = require('./src/routes/validationRoutes');
const whatsappRoutes = require('./src/routes/whatsappRoutes');
const authRoutes = require('./src/routes/authRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');

// Connect to database
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();

// Trust reverse proxy headers on Render/cloud hosts for rate limiting
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors({
  // In production, restrict to the configured frontend origin. During
  // development, allow any origin so local setups work out of the box.
  origin: env.nodeEnv === 'production' ? env.frontendUrl : true,
  credentials: true,
}));

// Standard JSON parser for API endpoints.
app.use(express.json({ limit: '10mb' }));
// URL-encoded parser for Twilio webhooks. The `verify` callback preserves the
// raw body so that validateTwilio middleware can reconstruct the Twilio request
// signature when real validation is enabled in production.
app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));

// Rate limiting — values configurable via env for production tuning.
const limiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: 100000,
  skip: (req) => process.env.NODE_ENV === 'test' || env.nodeEnv === 'test',
});
app.use('/api', limiter);

// Pre-recorded voice-call audio. Served outside /api because the fetcher is
// Twilio's media service, not a logged-in client, and it must not be rate limited
// alongside the app's own traffic.
//
// The resource policy is widened to cross-origin for this path only. The global
// helmet() above has already set same-origin, which would make Twilio's fetch
// fail, and passing `crossOriginResourcePolicy: false` here would merely skip
// re-setting it rather than overriding what is already on the response.
//
// Twilio fetches over the public internet, so this only works behind a tunnel or
// a deployed host — see VOICE_AUDIO_BASE_URL in .env.example.
app.use(
  '/assets/voice',
  helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }),
  express.static(path.join(__dirname, 'assets', 'voice'), {
    // The recordings change only when someone re-records them.
    maxAge: '1h',
  })
);

const { buildVoiceTwiml } = require('./src/services/notifications/voiceMessages');

// TwiML webhook endpoint for Twilio Voice calls.
// Twilio sends a POST request by default to fetch TwiML when placing a call.
app.all(['/assets/voice/twiml', '/api/voice/twiml'], (req, res) => {
  const type = req.query.type || req.body?.type || 'DEADLINE_REMINDER';
  const twiml = buildVoiceTwiml(type);
  if (!twiml) {
    return res.status(404).type('text/plain').send('Voice asset not found');
  }
  res.type('text/xml').send(twiml);
});

const { handleCheckSystemHealth } = require('./src/controllers/demoController');
const { startBackupJob } = require('./src/jobs/backupJob');

// System Integrity Health check endpoints
app.get(['/system_health', '/api/system_health', '/system-health', '/api/system-health'], handleCheckSystemHealth);

// Basic liveness check endpoints
app.get(['/', '/health', '/api', '/api/health'], (req, res) => {
  res.json({
    success: true,
    message: 'Smart E-Peek backend is running'
  });
});

const bridgeRoutes = require('./src/routes/bridgeRoutes');

// Routes
app.use('/api/farmers', farmerRoutes);
app.use('/api/gats', gatRoutes);
app.use('/api/submissions', submissionRoutes);
// Validation routes are nested under submissions or separate,
// specification said: POST /api/submissions/:id/validate
// So we mount validationRoutes on /api/submissions as well
app.use('/api/submissions', validationRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/bridge', bridgeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
const demoRoutes = require('./src/routes/demoRoutes');
app.use('/api/demo', demoRoutes);
app.use('/demo', demoRoutes);

// Error Handling Middleware
app.use(errorHandler);

const PORT = env.port || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Daily deadline-reminder sweep. Skipped under test so Jest does not hold an
  // open timer; run it manually with `node scripts/runAwarenessReminders.js`.
  const { startAwarenessJob } = require('./src/jobs/awarenessJob');
  startAwarenessJob();

  // Periodic database snapshot backup job for blackout resilience.
  startBackupJob();
}

module.exports = app;
