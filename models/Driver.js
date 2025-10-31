const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full Name is required'],
    trim: true,
    minlength: [2, 'Full Name must be at least 2 characters long'],
    maxlength: [100, 'Full Name cannot exceed 100 characters']
  },
  licenseNumber: {
    type: String,
    required: [true, 'License Number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // Format: GJ07DL8932 (State Code + RTO Code + Series + Number)
        // 10-16 characters, only uppercase letters and digits
        return /^[A-Z0-9]{10,16}$/.test(v);
      },
      message: 'License Number must be 10-16 characters, only uppercase letters and digits (e.g., GJ07DL8932)'
    }
  },
  licenseExpiry: {
    type: Date,
    required: [true, 'License Expiry Date is required'],
    validate: {
      validator: function(v) {
        if (!v) return false;
        // License expiry must be today or in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(v);
        expiryDate.setHours(0, 0, 0, 0);
        return expiryDate >= today;
      },
      message: 'License Expiry Date must be today or a future date'
    }
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact Number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Must be exactly 10 digits, only numbers
        return /^[0-9]{10}$/.test(v);
      },
      message: 'Contact Number must be exactly 10 digits'
    }
  },
  assignedBus: {
    type: String,
    default: '',
    trim: true
  },
  availabilityStatus: {
    type: String,
    enum: {
      values: ['Available', 'Busy', 'On Leave', 'Suspended', 'Inactive'],
      message: 'Status must be Available, Busy, On Leave, Suspended, or Inactive'
    },
    default: 'Available'
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    minlength: [10, 'Address must be at least 10 characters long']
  },
  profilePhoto: {
    type: String,
    default: 'https://i.pravatar.cc/150'
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        // Must be at least 18 years old
        const age = (new Date() - v) / (365.25 * 24 * 60 * 60 * 1000);
        return age >= 18;
      },
      message: 'Driver must be at least 18 years old'
    }
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Optional field
          return /^[0-9]{10}$/.test(v);
        },
        message: 'Emergency contact phone must be exactly 10 digits'
      }
    },
    relationship: {
      type: String,
      trim: true
    }
  },
  experience: {
    type: Number,
    default: 0,
    min: [0, 'Experience cannot be negative']
  },
  salary: {
    type: Number,
    min: [0, 'Salary cannot be negative']
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  licenseExpiryWarning: {
    type: Boolean,
    default: false
  },
  lastStatusUpdate: {
    type: Date,
    default: Date.now
  },
  previousStatus: {
    type: String,
    enum: {
      values: ['Available', 'Busy', 'On Leave', 'Suspended', 'Inactive'],
      message: 'Previous status must be Available, Busy, On Leave, Suspended, or Inactive'
    },
    default: 'Available'
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
driverSchema.virtual('isLicenseExpiringSoon').get(function() {
  if (!this.licenseExpiry) return false;
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.licenseExpiry <= thirtyDaysFromNow && this.licenseExpiry > new Date();
});

// Virtual for license expired
driverSchema.virtual('isLicenseExpired').get(function() {
  if (!this.licenseExpiry) return false;
  return this.licenseExpiry <= new Date();
});

// Pre-save middleware to automatically update status based on license expiry
driverSchema.pre('save', function(next) {
  const now = new Date();
  
  // Only run this logic if licenseExpiry is provided
  if (this.licenseExpiry) {
    // Check if license is expired
    if (this.licenseExpiry <= now) {
      // Store previous status before marking as inactive (only if not already inactive)
      if (this.availabilityStatus !== 'Inactive') {
        this.previousStatus = this.availabilityStatus;
      }
      this.availabilityStatus = 'Inactive';
      this.isActive = false;
      this.lastStatusUpdate = now;
    } else {
      // License is valid - restore previous status if currently inactive due to expiry
      if (this.availabilityStatus === 'Inactive' && this.previousStatus && this.previousStatus !== 'Inactive') {
        this.availabilityStatus = this.previousStatus;
        this.isActive = true;
        this.lastStatusUpdate = now;
        this.licenseExpiryWarning = false;
      }
    }
    
    // Check if license is expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    if (this.licenseExpiry <= thirtyDaysFromNow && this.licenseExpiry > now) {
      this.licenseExpiryWarning = true;
    } else {
      this.licenseExpiryWarning = false;
    }
  }
  
  next();
});

// Static method to check and update expired licenses
driverSchema.statics.updateExpiredLicenses = async function() {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  // Update expired licenses to Inactive
  const expiredResult = await this.updateMany(
    {
      licenseExpiry: { $lte: now },
      availabilityStatus: { $ne: 'Inactive' }
    },
    [
      {
        $set: {
          previousStatus: '$availabilityStatus',
          availabilityStatus: 'Inactive',
          isActive: false,
          lastStatusUpdate: now
        }
      }
    ]
  );
  
  // Set warning flag for licenses expiring within 30 days
  await this.updateMany(
    {
      licenseExpiry: { $lte: thirtyDaysFromNow, $gt: now },
      licenseExpiryWarning: false
    },
    {
      $set: {
        licenseExpiryWarning: true
      }
    }
  );
  
  // Remove warning flag for licenses not expiring within 30 days
  await this.updateMany(
    {
      licenseExpiry: { $gt: thirtyDaysFromNow },
      licenseExpiryWarning: true
    },
    {
      $set: {
        licenseExpiryWarning: false
      }
    }
  );
  
  return expiredResult;
};

// Static method to get drivers with expiring licenses
driverSchema.statics.getDriversWithExpiringLicenses = async function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return await this.find({
    licenseExpiry: { $lte: thirtyDaysFromNow, $gt: new Date() },
    isActive: true
  });
};

// Static method to get expired drivers
driverSchema.statics.getExpiredDrivers = async function() {
  return await this.find({
    licenseExpiry: { $lte: new Date() },
    isActive: true
  });
};

// Static method to restore drivers with renewed licenses
driverSchema.statics.restoreRenewedDrivers = async function() {
  const now = new Date();
  
  const result = await this.updateMany(
    {
      licenseExpiry: { $gt: now },
      availabilityStatus: 'Inactive',
      previousStatus: { $exists: true, $ne: 'Inactive' }
    },
    [
      {
        $set: {
          availabilityStatus: '$previousStatus',
          isActive: true,
          lastStatusUpdate: now,
          licenseExpiryWarning: false
        }
      }
    ]
  );
  
  return result;
};

module.exports = mongoose.model('Driver', driverSchema);
