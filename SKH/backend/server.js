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

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors({
  origin: true,
  credentials: true,
}));

// We need raw body for Twilio signature validation if it was real,
// but for standard json we use express.json
// To support urlencoded for Twilio
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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

// Health check endpoints
app.get(['/', '/health', '/api/health'], (req, res) => {
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
}

module.exports = app;
