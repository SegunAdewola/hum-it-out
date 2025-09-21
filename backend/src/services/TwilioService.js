const twilio = require('twilio');
const config = require('../config/environment');
const logger = require('../utils/logger');

class TwilioService {
  constructor() {
    this.client = twilio(
      config.twilio.accountSid,
      config.twilio.authToken
    );
  }

  async sendSMS(to, message, options = {}) {
    // Check if SMS is configured and available
    if (!config.twilio.phoneNumber || config.twilio.phoneNumber.includes('xxx')) {
      logger.info('SMS not configured, skipping SMS notification:', {
        to: to,
        reason: 'No valid Twilio phone number configured'
      });
      return { status: 'skipped', reason: 'SMS not configured' };
    }

    try {
      const result = await this.client.messages.create({
        to: to,
        from: config.twilio.phoneNumber,
        body: message,
        ...options
      });

      logger.info('SMS sent successfully:', {
        messageSid: result.sid,
        to: to,
        status: result.status
      });

      return result;
    } catch (error) {
      // Log the error but don't throw - this makes SMS optional
      logger.warn('SMS sending failed (continuing without SMS):', {
        to: to,
        error: error.message,
        errorCode: error.code
      });
      
      // Return graceful failure response instead of throwing
      return { 
        status: 'failed', 
        error: error.message,
        reason: 'SMS service unavailable' 
      };
    }
  }

  async sendDownloadLinks(phoneNumber, sessionData) {
    // Skip SMS if no phone number provided
    if (!phoneNumber) {
      logger.info('No phone number provided, skipping SMS notification');
      return { status: 'skipped', reason: 'No phone number' };
    }

    const { sessionId, downloadUrl, tempo, key, processingTime } = sessionData;
    
    const message = `🎵 Your track is ready!

🎼 ${tempo ? `${tempo} BPM` : 'Custom tempo'}${key ? ` in ${key}` : ''}
⏱️ Generated in ${processingTime || '60'}s

📥 Download your files:
${downloadUrl}

Includes:
• Full backing track (WAV)
• MIDI file for your DAW
• Individual stems (ZIP)
• Lyrics sheet (TXT)

🎚️ Ready for GarageBand, Logic Pro, Ableton Live!

- Hum It Out Team`;

    const result = await this.sendSMS(phoneNumber, message);
    
    if (result.status === 'failed' || result.status === 'skipped') {
      logger.info('SMS notification not sent, user can access files via dashboard:', {
        sessionId,
        phoneNumber: phoneNumber ? 'provided' : 'missing',
        reason: result.reason
      });
    }
    
    return result;
  }

  async logCall(callSid, phoneNumber, action, success, errorMessage = null, userId = null) {
    const db = require('../utils/database').getInstance();
    
    try {
      await db.query(`
        INSERT INTO call_logs (phone_number, call_sid, user_id, action, success, error_message, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        phoneNumber,
        callSid,
        userId,
        action,
        success,
        errorMessage
      ]);
    } catch (error) {
      logger.error('Failed to log call:', error);
    }
  }

  async getCallHistory(userId, limit = 50) {
    const db = require('../utils/database').getInstance();
    
    try {
      const result = await db.query(`
        SELECT * FROM call_logs 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get call history:', error);
      return [];
    }
  }

  async validatePhoneNumber(phoneNumber) {
    try {
      const lookup = await this.client.lookups.v1.phoneNumbers(phoneNumber).fetch();
      return {
        valid: true,
        formatted: lookup.phoneNumber,
        carrier: lookup.carrier,
        type: lookup.type
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  formatDownloadMessage(sessionData) {
    const { sessionTitle, downloadUrl, tempo, key, mood, processingTime } = sessionData;
    
    return `🎵 "${sessionTitle}" is ready!

🔧 ${tempo ? `${tempo} BPM` : ''}${key ? ` • ${key} key` : ''}${mood ? ` • ${mood}` : ''}
⏱️ Generated in ${processingTime || 'under 60'}s

📥 Download: ${downloadUrl}

🎚️ Import into your favorite DAW and start creating!

- Hum It Out`;
  }
}

module.exports = TwilioService;
