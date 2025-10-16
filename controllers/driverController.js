const Driver = require('../models/Driver');

// Get all drivers
exports.getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ fullName: 1 });
    res.json(drivers);
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
    // Check if license number already exists
    const existingDriver = await Driver.findOne({ licenseNumber: req.body.licenseNumber });
    if (existingDriver) {
      return res.status(400).json({ error: 'Driver with this license number already exists' });
    }

    const driver = new Driver(req.body);
    await driver.save();
    res.status(201).json(driver);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update driver
exports.updateDriver = async (req, res) => {
  try {
    // If updating license number, check for duplicates
    if (req.body.licenseNumber) {
      const existingDriver = await Driver.findOne({ 
        licenseNumber: req.body.licenseNumber,
        _id: { $ne: req.params.id }
      });
      if (existingDriver) {
        return res.status(400).json({ error: 'Driver with this license number already exists' });
      }
    }

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      req.body,
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

// Get available drivers (not assigned to any bus)
exports.getAvailableDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find({ 
      availabilityStatus: 'Available',
      assignedBus: { $in: ['', null] }
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
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringLicenses = await Driver.countDocuments({
      licenseExpiry: { $lte: thirtyDaysFromNow }
    });

    res.json({
      totalDrivers,
      availableDrivers,
      busyDrivers,
      onLeaveDrivers,
      suspendedDrivers,
      expiringLicenses
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
