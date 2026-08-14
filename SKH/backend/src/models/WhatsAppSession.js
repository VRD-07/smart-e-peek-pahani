const mongoose = require('mongoose');

const whatsappSessionSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    index: true,
  },
  state: {
    type: String,
    enum: [
      'START', 'LANGUAGE_SELECTION', 'WAITING_FOR_GAT_SELECTION', 'WAITING_FOR_CROP',
      'WAITING_FOR_LOCATION', 'WAITING_FOR_IMAGE', 'READY_FOR_VALIDATION',
      'VALIDATING', 'COMPLETED', 'FAILED'
    ],
    default: 'START',
  },
  language: {
    type: String,
    enum: ['mr', 'hi', 'en'],
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
  },
  selectedGatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gat',
  },
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
  },
  declaredCrop: {
    type: String,
  },
  location: {
    latitude: Number,
    longitude: Number,
  },
  image: {
    url: String,
    mimeType: String,
    size: Number,
  },
  expiresAt: {
    type: Date,
    default: () => Date.now() + 24 * 60 * 60 * 1000, // Expires in 24 hours
  },
}, {
  timestamps: true,
});

whatsappSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const WhatsAppSession = mongoose.model('WhatsAppSession', whatsappSessionSchema);
module.exports = WhatsAppSession;
