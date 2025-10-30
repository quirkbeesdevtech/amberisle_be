const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

// Register new user (blocked under /api/admin/auth)
exports.register = async (req, res) => {
  try {
    // If mounted under admin base, disallow registration here
    if ((req.baseUrl || '').startsWith('/api/admin')) {
      return res.status(403).json({ error: 'Admin registration is not allowed via this endpoint' });
    }

    const { email, password, fullname, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email already exists. Please use another email.' 
      });
    }

    // Split fullname into firstName and lastName
    const nameParts = fullname.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create new user
    const user = new User({
      email,
      password,
      fullname,
      firstName,
      lastName,
      phone
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: error.message || 'Registration failed' 
    });
  }
};

// Login user or admin depending on mount path
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockTimeLeft = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
      return res.status(423).json({ 
        error: `Account is locked. Try again in ${lockTimeLeft} minutes.` 
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Enforce role based on mount path
    const isAdminMount = (req.baseUrl || '').startsWith('/api/admin');
    if (isAdminMount && user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }
    if (!isAdminMount && user.role !== 'user') {
      return res.status(403).json({ error: 'User access only' });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: error.message || 'Login failed' 
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
};

// Logout (client-side token removal)
exports.logout = (req, res) => {
  res.json({ message: 'Logout successful' });
};