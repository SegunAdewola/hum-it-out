const express = require('express');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth').authMiddleware;

const router = express.Router();

// Apply auth middleware to all dashboard routes
router.use(authMiddleware);

// Get user dashboard data (sessions with stats)
router.get('/sessions', async (req, res) => {
  const db = require('../utils/database').getInstance();
  
  try {
    const userId = req.user.userId;

    // Get user sessions with generated tracks
    const sessionsResult = await db.query(`
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
      WHERE s.user_id = $1
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 50
    `, [userId]);

    const sessions = sessionsResult.rows.map(session => ({
      ...session,
      generated_tracks: session.generated_tracks || []
    }));

    res.json({
      success: true,
      sessions: sessions,
      total: sessions.length
    });

  } catch (error) {
    logger.error('Dashboard sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load sessions'
    });
  }
});

// Get specific session details
router.get('/sessions/:sessionId', async (req, res) => {
  const db = require('../utils/database').getInstance();
  
  try {
    const userId = req.user.userId;
    const sessionId = req.params.sessionId;

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
                'generation_params', gt.generation_params,
                'total_size', gt.total_size,
                'download_count', gt.download_count,
                'created_at', gt.created_at
              )
            ELSE NULL
          END
          ORDER BY gt.version DESC
        ) FILTER (WHERE gt.id IS NOT NULL) as generated_tracks
      FROM sessions s
      LEFT JOIN generated_tracks gt ON s.id = gt.session_id
      WHERE s.id = $1 AND s.user_id = $2
      GROUP BY s.id
    `, [sessionId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const session = result.rows[0];
    session.generated_tracks = session.generated_tracks || [];

    res.json({
      success: true,
      session: session
    });

  } catch (error) {
    logger.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session'
    });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  const db = require('../utils/database').getInstance();
  
  try {
    const userId = req.user.userId;

    const statsResult = await db.query(`
      SELECT 
        COUNT(s.id) as total_sessions,
        COUNT(CASE WHEN s.processing_status = 'completed' THEN 1 END) as completed_sessions,
        COUNT(CASE WHEN s.processing_status = 'processing' THEN 1 END) as processing_sessions,
        COUNT(CASE WHEN s.processing_status = 'failed' THEN 1 END) as failed_sessions,
        COALESCE(SUM(gt.download_count), 0) as total_downloads,
        AVG(EXTRACT(EPOCH FROM (s.processing_completed_at - s.processing_started_at))) as avg_processing_time
      FROM sessions s
      LEFT JOIN generated_tracks gt ON s.id = gt.session_id
      WHERE s.user_id = $1
    `, [userId]);

    const stats = statsResult.rows[0];

    // Additional metrics
    const recentActivityResult = await db.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as session_count
      FROM sessions
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `, [userId]);

    res.json({
      success: true,
      stats: {
        totalSessions: parseInt(stats.total_sessions),
        completedSessions: parseInt(stats.completed_sessions),
        processingSessions: parseInt(stats.processing_sessions),
        failedSessions: parseInt(stats.failed_sessions),
        totalDownloads: parseInt(stats.total_downloads),
        avgProcessingTime: parseFloat(stats.avg_processing_time) || 0,
        recentActivity: recentActivityResult.rows
      }
    });

  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load stats'
    });
  }
});

// Delete session
router.delete('/sessions/:sessionId', async (req, res) => {
  const db = require('../utils/database').getInstance();
  
  try {
    const userId = req.user.userId;
    const sessionId = req.params.sessionId;

    // Verify ownership
    const sessionCheck = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Delete session (CASCADE will handle generated_tracks)
    await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);

    logger.info('Session deleted:', {
      sessionId,
      userId
    });

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    logger.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session'
    });
  }
});

// Regenerate session with new parameters
router.post('/sessions/:sessionId/regenerate', async (req, res) => {
  const db = require('../utils/database').getInstance();
  
  try {
    const userId = req.user.userId;
    const sessionId = req.params.sessionId;
    const options = req.body || {};

    // Verify ownership and get session
    const sessionResult = await db.query(`
      SELECT * FROM sessions 
      WHERE id = $1 AND user_id = $2
    `, [sessionId, userId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const session = sessionResult.rows[0];

    // Queue regeneration job
    const ProcessingService = require('../services/ProcessingService');
    await ProcessingService.queueRegenerationJob({
      sessionId: session.id,
      userId: userId,
      originalAudioUrl: session.original_audio_url,
      options: options
    });

    res.json({
      success: true,
      message: 'Regeneration queued successfully',
      sessionId: session.id
    });

  } catch (error) {
    logger.error('Regenerate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue regeneration'
    });
  }
});

module.exports = router;
