const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const config = require('../config/environment');
const logger = require('../utils/logger');
const AG2MusicGenerator = require('../agents/AG2MusicGenerator');
const FileManager = require('./FileManager');

class AudioProcessor {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    this.musicGenerator = new AG2MusicGenerator();
    this.fileManager = new FileManager();
  }

  async processRecording(userId, recordingData) {
    const { recordingUrl, callSid, duration, phoneNumber } = recordingData;
    
    try {
      logger.info('Starting audio processing:', {
        userId,
        callSid,
        duration,
        recordingUrl: recordingUrl ? 'provided' : 'missing'
      });

      // Step 1: Download audio file
      const audioFile = await this.downloadAudio(recordingUrl);
      
      // Step 2: Validate audio file
      await this.validateAudioFile(audioFile);

      // Step 3: Transcribe with OpenAI Whisper
      const transcription = await this.transcribeAudio(audioFile.path);
      
      // Step 4: Analyze musical elements
      const analysis = await this.analyzeMusicalElements(transcription);
      
      // Step 5: Create session record
      const session = await this.createSession(userId, {
        callSid,
        audioUrl: recordingUrl,
        audioFile: audioFile.path,
        lyrics: transcription.text,
        duration: transcription.duration,
        ...analysis
      });

      // Step 6: Generate music with OpenAI Multi-Agent System
      const generatedMusic = await this.musicGenerator.generateMusic(analysis, transcription);
      
      // Step 7: Create audio files
      const audioFiles = await this.fileManager.generateAudioFiles(session.id, generatedMusic);
      
      // Step 8: Save results to database
      await this.saveResults(session.id, audioFiles);
      
      // Step 9: Send SMS notification
      if (phoneNumber) {
        await this.sendSMSNotification(phoneNumber, session.id, audioFiles);
      }

      // Cleanup temp files
      await this.cleanup(audioFile.path);
      
      return {
        sessionId: session.id,
        success: true,
        files: audioFiles
      };

    } catch (error) {
      logger.error('Audio processing failed:', {
        userId,
        callSid,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }

  async downloadAudio(recordingUrl) {
    try {
      const response = await axios.get(recordingUrl, {
        responseType: 'arraybuffer',
        auth: {
          username: config.twilio.accountSid,
          password: config.twilio.authToken
        },
        timeout: 30000 // 30 second timeout
      });

      const filename = `recording_${Date.now()}.wav`;
      const filepath = path.join(config.storage.local.uploadsDir, filename);
      
      await fs.writeFile(filepath, response.data);
      
      const stats = await fs.stat(filepath);
      
      return {
        path: filepath,
        size: stats.size,
        filename: filename
      };
    } catch (error) {
      throw new Error(`Failed to download audio: ${error.message}`);
    }
  }

  async validateAudioFile(audioFile) {
    const { size, path: filePath } = audioFile;
    
    // Check file size
    if (size > config.audio.maxSize) {
      throw new Error('Audio file too large');
    }
    
    if (size < 1000) { // Less than 1KB is probably invalid
      throw new Error('Audio file too small or corrupted');
    }

    // Check file exists and is readable
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch (error) {
      throw new Error('Audio file is not accessible');
    }
    
    return true;
  }

  async transcribeAudio(filePath) {
    try {
      const audioBuffer = await fs.readFile(filePath);
      
      const response = await this.openai.audio.transcriptions.create({
        file: new File([audioBuffer], 'recording.wav', { type: 'audio/wav' }),
        model: config.openai.whisperModel,
        language: 'en',
        response_format: 'verbose_json',
        temperature: 0.0
      });

      logger.info('Transcription completed:', {
        text: response.text,
        duration: response.duration,
        segments: response.segments ? response.segments.length : 0
      });

      return {
        text: response.text,
        duration: response.duration,
        segments: response.segments || [],
        confidence: this.calculateConfidence(response.segments)
      };
    } catch (error) {
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  calculateConfidence(segments) {
    if (!segments || segments.length === 0) return 0.5;
    
    // Simple confidence calculation based on segment consistency
    const avgConfidence = segments.reduce((sum, seg) => {
      return sum + (seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.5);
    }, 0) / segments.length;
    
    return Math.max(0.1, Math.min(0.95, avgConfidence));
  }

  async analyzeMusicalElements(transcription) {
    const prompt = `
    Analyze this audio transcription for musical elements:
    
    Text: "${transcription.text}"
    Duration: ${transcription.duration} seconds
    Segments: ${transcription.segments.length} word segments
    
    Based on the vocal rhythm, word timing, and content, determine:
    1. Estimated tempo (BPM) - analyze rhythm from segment timing
    2. Suggested key signature (C, G, Am, Dm, etc.)
    3. Mood classification (upbeat, melancholy, energetic, chill, romantic, etc.)
    4. Genre suggestions (pop, rock, jazz, electronic, acoustic, hip-hop, etc.)
    5. Song structure hints (verse, chorus, bridge, intro, outro)
    6. Overall energy level (1-10 scale)
    
    Consider:
    - Fast, rhythmic delivery suggests higher tempo
    - Repetitive patterns suggest chorus sections
    - Lyrical content influences mood and genre
    - Vocal tone (though not directly analyzable) can be inferred from word choice
    
    Respond with valid JSON only:
    {
      "tempo": 120,
      "key": "C",
      "mood": ["upbeat", "energetic"],
      "genres": ["pop", "rock"],
      "structure": "verse-chorus",
      "energy": 7,
      "confidence": 0.8,
      "reasoning": "Fast-paced delivery with repetitive 'da da da' suggests upbeat tempo around 120 BPM..."
    }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      logger.info('Musical analysis completed:', analysis);
      
      return analysis;
    } catch (error) {
      logger.warn('Musical analysis failed, using defaults:', error.message);
      
      // Return default analysis if AI fails
      return {
        tempo: 120,
        key: 'C',
        mood: ['neutral'],
        genres: ['pop'],
        structure: 'verse-chorus',
        energy: 5,
        confidence: 0.3,
        reasoning: 'Default values used due to analysis failure'
      };
    }
  }

  async createSession(userId, sessionData) {
    const db = require('../utils/database').getInstance();
    
    try {
      const result = await db.query(`
        INSERT INTO sessions (
          user_id, call_sid, original_audio_url, transcribed_lyrics, 
          tempo, detected_key, mood_tags, genre_tags, audio_duration,
          processing_status, processing_started_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id, created_at
      `, [
        userId,
        sessionData.callSid,
        sessionData.audioUrl,
        sessionData.lyrics,
        sessionData.tempo,
        sessionData.key,
        sessionData.mood || [],
        sessionData.genres || [],
        sessionData.duration,
        'processing'
      ]);

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  async saveResults(sessionId, audioFiles) {
    const db = require('../utils/database').getInstance();
    
    try {
      await db.query(`
        UPDATE sessions 
        SET processing_status = $1, processing_completed_at = NOW()
        WHERE id = $2
      `, ['completed', sessionId]);

      const result = await db.query(`
        INSERT INTO generated_tracks (
          session_id, backing_track_url, midi_url, stems_folder_url,
          lyrics_url, download_package_url, total_size
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        sessionId,
        audioFiles.backingTrack,
        audioFiles.midi,
        audioFiles.stemsZip,
        audioFiles.lyrics,
        audioFiles.downloadPackage,
        audioFiles.totalSize
      ]);

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to save results: ${error.message}`);
    }
  }

  async sendSMSNotification(phoneNumber, sessionId, audioFiles) {
    const SMSService = require('./SMSService');
    const smsService = new SMSService();
    
    try {
      await smsService.sendDownloadLinks(phoneNumber, {
        sessionId,
        downloadUrl: `${process.env.BASE_URL || 'http://localhost:3001'}/downloads/${audioFiles.downloadPackage}`,
        filesGenerated: Object.keys(audioFiles).length
      });
    } catch (error) {
      logger.error('Failed to send SMS notification:', error);
      // Don't throw here - SMS failure shouldn't fail the whole process
    }
  }

  async cleanup(filePath) {
    try {
      await fs.unlink(filePath);
      logger.info('Cleaned up temp file:', filePath);
    } catch (error) {
      logger.warn('Failed to cleanup temp file:', filePath, error.message);
    }
  }
}

module.exports = AudioProcessor;
