const mongoose = require('mongoose');

const SystemMarkerSchema = new mongoose.Schema({
  markerKey: {
    type: String,
    required: true,
    unique: true,
    default: 'PRIMARY_SYSTEM_HEALTH'
  },
  status: {
    type: String,
    enum: ['HEALTHY', 'CORRUPTED', 'RESTORED'],
    default: 'HEALTHY'
  },
  lastHealthyCheck: {
    type: Date,
    default: Date.now
  },
  corruptedAt: {
    type: Date
  },
  lastBackupAt: {
    type: Date
  },
  lastRestoredAt: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('SystemMarker', SystemMarkerSchema);
