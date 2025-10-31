const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true); // allow all origins dynamically
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Routes
// User authentication routes
app.use('/api/auth', require('./routes/authRoutes'));

// Admin authentication routes reuse the same router, role enforced in controller
app.use('/api/admin/auth', require('./routes/authRoutes'));

// User booking routes (authentication required)
app.use('/api/bookings', require('./routes/bookingRoutes'));

// Public routes (no authentication required)
app.use('/api/public', require('./routes/publicRoutes'));

// Admin routes (for admin panel - separate from user routes)
app.use('/api/buses', require('./routes/busRoutes'));
app.use('/api/schedules', require('./routes/busScheduleRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bus_management')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Bus Management API is running!' });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    message: 'Backend is healthy and running!',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});