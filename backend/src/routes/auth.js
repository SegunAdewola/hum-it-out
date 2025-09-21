const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/environment');
const logger = require('../utils/logger');
const crypto = require('crypto');

const router = express.Router();

// Generate unique 6-digit PIN
async function generateUniquePIN() {
  const db = require('../utils/database').getInstance();
  const MAX_ATTEMPTS = 10;
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    // Generate cryptographically secure 6-digit PIN
    const pin = crypto.randomBytes(3).readUIntBE(0, 3) % 1000000;
    const paddedPin = pin.toString().padStart(6, '0');

    // Check uniqueness in database
    const existing = await db.query('SELECT id FROM users WHERE pin = $1', [paddedPin]);
    
    if (existing.rows.length === 0) {
      return paddedPin;
    }

    attempts++;
  }

  throw new Error('Unable to generate unique PIN after multiple attempts');
}

// Register new user
router.post('/register', async (req, res) => {
  const db = require('../utils/database').getInstance();
  
  try {
    const { email, password, name, phone } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate unique PIN
    const pin = await generateUniquePIN();

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await db.query(`
      INSERT INTO users (email, password_hash, pin, name, phone, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, email, pin, name, phone, created_at
    `, [
      email.toLowerCase(),
      hashedPassword,
      pin,
      name || null,
      phone || null
    ]);

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        pin: user.pin
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    logger.info('User registered successfully:', {
      userId: user.id,
      email: user.email,
      pin: pin // Log PIN for demo purposes
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        pin: user.pin,
        createdAt: user.created_at
      },
      token
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const db = require('../utils/database').getInstance();
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const result = await db.query(`
      SELECT id, email, password_hash, pin, name, phone, created_at, last_login
      FROM users 
      WHERE email = $1 AND is_active = true
    `, [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        pin: user.pin
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    logger.info('User logged in successfully:', {
      userId: user.id,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        pin: user.pin,
        createdAt: user.created_at,
        lastLogin: user.last_login
      },
      token
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  const db = require('../utils/database').getInstance();
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    
    const result = await db.query(`
      SELECT id, email, pin, name, phone, created_at, last_login
      FROM users 
      WHERE id = $1 AND is_active = true
    `, [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        pin: user.pin,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  // In a more complete implementation, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Refresh PIN (for demo purposes)
router.post('/refresh-pin', async (req, res) => {
  const db = require('../utils/database').getInstance();
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const newPin = await generateUniquePIN();

    await db.query(
      'UPDATE users SET pin = $1 WHERE id = $2',
      [newPin, decoded.userId]
    );

    logger.info('PIN refreshed for user:', {
      userId: decoded.userId,
      newPin: newPin
    });

    res.json({
      success: true,
      message: 'PIN refreshed successfully',
      pin: newPin
    });

  } catch (error) {
    logger.error('PIN refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh PIN'
    });
  }
});

module.exports = router;
