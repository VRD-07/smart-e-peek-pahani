const mongoose = require('mongoose');

const webBridgeTokenSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  sessionId: {
    type: String,
    required: true
  },
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: false
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// TTL index to automatically remove expired documents from the DB
// Wait, the prompt says "If MongoDB TTL is used, do NOT rely exclusively on MongoDB TTL for security."
// TTL is fine as long as we also check expiresAt > now in code.
webBridgeTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('WebBridgeToken', webBridgeTokenSchema);
