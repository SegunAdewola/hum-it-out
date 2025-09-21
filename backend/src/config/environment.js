// Load environment variables first
require('dotenv').config();

const path = require('path');

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // Database configuration
  database: {
    url: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000
    }
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3
  },

  // Twilio configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    webhookUrl: process.env.TWILIO_WEBHOOK_URL || 'http://localhost:3001/twilio'
  },

  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview',
    whisperModel: 'whisper-1'
  },

  // Langflow configuration
  langflow: {
    endpoint: process.env.LANGFLOW_ENDPOINT || 'http://localhost:7860/api/v1/run',
    apiKey: process.env.LANGFLOW_API_KEY
  },

  // AG2 configuration
  ag2: {
    apiKey: process.env.AG2_API_KEY,
    endpoint: process.env.AG2_ENDPOINT || 'https://api.ag2.ai/v1'
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-this-in-production',
    expiresIn: '24h'
  },

  // File storage configuration
  storage: {
    local: {
      uploadsDir: path.join(__dirname, '../../uploads'),
      generatedDir: path.join(__dirname, '../../generated'),
      tempDir: path.join(__dirname, '../../temp')
    },
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-west-2',
      bucket: process.env.S3_BUCKET_NAME
    }
  },

  // CORS configuration
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : 'http://localhost:3000'
  },

  // Encryption configuration
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'change-this-to-32-character-key!',
    algorithm: 'aes-256-gcm'
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // requests per window
  },

  // Audio processing
  audio: {
    maxDuration: 30, // seconds
    maxSize: 10 * 1024 * 1024, // 10MB
    sampleRate: 48000,
    bitDepth: 24,
    channels: 2
  },

  // File retention
  retention: {
    tempFiles: 24 * 60 * 60 * 1000, // 24 hours
    generatedFiles: 30 * 24 * 60 * 60 * 1000, // 30 days
    sessionData: 90 * 24 * 60 * 60 * 1000 // 90 days
  }
};

module.exports = config;
