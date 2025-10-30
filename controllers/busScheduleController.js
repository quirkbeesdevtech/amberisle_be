const BusSchedule = require('../models/BusSchedule');

// Get all bus schedules
exports.getSchedules = async (req, res) => {
  try {
    const schedules = await BusSchedule.find().sort({ date: 1, departure: 1 });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get schedule by ID
exports.getScheduleById = async (req, res) => {
  try {
    const schedule = await BusSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new bus schedule
exports.createSchedule = async (req, res) => {
  try {
    const schedule = new BusSchedule(req.body);
    await schedule.save();
    res.status(201).json(schedule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update bus schedule
exports.updateSchedule = async (req, res) => {
  try {
    const schedule = await BusSchedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json(schedule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete bus schedule
exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await BusSchedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get schedules by bus number
exports.getSchedulesByBus = async (req, res) => {
  try {
    const schedules = await BusSchedule.find({ busNumber: req.params.busNumber });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get schedules by route
exports.getSchedulesByRoute = async (req, res) => {
  try {
    const schedules = await BusSchedule.find({ route: req.params.route });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Search buses by from, to, and date (Public endpoint for users)
exports.searchBuses = async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({ 
        error: 'Please provide from, to, and date parameters' 
      });
    }

    // Build search query
    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);
    const endDate = new Date(searchDate);
    endDate.setHours(23, 59, 59, 999);

    // Search for routes that contain both from and to locations
    const routePattern = new RegExp(`${from}.*${to}|${to}.*${from}`, 'i');
    
    const schedules = await BusSchedule.find({
      route: routePattern,
      date: {
        $gte: searchDate,
        $lte: endDate
      },
      status: { $ne: 'Cancelled' },
      availableSeats: { $gt: 0 }
    })
      .sort({ date: 1, departure: 1 });

    res.json({ 
      count: schedules.length,
      schedules 
    });
  } catch (err) {
    console.error('Search buses error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get available schedules with bus details (Public endpoint for users)
exports.getAvailableSchedules = async (req, res) => {
  try {
    const { from, to, date } = req.query;

    // Build query
    const query = {
      status: { $ne: 'Cancelled' },
      availableSeats: { $gt: 0 }
    };

    if (from && to) {
      const routePattern = new RegExp(`${from}.*${to}|${to}.*${from}`, 'i');
      query.route = routePattern;
    }

    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      const endDate = new Date(searchDate);
      endDate.setHours(23, 59, 59, 999);
      query.date = {
        $gte: searchDate,
        $lte: endDate
      };
    }

    const schedules = await BusSchedule.find(query)
      .sort({ date: 1, departure: 1 })
      .limit(50);

    res.json({ 
      count: schedules.length,
      schedules 
    });
  } catch (err) {
    console.error('Get available schedules error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get popular routes (Public endpoint for users)
exports.getPopularRoutes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get routes with most bookings in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const Booking = require('../models/Booking');
    
    const popularRoutes = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          bookingStatus: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: { from: '$from', to: '$to' },
          count: { $sum: 1 },
          lowestPrice: { $min: '$totalAmount' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: limit
      },
      {
        $project: {
          _id: 0,
          from: '$_id.from',
          to: '$_id.to',
          route: { $concat: ['$_id.from', ' → ', '$_id.to'] },
          bookingCount: '$count',
          startingPrice: '$lowestPrice'
        }
      }
    ]);

    res.json({ 
      count: popularRoutes.length,
      routes: popularRoutes 
    });
  } catch (err) {
    console.error('Get popular routes error:', err);
    res.status(500).json({ error: err.message });
  }
};