const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Check if user still exists and is active
    const db = require('../utils/database').getInstance();
    const userResult = await db.query(`
      SELECT id, email, name, pin, is_active, created_at, last_login
      FROM users 
      WHERE id = $1 AND is_active = true
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found or inactive.'
      });
    }

    const user = userResult.rows[0];

    // Add user info to request object
    req.user = {
      userId: user.id,
      email: user.email,
      name: user.name,
      pin: user.pin,
      createdAt: user.created_at,
      lastLogin: user.last_login
    };

    // Log the authenticated request
    logger.debug('Authenticated request:', {
      userId: user.id,
      email: user.email,
      method: req.method,
      path: req.path,
      ip: req.ip
    });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    } else {
      logger.error('Auth middleware error:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
      });
      
      return res.status(500).json({
        success: false,
        message: 'Authentication error.'
      });
    }
  }
};

// Optional auth middleware - doesn't fail if no token
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      const db = require('../utils/database').getInstance();
      const userResult = await db.query(`
        SELECT id, email, name, pin, is_active
        FROM users 
        WHERE id = $1 AND is_active = true
      `, [decoded.userId]);

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        req.user = {
          userId: user.id,
          email: user.email,
          name: user.name,
          pin: user.pin
        };
      }
    }

    next();
  } catch (error) {
    // Fail silently for optional auth
    logger.debug('Optional auth failed:', error.message);
    next();
  }
};

// Admin auth middleware
const adminAuthMiddleware = async (req, res, next) => {
  try {
    // First, check basic auth
    await authMiddleware(req, res, () => {});

    // Check if user is admin (you'll need to add admin field to users table)
    const db = require('../utils/database').getInstance();
    const adminCheck = await db.query(`
      SELECT is_admin FROM users WHERE id = $1
    `, [req.user.userId]);

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    next();
  } catch (error) {
    logger.error('Admin auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Admin authentication error.'
    });
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  adminAuthMiddleware
};
