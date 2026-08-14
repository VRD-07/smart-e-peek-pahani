const express = require('express');
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

// Connect to database
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: env.frontendUrl,
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

// Health check endpoint
app.get('/api/health', (req, res) => {
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

// Error Handling Middleware
app.use(errorHandler);

const PORT = env.port || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
