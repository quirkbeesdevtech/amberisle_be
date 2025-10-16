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