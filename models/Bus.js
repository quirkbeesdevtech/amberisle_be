const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  busType: {
    type: String,
    required: true,
    enum: ['AC', 'Non-AC', 'Sleeper', 'Seater']
  },
  driver: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Maintenance'],
    default: 'Active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Bus', busSchema);
