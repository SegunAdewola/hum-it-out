const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.email = data.email || null;
    this.password_hash = data.password_hash || null;
    this.pin = data.pin || null;
    this.name = data.name || null;
    this.phone = data.phone || null;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.is_admin = data.is_admin !== undefined ? data.is_admin : false;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
    this.last_login = data.last_login || null;
  }

  // Create a new user
  static async create(userData) {
    const db = require('../utils/database').getInstance();
    
    try {
      const user = new User(userData);
      
      // Hash password if provided
      if (userData.password) {
        user.password_hash = await bcrypt.hash(userData.password, 12);
      }
      
      const result = await db.query(`
        INSERT INTO users (email, password_hash, pin, name, phone, is_active, is_admin, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [
        user.email,
        user.password_hash,
        user.pin,
        user.name,
        user.phone,
        user.is_active,
        user.is_admin
      ]);

      return new User(result.rows[0]);
    } catch (error) {
      logger.error('User creation failed:', error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    const db = require('../utils/database').getInstance();
    
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [id]
      );
      
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      logger.error('User findById failed:', error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    const db = require('../utils/database').getInstance();
    
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email.toLowerCase()]
      );
      
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      logger.error('User findByEmail failed:', error);
      throw error;
    }
  }

  // Find user by PIN
  static async findByPin(pin) {
    const db = require('../utils/database').getInstance();
    
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE pin = $1 AND is_active = true',
        [pin]
      );
      
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      logger.error('User findByPin failed:', error);
      throw error;
    }
  }

  // Get all users (admin function)
  static async findAll(options = {}) {
    const db = require('../utils/database').getInstance();
    
    try {
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const includeInactive = options.includeInactive || false;
      
      const whereClause = includeInactive ? '' : 'WHERE is_active = true';
      
      const result = await db.query(`
        SELECT * FROM users 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      return result.rows.map(row => new User(row));
    } catch (error) {
      logger.error('User findAll failed:', error);
      throw error;
    }
  }

  // Update user
  async update(updates) {
    const db = require('../utils/database').getInstance();
    
    try {
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'created_at' && updates[key] !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(updates[key]);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        return this;
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = NOW()`);

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      values.push(this.id);

      const result = await db.query(query, values);
      
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }
      
      return this;
    } catch (error) {
      logger.error('User update failed:', error);
      throw error;
    }
  }

  // Verify password
  async verifyPassword(password) {
    if (!this.password_hash) {
      return false;
    }
    
    try {
      return await bcrypt.compare(password, this.password_hash);
    } catch (error) {
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  // Update password
  async updatePassword(newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await this.update({ password_hash: hashedPassword });
      return true;
    } catch (error) {
      logger.error('Password update failed:', error);
      throw error;
    }
  }

  // Update last login
  async updateLastLogin() {
    try {
      await this.update({ last_login: new Date() });
      return this;
    } catch (error) {
      logger.error('Last login update failed:', error);
      throw error;
    }
  }

  // Soft delete user
  async deactivate() {
    try {
      await this.update({ is_active: false });
      return this;
    } catch (error) {
      logger.error('User deactivation failed:', error);
      throw error;
    }
  }

  // Get user stats
  async getStats() {
    const db = require('../utils/database').getInstance();
    
    try {
      const result = await db.query(`
        SELECT 
          COUNT(s.id) as total_sessions,
          COUNT(CASE WHEN s.processing_status = 'completed' THEN 1 END) as completed_sessions,
          COUNT(CASE WHEN s.processing_status = 'processing' THEN 1 END) as processing_sessions,
          COUNT(CASE WHEN s.processing_status = 'failed' THEN 1 END) as failed_sessions,
          COALESCE(SUM(gt.download_count), 0) as total_downloads,
          MIN(s.created_at) as first_session,
          MAX(s.created_at) as last_session
        FROM users u
        LEFT JOIN sessions s ON u.id = s.user_id
        LEFT JOIN generated_tracks gt ON s.id = gt.session_id
        WHERE u.id = $1
        GROUP BY u.id
      `, [this.id]);

      return result.rows[0] || {
        total_sessions: 0,
        completed_sessions: 0,
        processing_sessions: 0,
        failed_sessions: 0,
        total_downloads: 0,
        first_session: null,
        last_session: null
      };
    } catch (error) {
      logger.error('User stats fetch failed:', error);
      throw error;
    }
  }

  // Get user sessions
  async getSessions(limit = 20, offset = 0) {
    const db = require('../utils/database').getInstance();
    
    try {
      const result = await db.query(`
        SELECT 
          s.*,
          json_agg(
            CASE 
              WHEN gt.id IS NOT NULL THEN
                json_build_object(
                  'id', gt.id,
                  'version', gt.version,
                  'backing_track_url', gt.backing_track_url,
                  'midi_url', gt.midi_url,
                  'stems_folder_url', gt.stems_folder_url,
                  'lyrics_url', gt.lyrics_url,
                  'download_package_url', gt.download_package_url,
                  'total_size', gt.total_size,
                  'download_count', gt.download_count,
                  'created_at', gt.created_at
                )
              ELSE NULL
            END
          ) FILTER (WHERE gt.id IS NOT NULL) as generated_tracks
        FROM sessions s
        LEFT JOIN generated_tracks gt ON s.id = gt.session_id
        WHERE s.user_id = $1
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT $2 OFFSET $3
      `, [this.id, limit, offset]);

      return result.rows;
    } catch (error) {
      logger.error('User sessions fetch failed:', error);
      throw error;
    }
  }

  // Serialize user for JSON responses (remove sensitive data)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      phone: this.phone,
      pin: this.pin,
      isActive: this.is_active,
      isAdmin: this.is_admin,
      createdAt: this.created_at,
      updatedAt: this.updated_at,
      lastLogin: this.last_login
    };
  }

  // Serialize user for public display (even more restricted)
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.created_at
    };
  }
}

module.exports = User;
