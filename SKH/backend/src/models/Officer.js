const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const officerSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  jurisdiction: {
    district: {
      type: String,
      required: true,
    },
    // Gat currently stores village + district only, so administrative filtering
    // on the dashboard resolves by district/village. Taluka is carried here for
    // the state land-record hierarchy; production integration with Maharashtra
    // Bhulekh / 7-12 records requires a state MoU.
    taluka: {
      type: String,
    },
  },
  role: {
    type: String,
    enum: ['officer'],
    default: 'officer',
  },
}, {
  timestamps: true,
});

officerSchema.methods.verifyPassword = function (plainPassword) {
  if (!plainPassword) return Promise.resolve(false);
  return bcrypt.compare(plainPassword.toString(), this.passwordHash);
};

const Officer = mongoose.model('Officer', officerSchema);
module.exports = Officer;
