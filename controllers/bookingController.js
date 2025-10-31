const Booking = require('../models/Booking');
const BusSchedule = require('../models/BusSchedule');
const Bus = require('../models/Bus');

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const {
      scheduleId,
      passengers,
      contactEmail,
      contactPhone,
      paymentMethod
    } = req.body;

    // Verify schedule exists
    const schedule = await BusSchedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Verify bus exists
    const bus = await Bus.findOne({ busNumber: schedule.busNumber });
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    // Check if seats are available
    if (schedule.availableSeats < passengers.length) {
      return res.status(400).json({ 
        error: `Only ${schedule.availableSeats} seats available` 
      });
    }

    // Calculate total amount
    const totalAmount = schedule.fare * passengers.length;

    // Create booking
    const booking = new Booking({
      user: req.userId,
      schedule: scheduleId,
      bus: bus._id,
      from: schedule.route.split(' - ')[0] || schedule.route,
      to: schedule.route.split(' - ')[1] || schedule.route,
      travelDate: schedule.date,
      departureTime: schedule.departure,
      arrivalTime: schedule.arrival,
      passengers,
      totalAmount,
      contactEmail,
      contactPhone,
      paymentMethod: paymentMethod || 'Online'
    });

    await booking.save();

    // Update available seats
    schedule.availableSeats -= passengers.length;
    await schedule.save();

    // Populate booking details
    await booking.populate('schedule bus user');

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create booking' 
    });
  }
};

// Get all bookings for a user
exports.getUserBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { user: req.userId };
    
    if (status) {
      query.bookingStatus = status;
    }

    const bookings = await Booking.find(query)
      .populate('schedule bus')
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch bookings' 
    });
  }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('schedule bus user');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user owns this booking
    if (booking.user._id.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch booking' 
    });
  }
};

// Get booking by reference number
exports.getBookingByReference = async (req, res) => {
  try {
    const booking = await Booking.findOne({ 
      bookingReference: req.params.reference 
    })
      .populate('schedule bus user');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user owns this booking
    if (booking.user._id.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking by reference error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch booking' 
    });
  }
};

// Cancel a booking
exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('schedule');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (booking.bookingStatus === 'Cancelled') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    if (booking.bookingStatus === 'Completed') {
      return res.status(400).json({ error: 'Cannot cancel completed booking' });
    }

    // Update booking status
    booking.bookingStatus = 'Cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || 'Cancelled by user';
    
    if (booking.paymentStatus === 'Completed') {
      booking.paymentStatus = 'Refunded';
    }

    await booking.save();

    // Restore available seats
    if (booking.schedule) {
      booking.schedule.availableSeats += booking.passengers.length;
      await booking.schedule.save();
    }

    res.json({ 
      message: 'Booking cancelled successfully',
      booking 
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to cancel booking' 
    });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    booking.paymentStatus = paymentStatus;
    await booking.save();

    res.json({ 
      message: 'Payment status updated successfully',
      booking 
    });

  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to update payment status' 
    });
  }
};
