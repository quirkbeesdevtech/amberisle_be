const express = require('express');
const router = express.Router();
const BusSchedule = require('../models/BusSchedule');
const Bus = require('../models/Bus');
const { searchBuses, getAvailableSchedules, getPopularRoutes } = require('../controllers/busScheduleController');

// Public routes - no authentication required for users

// Search buses by from, to, and date
router.get('/search', searchBuses);

// Get available schedules
router.get('/available', getAvailableSchedules);

// Get popular routes
router.get('/popular-routes', getPopularRoutes);

// Get schedule details by ID (public)
router.get('/schedule/:id', async (req, res) => {
  try {
    const schedule = await BusSchedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Get bus details if needed
    const bus = await Bus.findOne({ busNumber: schedule.busNumber });
    
    res.json({
      schedule,
      bus: bus || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
