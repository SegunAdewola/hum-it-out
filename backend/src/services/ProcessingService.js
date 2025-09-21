const logger = require('../utils/logger');
const AudioProcessor = require('./AudioProcessor');

class ProcessingService {
  static processingQueue = [];
  static isProcessing = false;

  static async queueProcessingJob(jobData) {
    const { userId, callSid, recordingUrl, recordingSid, duration, phoneNumber } = jobData;

    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'process_recording',
      userId,
      callSid,
      recordingUrl,
      recordingSid,
      duration,
      phoneNumber,
      createdAt: new Date(),
      status: 'queued',
      attempts: 0,
      maxAttempts: 3
    };

    this.processingQueue.push(job);
    
    logger.info('Job queued for processing:', {
      jobId: job.id,
      userId,
      callSid,
      queueLength: this.processingQueue.length
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return job;
  }

  static async queueRegenerationJob(jobData) {
    const { sessionId, userId, originalAudioUrl, options } = jobData;

    const job = {
      id: `regen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'regenerate_session',
      sessionId,
      userId,
      originalAudioUrl,
      options,
      createdAt: new Date(),
      status: 'queued',
      attempts: 0,
      maxAttempts: 3
    };

    this.processingQueue.push(job);
    
    logger.info('Regeneration job queued:', {
      jobId: job.id,
      sessionId,
      userId
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return job;
  }

  static async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const job = this.processingQueue.shift();
      
      try {
        await this.processJob(job);
      } catch (error) {
        logger.error('Job processing failed:', {
          jobId: job.id,
          error: error.message,
          attempts: job.attempts
        });

        job.attempts++;
        job.status = 'failed';
        job.lastError = error.message;

        // Retry if under max attempts
        if (job.attempts < job.maxAttempts) {
          job.status = 'retrying';
          this.processingQueue.push(job);
          logger.info('Job queued for retry:', {
            jobId: job.id,
            attempt: job.attempts + 1
          });
        } else {
          // Handle permanent failure
          await this.handleJobFailure(job);
        }
      }
    }

    this.isProcessing = false;
  }

  static async processJob(job) {
    job.status = 'processing';
    job.startedAt = new Date();

    logger.info('Processing job:', {
      jobId: job.id,
      type: job.type,
      userId: job.userId
    });

    // Notify frontend of processing start
    const io = require('../server').io;
    if (io && job.userId) {
      io.to(`user_${job.userId}`).emit('processing_started', {
        jobId: job.id,
        sessionId: job.sessionId || job.callSid,
        type: job.type,
        startedAt: job.startedAt
      });
    }

    const audioProcessor = new AudioProcessor();

    if (job.type === 'process_recording') {
      // Process new recording
      const result = await audioProcessor.processRecording(job.userId, {
        recordingUrl: job.recordingUrl,
        callSid: job.callSid,
        duration: job.duration,
        phoneNumber: job.phoneNumber
      });

      // Notify frontend of completion
      if (io && job.userId) {
        io.to(`user_${job.userId}`).emit('processing_complete', {
          jobId: job.id,
          sessionId: result.sessionId,
          success: true,
          files: result.files,
          completedAt: new Date()
        });
      }

    } else if (job.type === 'regenerate_session') {
      // Regenerate existing session
      const result = await audioProcessor.regenerateSession(
        job.sessionId,
        job.userId,
        job.options
      );

      // Notify frontend of completion
      if (io && job.userId) {
        io.to(`user_${job.userId}`).emit('processing_complete', {
          jobId: job.id,
          sessionId: job.sessionId,
          success: true,
          regenerated: true,
          files: result.files,
          completedAt: new Date()
        });
      }
    }

    job.status = 'completed';
    job.completedAt = new Date();

    logger.info('Job completed successfully:', {
      jobId: job.id,
      processingTime: job.completedAt - job.startedAt
    });
  }

  static async handleJobFailure(job) {
    logger.error('Job permanently failed:', {
      jobId: job.id,
      type: job.type,
      userId: job.userId,
      attempts: job.attempts,
      lastError: job.lastError
    });

    // Update database to mark session as failed
    if (job.type === 'process_recording') {
      const db = require('../utils/database').getInstance();
      
      try {
        await db.query(`
          UPDATE sessions 
          SET processing_status = 'failed', 
              processing_completed_at = NOW()
          WHERE call_sid = $1 AND user_id = $2
        `, [job.callSid, job.userId]);
      } catch (error) {
        logger.error('Failed to update session status:', error);
      }
    }

    // Notify frontend of failure
    const io = require('../server').io;
    if (io && job.userId) {
      io.to(`user_${job.userId}`).emit('processing_failed', {
        jobId: job.id,
        sessionId: job.sessionId || job.callSid,
        error: job.lastError,
        failedAt: new Date()
      });
    }

    // Optionally send notification to user
    try {
      if (job.phoneNumber) {
        const TwilioService = require('./TwilioService');
        const twilioService = new TwilioService();
        
        await twilioService.sendSMS(
          job.phoneNumber,
          '🎵 Hum It Out: Sorry, we encountered an issue processing your recording. Please try again or contact support if the problem persists.'
        );
      }
    } catch (error) {
      logger.error('Failed to send failure notification:', error);
    }
  }

  static async handleRecordingFailure(userId, callSid, errorMessage) {
    logger.error('Recording failure reported:', {
      userId,
      callSid,
      errorMessage
    });

    // Update session status
    const db = require('../utils/database').getInstance();
    
    try {
      await db.query(`
        UPDATE sessions 
        SET processing_status = 'failed',
            processing_completed_at = NOW()
        WHERE call_sid = $1 AND user_id = $2
      `, [callSid, userId]);
    } catch (error) {
      logger.error('Failed to update session status after recording failure:', error);
    }

    // Notify frontend
    const io = require('../server').io;
    if (io && userId) {
      io.to(`user_${userId}`).emit('processing_failed', {
        sessionId: callSid,
        error: errorMessage,
        failedAt: new Date()
      });
    }
  }

  static getQueueStatus() {
    return {
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing,
      jobs: this.processingQueue.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        attempts: job.attempts
      }))
    };
  }

  static async clearQueue() {
    this.processingQueue = [];
    this.isProcessing = false;
    logger.info('Processing queue cleared');
  }
}

module.exports = ProcessingService;
