const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  licenseExpiry: {
    type: Date,
    required: true
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
    match: [/^[0-9+\-\s()]+$/, 'Please enter a valid contact number']
  },
  assignedBus: {
    type: String,
    default: '',
    trim: true
  },
  availabilityStatus: {
    type: String,
    enum: ['Available', 'Busy', 'On Leave', 'Suspended'],
    default: 'Available'
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  dateOfBirth: {
    type: Date
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    }
  },
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  salary: {
    type: Number,
    min: 0
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
driverSchema.index({ licenseNumber: 1 });
driverSchema.index({ contactNumber: 1 });
driverSchema.index({ availabilityStatus: 1 });
driverSchema.index({ assignedBus: 1 });

// Virtual for license expiry warning (30 days before expiry)
driverSchema.virtual('licenseExpiryWarning').get(function() {
  if (!this.licenseExpiry) return false;
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.licenseExpiry <= thirtyDaysFromNow;
});

// Virtual for license expired
driverSchema.virtual('licenseExpired').get(function() {
  if (!this.licenseExpiry) return false;
  return this.licenseExpiry <= new Date();
});

module.exports = mongoose.model('Driver', driverSchema);
