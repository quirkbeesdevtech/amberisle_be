const Driver = require('../models/Driver');
const path = require('path');
const fs = require('fs');

// Get all drivers
exports.getDrivers = async (req, res) => {
  try {
    // First, update any expired licenses
    await Driver.updateExpiredLicenses();
    
    // Then, restore drivers with renewed licenses
    await Driver.restoreRenewedDrivers();
    
    // Then fetch all drivers
    const drivers = await Driver.find().sort({ fullName: 1 });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get existing contact numbers (for validation help)
exports.getExistingContactNumbers = async (req, res) => {
  try {
    const drivers = await Driver.find({}, 'contactNumber fullName');
    const contactNumbers = drivers.map(driver => ({
      contactNumber: driver.contactNumber,
      fullName: driver.fullName
    }));
    res.json(contactNumbers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get driver by ID
exports.getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new driver
exports.createDriver = async (req, res) => {
  try {
    console.log('Creating driver with data:', req.body);
    const { licenseNumber, contactNumber } = req.body;

    // Enforce: profile photo can ONLY be set via upload endpoint
    if (req.body.profilePhoto) {
      delete req.body.profilePhoto;
    }
    
    // Check for duplicate license number
    let existingDriver = await Driver.findOne({ licenseNumber });
    if (existingDriver) {
      return res.status(400).json({ error: 'Driver with this license number already exists.' });
    }
    
    // Check for duplicate contact number
    existingDriver = await Driver.findOne({ contactNumber });
    if (existingDriver) {
      return res.status(400).json({ 
        error: `Driver with contact number ${contactNumber} already exists. Please use a different contact number.` 
      });
    }

    const driver = new Driver(req.body);
    await driver.save();
    res.status(201).json(driver);
  } catch (err) {
    console.error('Error creating driver:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      console.error('Validation errors:', errors);
      return res.status(400).json({ error: errors.join(', ') });
    }
    res.status(400).json({ error: err.message });
  }
};

// Update driver
exports.updateDriver = async (req, res) => {
  try {
    const { licenseNumber, contactNumber } = req.body;

    // Enforce: profile photo can ONLY be set via upload endpoint
    if (req.body.profilePhoto) {
      delete req.body.profilePhoto;
    }
    
    // Check for duplicate license number
    if (licenseNumber) {
      const existingDriver = await Driver.findOne({ 
        licenseNumber,
        _id: { $ne: req.params.id }
      });
      if (existingDriver) {
        return res.status(400).json({ error: 'Driver with this license number already exists.' });
      }
    }
    
    // Check for duplicate contact number
    if (contactNumber) {
      const existingDriver = await Driver.findOne({ 
        contactNumber,
        _id: { $ne: req.params.id }
      });
      if (existingDriver) {
        return res.status(400).json({ error: 'Driver with this contact number already exists.' });
      }
    }

    // Get the current driver before updating
    const currentDriver = await Driver.findById(req.params.id);
    if (!currentDriver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Check if license expiry was updated to a future date and restore status if needed
    if (req.body.licenseExpiry) {
      const newExpiryDate = new Date(req.body.licenseExpiry);
      const now = new Date();
      
      console.log('License expiry update check:', {
        driverId: driver._id,
        newExpiryDate,
        currentStatus: driver.availabilityStatus,
        previousStatus: driver.previousStatus,
        isFutureDate: newExpiryDate > now
      });
      
      // If new expiry date is in the future and driver was inactive due to expiry
      if (newExpiryDate > now && driver.availabilityStatus === 'Inactive' && driver.previousStatus && driver.previousStatus !== 'Inactive') {
        console.log('Restoring driver status from', driver.availabilityStatus, 'to', driver.previousStatus);
        driver.availabilityStatus = driver.previousStatus;
        driver.isActive = true;
        driver.lastStatusUpdate = now;
        driver.licenseExpiryWarning = false;
        await driver.save();
        console.log('Driver status restored successfully');
      }
    }

    res.json(driver);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    res.status(400).json({ error: err.message });
  }
};

// Delete driver
exports.deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ message: 'Driver deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get drivers by availability status
exports.getDriversByStatus = async (req, res) => {
  try {
    const drivers = await Driver.find({ availabilityStatus: req.params.status });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get available drivers (only by availability status)
exports.getAvailableDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find({ 
      availabilityStatus: 'Available'
    });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get drivers with expiring licenses (within 30 days)
exports.getDriversWithExpiringLicenses = async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const drivers = await Driver.find({
      licenseExpiry: { $lte: thirtyDaysFromNow }
    });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Assign driver to bus
exports.assignDriverToBus = async (req, res) => {
  try {
    const { driverId, busNumber } = req.body;
    
    // Check if driver exists
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Check if driver is available
    if (driver.availabilityStatus !== 'Available') {
      return res.status(400).json({ error: 'Driver is not available for assignment' });
    }

    // Update driver assignment
    driver.assignedBus = busNumber;
    driver.availabilityStatus = 'Busy';
    await driver.save();

    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Unassign driver from bus
exports.unassignDriverFromBus = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    driver.assignedBus = '';
    driver.availabilityStatus = 'Available';
    await driver.save();

    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get driver statistics
exports.getDriverStats = async (req, res) => {
  try {
    const totalDrivers = await Driver.countDocuments();
    const availableDrivers = await Driver.countDocuments({ availabilityStatus: 'Available' });
    const busyDrivers = await Driver.countDocuments({ availabilityStatus: 'Busy' });
    const onLeaveDrivers = await Driver.countDocuments({ availabilityStatus: 'On Leave' });
    const suspendedDrivers = await Driver.countDocuments({ availabilityStatus: 'Suspended' });
    const inactiveDrivers = await Driver.countDocuments({ availabilityStatus: 'Inactive' });
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringLicenses = await Driver.countDocuments({
      licenseExpiry: { $lte: thirtyDaysFromNow, $gt: new Date() },
      isActive: true
    });
    
    const expiredLicenses = await Driver.countDocuments({
      licenseExpiry: { $lte: new Date() },
      isActive: true
    });

    res.json({
      totalDrivers,
      availableDrivers,
      busyDrivers,
      onLeaveDrivers,
      suspendedDrivers,
      inactiveDrivers,
      expiringLicenses,
      expiredLicenses
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update expired licenses (for cron job)
exports.updateExpiredLicenses = async (req, res) => {
  try {
    const result = await Driver.updateExpiredLicenses();
    res.json({
      message: 'License expiry check completed',
      expiredCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Manual check and update expired licenses (for testing)
exports.checkExpiredLicenses = async (req, res) => {
  try {
    const now = new Date();
    console.log('Current date:', now);
    
    // Get all drivers with expired licenses (regardless of current status)
    const expiredDrivers = await Driver.find({
      licenseExpiry: { $lte: now }
    });
    
    console.log('Found expired drivers:', expiredDrivers.length);
    
    // Update expired licenses
    const result = await Driver.updateExpiredLicenses();
    
    // Restore drivers with renewed licenses
    const restoreResult = await Driver.restoreRenewedDrivers();
    
    // Get updated drivers
    const updatedDrivers = await Driver.find({
      licenseExpiry: { $lte: now }
    });
    
    res.json({
      message: 'License expiry check completed',
      expiredCount: result.modifiedCount,
      totalExpiredDrivers: expiredDrivers.length,
      restoredCount: restoreResult.modifiedCount,
      expiredDrivers: expiredDrivers.map(d => ({
        name: d.fullName,
        licenseNumber: d.licenseNumber,
        expiryDate: d.licenseExpiry,
        status: d.availabilityStatus
      })),
      updatedDrivers: updatedDrivers.map(d => ({
        name: d.fullName,
        licenseNumber: d.licenseNumber,
        expiryDate: d.licenseExpiry,
        status: d.availabilityStatus
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get drivers with expiring licenses (within 30 days)
exports.getDriversWithExpiringLicenses = async (req, res) => {
  try {
    const drivers = await Driver.getDriversWithExpiringLicenses();
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get expired drivers
exports.getExpiredDrivers = async (req, res) => {
  try {
    const drivers = await Driver.getExpiredDrivers();
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reactivate driver (when license is renewed)
exports.reactivateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { newLicenseExpiry } = req.body;
    
    if (!newLicenseExpiry || new Date(newLicenseExpiry) <= new Date()) {
      return res.status(400).json({ error: 'New license expiry date must be a future date' });
    }
    
    const driver = await Driver.findByIdAndUpdate(
      id,
      {
        licenseExpiry: newLicenseExpiry,
        availabilityStatus: 'Available',
        isActive: true,
        licenseExpiryWarning: false,
        lastStatusUpdate: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    res.json(driver);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Upload driver photo
exports.uploadDriverPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { driverId } = req.params;
    
    // Check if driver exists
    const driver = await Driver.findById(driverId);
    if (!driver) {
      // Delete the uploaded file if driver doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Delete old photo if it exists and is not the default one
    if (driver.profilePhoto && !driver.profilePhoto.includes('pravatar.cc') && !driver.profilePhoto.startsWith('http')) {
      const oldPhotoPath = path.join(__dirname, '../uploads', path.basename(driver.profilePhoto));
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update driver with new photo path
    const photoUrl = `/uploads/${req.file.filename}`;
    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      { profilePhoto: photoUrl },
      { new: true, runValidators: false }
    );

    res.json({
      message: 'Photo uploaded successfully',
      photoUrl: photoUrl,
      driver: updatedDriver
    });
  } catch (err) {
    // Delete the uploaded file if there's an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message });
  }
};

// Delete driver photo
exports.deleteDriverPhoto = async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Delete photo file if it exists and is not the default one
    if (driver.profilePhoto && !driver.profilePhoto.includes('pravatar.cc') && !driver.profilePhoto.startsWith('http')) {
      const photoPath = path.join(__dirname, '../uploads', path.basename(driver.profilePhoto));
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    // Reset to default photo
    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      { profilePhoto: 'https://i.pravatar.cc/150' },
      { new: true, runValidators: false }
    );

    res.json({
      message: 'Photo deleted successfully',
      driver: updatedDriver
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
