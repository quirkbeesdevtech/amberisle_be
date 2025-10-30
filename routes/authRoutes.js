const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser, logout, verifyOtp, resendOtp } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

module.exports = router;