require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const busRoutes = require('./routes/busRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Add this for form data
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:3000'], // Vite + your backend
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/buses", busRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    message: "Backend is healthy ✅",
    timestamp: new Date().toISOString()
  });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bus_admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("MongoDB connected ✅");
  app.listen(PORT, () => console.log(`Server running on port ${PORT} ✅`));
})
.catch((err) => {
  console.log("DB connection error:", err);
  process.exit(1); // Exit if DB connection fails
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});