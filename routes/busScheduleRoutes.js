const express = require('express');
const router = express.Router();
const {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedulesByBus,
  getSchedulesByRoute
} = require('../controllers/busScheduleController');

// Get all schedules
router.get('/', getSchedules);

// Get schedule by ID
router.get('/:id', getScheduleById);

// Create new schedule
router.post('/', createSchedule);

// Update schedule
router.put('/:id', updateSchedule);

// Delete schedule
router.delete('/:id', deleteSchedule);

// Get schedules by bus number
router.get('/bus/:busNumber', getSchedulesByBus);

// Get schedules by route
router.get('/route/:route', getSchedulesByRoute);

module.exports = router;