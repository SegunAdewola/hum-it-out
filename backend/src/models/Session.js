const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class Session {
  constructor(data = {}) {
    this.id = data.id || null;
    this.user_id = data.user_id || null;
    this.call_sid = data.call_sid || null;
    this.original_audio_url = data.original_audio_url || null;
    this.transcribed_lyrics = data.transcribed_lyrics || null;
    this.tempo = data.tempo || null;
    this.detected_key = data.detected_key || null;
    this.mood_tags = data.mood_tags || [];
    this.genre_tags = data.genre_tags || [];
    this.processing_status = data.processing_status || 'pending';
    this.processing_started_at = data.processing_started_at || null;
    this.processing_completed_at = data.processing_completed_at || null;
    this.audio_duration = data.audio_duration || null;
    this.audio_size = data.audio_size || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
    this.generated_tracks = data.generated_tracks || [];
  }

  // Create a new session
  static async create(sessionData) {
    const db = require('../utils/database').getInstance();
    
    try {
      const session = new Session(sessionData);
      
      const result = await db.query(`
        INSERT INTO sessions (
          user_id, call_sid, original_audio_url, transcribed_lyrics,
          tempo, detected_key, mood_tags, genre_tags, processing_status,
          processing_started_at, audio_duration, audio_size, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *
      `, [
        session.user_id,
        session.call_sid,
        session.original_audio_url,
        session.transcribed_lyrics,
        session.tempo,
        session.detected_key,
        session.mood_tags,
        session.genre_tags,
        session.processing_status,
        session.processing_started_at,
        session.audio_duration,
        session.audio_size
      ]);

      const createdSession = new Session(result.rows[0]);
      
      logger.info('Session created:', {
        sessionId: createdSession.id,
        userId: createdSession.user_id,
        callSid: createdSession.call_sid
      });

      return createdSession;
    } catch (error) {
      logger.error('Session creation failed:', error);
      throw error;
    }
  }

  // Find session by ID
  static async findById(id, userId = null) {
    const db = require('../utils/database').getInstance();
    
    try {
      let query = `
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
                  'generation_params', gt.generation_params,
                  'total_size', gt.total_size,
                  'download_count', gt.download_count,
                  'created_at', gt.created_at,
                  'expires_at', gt.expires_at
                )
              ELSE NULL
            END
          ) FILTER (WHERE gt.id IS NOT NULL) as generated_tracks
        FROM sessions s
        LEFT JOIN generated_tracks gt ON s.id = gt.session_id
        WHERE s.id = $1
      `;
      
      const params = [id];
      
      if (userId) {
        query += ' AND s.user_id = $2';
        params.push(userId);
      }
      
      query += ' GROUP BY s.id';
      
      const result = await db.query(query, params);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const sessionData = result.rows[0];
      sessionData.generated_tracks = sessionData.generated_tracks || [];
      
      return new Session(sessionData);
    } catch (error) {
      logger.error('Session findById failed:', error);
      throw error;
    }
  }

  // Find session by call SID
  static async findByCallSid(callSid, userId = null) {
    const db = require('../utils/database').getInstance();
    
    try {
      let query = 'SELECT * FROM sessions WHERE call_sid = $1';
      const params = [callSid];
      
      if (userId) {
        query += ' AND user_id = $2';
        params.push(userId);
      }
      
      const result = await db.query(query, params);
      
      return result.rows.length > 0 ? new Session(result.rows[0]) : null;
    } catch (error) {
      logger.error('Session findByCallSid failed:', error);
      throw error;
    }
  }

  // Get sessions for a user
  static async findByUserId(userId, options = {}) {
    const db = require('../utils/database').getInstance();
    
    try {
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const status = options.status || null;
      
      let whereClause = 'WHERE s.user_id = $1';
      const params = [userId, limit, offset];
      let paramIndex = 4;
      
      if (status) {
        whereClause += ` AND s.processing_status = $${paramIndex}`;
        params.splice(3, 0, status);
        paramIndex++;
      }
      
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
            ORDER BY gt.created_at DESC
          ) FILTER (WHERE gt.id IS NOT NULL) as generated_tracks
        FROM sessions s
        LEFT JOIN generated_tracks gt ON s.id = gt.session_id
        ${whereClause}
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT $${paramIndex-1} OFFSET $${paramIndex}
      `, params);
      
      return result.rows.map(row => {
        row.generated_tracks = row.generated_tracks || [];
        return new Session(row);
      });
    } catch (error) {
      logger.error('Session findByUserId failed:', error);
      throw error;
    }
  }

  // Update session
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
        UPDATE sessions 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      values.push(this.id);

      const result = await db.query(query, values);
      
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }
      
      logger.info('Session updated:', {
        sessionId: this.id,
        updates: Object.keys(updates)
      });
      
      return this;
    } catch (error) {
      logger.error('Session update failed:', error);
      throw error;
    }
  }

  // Update processing status
  async updateStatus(status, additionalData = {}) {
    const updates = {
      processing_status: status,
      ...additionalData
    };

    if (status === 'processing') {
      updates.processing_started_at = new Date();
    } else if (status === 'completed' || status === 'failed') {
      updates.processing_completed_at = new Date();
    }

    return await this.update(updates);
  }

  // Delete session and all related data
  async delete() {
    const db = require('../utils/database').getInstance();
    
    try {
      await db.query('DELETE FROM sessions WHERE id = $1', [this.id]);
      
      logger.info('Session deleted:', {
        sessionId: this.id,
        userId: this.user_id
      });
      
      return true;
    } catch (error) {
      logger.error('Session deletion failed:', error);
      throw error;
    }
  }

  // Get processing time
  getProcessingTime() {
    if (!this.processing_started_at || !this.processing_completed_at) {
      return null;
    }
    
    const startTime = new Date(this.processing_started_at);
    const endTime = new Date(this.processing_completed_at);
    
    return Math.round((endTime - startTime) / 1000); // in seconds
  }

  // Check if session is expired (for file cleanup)
  isExpired(retentionDays = 30) {
    if (!this.created_at) return false;
    
    const expiryDate = new Date(this.created_at);
    expiryDate.setDate(expiryDate.getDate() + retentionDays);
    
    return new Date() > expiryDate;
  }

  // Generate session title from content
  generateTitle() {
    if (this.transcribed_lyrics) {
      const words = this.transcribed_lyrics.split(' ').slice(0, 3);
      return words.join(' ') + (words.length >= 3 ? '...' : '');
    }
    
    const mood = this.mood_tags && this.mood_tags.length > 0 ? this.mood_tags[0] : 'Untitled';
    const key = this.detected_key || '';
    
    return `${mood} ${key ? `in ${key}` : 'Melody'}`.trim();
  }

  // Get session analytics
  async getAnalytics() {
    const db = require('../utils/database').getInstance();
    
    try {
      const result = await db.query(`
        SELECT 
          COUNT(gt.id) as track_versions,
          COALESCE(SUM(gt.download_count), 0) as total_downloads,
          MIN(gt.created_at) as first_generation,
          MAX(gt.created_at) as last_generation,
          AVG(gt.total_size) as avg_file_size
        FROM sessions s
        LEFT JOIN generated_tracks gt ON s.id = gt.session_id
        WHERE s.id = $1
        GROUP BY s.id
      `, [this.id]);

      return result.rows[0] || {
        track_versions: 0,
        total_downloads: 0,
        first_generation: null,
        last_generation: null,
        avg_file_size: 0
      };
    } catch (error) {
      logger.error('Session analytics fetch failed:', error);
      throw error;
    }
  }

  // Serialize session for JSON responses
  toJSON() {
    return {
      id: this.id,
      userId: this.user_id,
      callSid: this.call_sid,
      originalAudioUrl: this.original_audio_url,
      transcribedLyrics: this.transcribed_lyrics,
      tempo: this.tempo,
      detectedKey: this.detected_key,
      moodTags: this.mood_tags,
      genreTags: this.genre_tags,
      processingStatus: this.processing_status,
      processingStartedAt: this.processing_started_at,
      processingCompletedAt: this.processing_completed_at,
      audioDuration: this.audio_duration,
      audioSize: this.audio_size,
      createdAt: this.created_at,
      updatedAt: this.updated_at,
      generatedTracks: this.generated_tracks,
      processingTime: this.getProcessingTime(),
      title: this.generateTitle()
    };
  }
}

module.exports = Session;
