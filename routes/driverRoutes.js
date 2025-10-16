const express = require('express');
const router = express.Router();
const {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  getDriversByStatus,
  getAvailableDrivers,
  getDriversWithExpiringLicenses,
  assignDriverToBus,
  unassignDriverFromBus,
  getDriverStats
} = require('../controllers/driverController');

// Get all drivers
router.get('/', getDrivers);

// Get driver statistics
router.get('/stats', getDriverStats);

// Get available drivers
router.get('/available', getAvailableDrivers);

// Get drivers with expiring licenses
router.get('/expiring-licenses', getDriversWithExpiringLicenses);

// Get drivers by status
router.get('/status/:status', getDriversByStatus);

// Get driver by ID
router.get('/:id', getDriverById);

// Create new driver
router.post('/', createDriver);

// Assign driver to bus
router.post('/assign', assignDriverToBus);

// Update driver
router.put('/:id', updateDriver);

// Unassign driver from bus
router.put('/:id/unassign', unassignDriverFromBus);

// Delete driver
router.delete('/:id', deleteDriver);

module.exports = router;
