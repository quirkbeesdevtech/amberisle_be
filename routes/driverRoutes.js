const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  getDriversByStatus,
  getAvailableDrivers,
  getDriversWithExpiringLicenses,
  getExpiredDrivers,
  assignDriverToBus,
  unassignDriverFromBus,
  getDriverStats,
  updateExpiredLicenses,
  reactivateDriver,
  getExistingContactNumbers,
  uploadDriverPhoto,
  deleteDriverPhoto
} = require('../controllers/driverController');

// Get all drivers
router.get('/', getDrivers);

// Get existing contact numbers
router.get('/existing-contacts', getExistingContactNumbers);

// Get driver statistics
router.get('/stats', getDriverStats);

// Get available drivers
router.get('/available', getAvailableDrivers);

// Get drivers with expiring licenses
router.get('/expiring-licenses', getDriversWithExpiringLicenses);

// Get expired drivers
router.get('/expired', getExpiredDrivers);

// Get drivers by status
router.get('/status/:status', getDriversByStatus);

// Get driver by ID
router.get('/:id', getDriverById);

// Create new driver
router.post('/', createDriver);

// Assign driver to bus
router.post('/assign', assignDriverToBus);

// Update expired licenses (for cron job)
router.post('/update-expired-licenses', updateExpiredLicenses);

// Update driver
router.put('/:id', updateDriver);

// Unassign driver from bus
router.put('/:id/unassign', unassignDriverFromBus);

// Reactivate driver (when license is renewed)
router.put('/:id/reactivate', reactivateDriver);

// Upload driver photo
router.post('/:driverId/upload-photo', upload.single('photo'), uploadDriverPhoto);

// Delete driver photo
router.delete('/:driverId/photo', deleteDriverPhoto);

// Delete driver
router.delete('/:id', deleteDriver);

module.exports = router;
