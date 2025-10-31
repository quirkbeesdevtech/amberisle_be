const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createBooking,
  getUserBookings,
  getBookingById,
  getBookingByReference,
  cancelBooking,
  updatePaymentStatus
} = require('../controllers/bookingController');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all bookings for the authenticated user
router.get('/my-bookings', getUserBookings);

// Get booking by reference number
router.get('/reference/:reference', getBookingByReference);

// Get booking by ID
router.get('/:id', getBookingById);

// Create a new booking
router.post('/', createBooking);

// Cancel a booking
router.put('/:id/cancel', cancelBooking);

// Update payment status
router.put('/:id/payment', updatePaymentStatus);

module.exports = router;
