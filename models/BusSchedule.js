const mongoose = require('mongoose');

const busScheduleSchema = new mongoose.Schema({
  busNumber: {
    type: String,
    required: true,
    trim: true
  },
  route: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  departure: {
    type: String,
    required: true,
    trim: true
  },
  arrival: {
    type: String,
    required: true,
    trim: true
  },
  driver: {
    type: String,
    required: true,
    trim: true
  },
  fare: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Scheduled'
  },
  availableSeats: {
    type: Number,
    default: 0
  },
  totalSeats: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
busScheduleSchema.index({ busNumber: 1, date: 1 });
busScheduleSchema.index({ route: 1, date: 1 });

module.exports = mongoose.model('BusSchedule', busScheduleSchema);