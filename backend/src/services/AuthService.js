const crypto = require('crypto');
const config = require('../config/environment');
const logger = require('../utils/logger');

class AuthService {
  static async generateUniquePIN() {
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

  static async validatePIN(pin) {
    const db = require('../utils/database').getInstance();
    
    // Basic format validation
    if (!pin || !/^\d{6}$/.test(pin)) {
      throw new Error('PIN must be exactly 6 digits');
    }

    // Database lookup
    const result = await db.query(`
      SELECT id, email, name, phone, created_at, last_login
      FROM users 
      WHERE pin = $1 AND is_active = true
    `, [pin]);

    if (result.rows.length === 0) {
      // Log failed attempt for security monitoring
      await this.logFailedPINAttempt(pin);
      return null;
    }

    // Update last access time
    const user = result.rows[0];
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    return user;
  }

  static async rotatePIN(userId) {
    const db = require('../utils/database').getInstance();
    const newPin = await this.generateUniquePIN();
    
    await db.query(
      'UPDATE users SET pin = $1, updated_at = NOW() WHERE id = $2',
      [newPin, userId]
    );

    logger.info('PIN rotated for user:', { userId, newPin });
    return newPin;
  }

  static async logFailedPINAttempt(pin, additionalInfo = {}) {
    try {
      logger.warn('Failed PIN attempt:', {
        pin: 'REDACTED',
        timestamp: new Date().toISOString(),
        ...additionalInfo
      });

      // You might want to implement rate limiting here
      // or store failed attempts in a security log
    } catch (error) {
      logger.error('Failed to log PIN attempt:', error);
    }
  }

  static async checkRateLimit(identifier, maxAttempts = 5, windowMinutes = 15) {
    // Simple in-memory rate limiting - in production, use Redis
    if (!this.rateLimitStore) {
      this.rateLimitStore = new Map();
    }

    const now = Date.now();
    const windowStart = now - (windowMinutes * 60 * 1000);
    
    // Clean old entries
    for (const [key, attempts] of this.rateLimitStore.entries()) {
      const validAttempts = attempts.filter(time => time > windowStart);
      if (validAttempts.length === 0) {
        this.rateLimitStore.delete(key);
      } else {
        this.rateLimitStore.set(key, validAttempts);
      }
    }

    // Check current attempts
    const attempts = this.rateLimitStore.get(identifier) || [];
    const recentAttempts = attempts.filter(time => time > windowStart);

    if (recentAttempts.length >= maxAttempts) {
      const oldestAttempt = Math.min(...recentAttempts);
      const waitTime = Math.ceil((oldestAttempt + (windowMinutes * 60 * 1000) - now) / 1000);
      
      throw new Error(`Too many attempts. Please wait ${waitTime} seconds.`);
    }

    // Record this attempt
    recentAttempts.push(now);
    this.rateLimitStore.set(identifier, recentAttempts);

    return true;
  }

  static async getUserByPIN(pin) {
    return await this.validatePIN(pin);
  }

  static async updateUserLastActivity(userId) {
    const db = require('../utils/database').getInstance();
    
    try {
      await db.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [userId]
      );
    } catch (error) {
      logger.error('Failed to update user activity:', error);
    }
  }
}

module.exports = AuthService;
