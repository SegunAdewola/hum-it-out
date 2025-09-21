#!/bin/bash

# Hum It Out - Complete Project Builder
# This script sets up the entire Hum It Out project from scratch

set -e  # Exit on any error

echo "🎵 Building Hum It Out - Voice to Music System"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version must be 18 or higher. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    # Check if PostgreSQL is available (optional, can use Neon)
    if command -v psql &> /dev/null; then
        print_success "PostgreSQL found locally"
    else
        print_warning "PostgreSQL not found locally - will use Neon database"
    fi
    
    # Check if Docker is available (optional)
    if command -v docker &> /dev/null; then
        print_success "Docker found - containerized development available"
    else
        print_warning "Docker not found - will run directly on host"
    fi
    
    print_success "Prerequisites check completed"
}

# Create project structure
create_project_structure() {
    print_status "Creating project structure..."
    
    # Create main directories
    mkdir -p {backend/{src/{routes,services,agents,models,middleware,utils},uploads,generated,logs},frontend/{src/{components,utils,styles,hooks},public},database,docs,tests/{unit,integration,e2e},deploy}
    
    # Create subdirectories
    mkdir -p backend/src/{routes,services,agents,models,middleware,utils}
    mkdir -p frontend/src/{components,utils,styles,hooks}
    mkdir -p tests/{unit,integration,e2e,mocks,helpers}
    mkdir -p database/{migrations,seeds}
    mkdir -p deploy/{docker,kubernetes,terraform}
    
    print_success "Project structure created"
}

# Generate package.json files
create_package_files() {
    print_status "Creating package.json files..."
    
    # Root package.json
    cat > package.json << 'EOF'
{
  "name": "hum-it-out",
  "version": "1.0.0",
  "description": "Voice to music conversion system for Cascadia JS hackathon",
  "main": "backend/src/server.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "cd backend && npm run build",
    "build:frontend": "cd frontend && npm run build",
    "start": "cd backend && npm start",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
    "docker:build": "docker build -t hum-it-out .",
    "docker:run": "docker-compose up -d",
    "docker:stop": "docker-compose down",
    "setup": "./scripts/setup.sh",
    "tunnel": "ngrok http 3001"
  },
  "keywords": ["music", "ai", "voice", "hackathon", "cascadia-js"],
  "author": "Your Name",
  "license": "MIT",
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "@playwright/test": "^1.40.0",
    "concurrently": "^8.2.2",
    "eslint": "^8.55.0",
    "eslint-config-airbnb-base": "^15.0.0",
    "eslint-plugin-import": "^2.29.0",
    "husky": "^8.0.3",
    "jest": "^29.7.0",
    "nodemon": "^3.0.2",
    "prettier": "^3.1.0",
    "supertest": "^6.3.3"
  },
  "dependencies": {
    "dotenv": "^16.3.1"
  }
}
EOF

    # Backend package.json
    cat > backend/package.json << 'EOF'
{
  "name": "hum-it-out-backend",
  "version": "1.0.0",
  "description": "Backend API for Hum It Out",
  "main": "src/server.js",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "build": "echo 'Backend build completed'",
    "test": "jest",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "pg": "^8.11.3",
    "redis": "^4.6.10",
    "twilio": "^4.20.0",
    "openai": "^4.20.1",
    "autogen": "^0.2.0",
    "tone": "^14.7.77",
    "multer": "^1.4.5-lts.1",
    "archiver": "^6.0.1",
    "uuid": "^9.0.1",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "axios": "^1.6.2",
    "form-data": "^4.0.0",
    "mime-types": "^2.1.35",
    "node-cron": "^3.0.3",
    "socket.io": "^4.7.4",
    "ffmpeg-static": "^5.2.0",
    "sharp": "^0.32.6"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
EOF

    # Frontend package.json
    cat > frontend/package.json << 'EOF'
{
  "name": "hum-it-out-frontend",
  "version": "1.0.0",
  "description": "Frontend dashboard for Hum It Out",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext js,jsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.2",
    "socket.io-client": "^4.7.4",
    "wavesurfer.js": "^7.6.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.7",
    "lucide-react": "^0.294.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "vite": "^5.0.8"
  }
}
EOF
    
    print_success "Package.json files created"
}

# Create environment configuration
create_environment_config() {
    print_status "Creating environment configuration..."
    
    # .env.example
    cat > .env.example << 'EOF'
# Database Configuration
NEON_DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/dbname
DATABASE_URL=postgresql://username:password@localhost:5432/humitout

# Twilio Configuration  
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI Configuration
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AG2 Configuration
AG2_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AG2_ENDPOINT=https://api.ag2.ai/v1

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Server Configuration
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secure-jwt-secret-key

# File Storage (AWS S3 for production)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=hum-it-out-files
AWS_REGION=us-west-2

# ngrok (for development)
NGROK_AUTHTOKEN=your-ngrok-auth-token

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# Monitoring (optional)
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@sentry.io/xxxxxxx
NEW_RELIC_LICENSE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EOF

    # Copy to .env for development
    if [ ! -f .env ]; then
        cp .env.example .env
        print_warning "Created .env file from template - please update with your actual credentials"
    fi
    
    print_success "Environment configuration created"
}

# Create database schema
create_database_schema() {
    print_status "Creating database schema..."
    
    cat > database/schema.sql << 'EOF'
-- Hum It Out Database Schema
-- PostgreSQL database schema for voice-to-music system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table: Authentication and contact information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    pin VARCHAR(6) UNIQUE NOT NULL,
    phone VARCHAR(20),
    encrypted_phone TEXT,
    name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_pin_check CHECK (pin ~ '^\d{6}$')
);

-- Sessions table: Recording metadata and processing status  
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    call_sid VARCHAR(100),
    original_audio_url VARCHAR(500) NOT NULL,
    transcribed_lyrics TEXT,
    tempo INTEGER,
    detected_key VARCHAR(10),
    mood_tags TEXT[],
    genre_tags TEXT[],
    processing_status VARCHAR(20) DEFAULT 'pending',
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    audio_duration DECIMAL(8,3),
    audio_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT sessions_status_check CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    CONSTRAINT sessions_tempo_check CHECK (tempo BETWEEN 60 AND 200),
    CONSTRAINT sessions_duration_check CHECK (audio_duration BETWEEN 1 AND 300)
);

-- Generated tracks table: Output files and metadata
CREATE TABLE generated_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    backing_track_url VARCHAR(500),
    midi_url VARCHAR(500),  
    stems_folder_url VARCHAR(500),
    lyrics_url VARCHAR(500),
    metadata_url VARCHAR(500),
    download_package_url VARCHAR(500),
    generation_params JSONB,
    file_sizes JSONB,
    total_size INTEGER,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    
    CONSTRAINT generated_tracks_version_check CHECK (version >= 1),
    CONSTRAINT generated_tracks_size_check CHECK (total_size >= 0)
);

-- Call logs table: Security and analytics
CREATE TABLE call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20),
    call_sid VARCHAR(100),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    success BOOLEAN,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT call_logs_action_check CHECK (action IN ('incoming_call', 'pin_attempt', 'pin_success', 'pin_failure', 'recording_start', 'recording_complete', 'processing_start', 'processing_complete'))
);

-- Processing jobs table: Background job tracking
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'queued',
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    payload JSONB,
    result JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT processing_jobs_status_check CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    CONSTRAINT processing_jobs_priority_check CHECK (priority BETWEEN 1 AND 10)
);

-- Indexes for performance
CREATE INDEX idx_users_pin ON users(pin);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(processing_status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_sessions_call_sid ON sessions(call_sid) WHERE call_sid IS NOT NULL;

CREATE INDEX idx_tracks_session_id ON generated_tracks(session_id);
CREATE INDEX idx_tracks_version ON generated_tracks(session_id, version);
CREATE INDEX idx_tracks_expires_at ON generated_tracks(expires_at);

CREATE INDEX idx_call_logs_phone ON call_logs(phone_number);
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at DESC);
CREATE INDEX idx_call_logs_action ON call_logs(action);

CREATE INDEX idx_jobs_status ON processing_jobs(status);
CREATE INDEX idx_jobs_session_id ON processing_jobs(session_id);
CREATE INDEX idx_jobs_created_at ON processing_jobs(created_at DESC);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW user_dashboard_view AS
SELECT 
    u.id as user_id,
    u.email,
    u.pin,
    u.phone,
    u.name,
    u.created_at as user_created_at,
    COUNT(s.id) as total_sessions,
    COUNT(CASE WHEN s.processing_status = 'completed' THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN s.processing_status = 'pending' THEN 1 END) as pending_sessions,
    COUNT(CASE WHEN s.processing_status = 'failed' THEN 1 END) as failed_sessions,
    MAX(s.created_at) as last_session_at
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
GROUP BY u.id, u.email, u.pin, u.phone, u.name, u.created_at;

CREATE VIEW session_details_view AS
SELECT 
    s.*,
    u.email as user_email,
    u.name as user_name,
    COUNT(gt.id) as track_versions,
    MAX(gt.created_at) as latest_track_created_at,
    COALESCE(SUM(gt.download_count), 0) as total_downloads
FROM sessions s
JOIN users u ON s.user_id = u.id
LEFT JOIN generated_tracks gt ON s.id = gt.session_id
GROUP BY s.id, u.email, u.name;

-- Sample data for development (optional)
INSERT INTO users (email, pin, phone, name) VALUES 
('demo@humitout.com', '123456', '+1234567890', 'Demo User'),
('test@humitout.com', '654321', '+1987654321', 'Test User');

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO humitout_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO humitout_app;
EOF

    print_success "Database schema created"
}

# Create backend server files
create_backend_files() {
    print_status "Creating backend server files..."
    
    # Main server.js
    cat > backend/src/server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const config = require('./config/environment');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const DatabaseManager = require('./utils/database');

// Route imports
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const twilioRoutes = require('./routes/twilio');
const healthRoutes = require('./routes/health');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.cors.origin,
    methods: ["GET", "POST"]
  }
});

// Initialize database connection
const db = new DatabaseManager();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-twilio-signature']
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const twilioLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 calls per 5 minutes per IP
  message: 'Too many calls from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for valid Twilio requests
    const twilioSignature = req.headers['x-twilio-signature'];
    return twilioSignature && process.env.NODE_ENV === 'production';
  }
});

app.use('/api', generalLimiter);
app.use('/twilio', twilioLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer')
  });
  next();
});

// Socket.IO setup
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);
  
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    logger.info(`User ${userId} joined their room`);
  });
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);
app.set('db', db);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/twilio', twilioRoutes);
app.use('/health', healthRoutes);

// Serve static files (for downloads)
app.use('/downloads', express.static('generated', {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Hum It Out API',
    version: '1.0.0',
    description: 'Voice to music conversion API',
    endpoints: {
      auth: '/api/auth',
      dashboard: '/api/dashboard', 
      twilio: '/twilio',
      health: '/health'
    }
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    db.close().then(() => {
      logger.info('Database connections closed');
      process.exit(0);
    }).catch((error) => {
      logger.error('Error during database shutdown:', error);
      process.exit(1);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const PORT = config.server.port || 3001;
const HOST = config.server.host || '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.info(`🎵 Hum It Out API server running on http://${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Press Ctrl+C to stop the server');
});

module.exports = { app, server, io };
EOF

    # Configuration file
    mkdir -p backend/src/config
    cat > backend/src/config/environment.js << 'EOF'
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
EOF

    print_success "Backend server files created"
}

# Create Twilio routes
create_twilio_routes() {
    print_status "Creating Twilio webhook routes..."
    
    cat > backend/src/routes/twilio.js << 'EOF'
const express = require('express');
const twilio = require('twilio');
const { VoiceResponse } = require('twilio').twiml;
const config = require('../config/environment');
const logger = require('../utils/logger');
const TwilioService = require('../services/TwilioService');
const AuthService = require('../services/AuthService');
const ProcessingService = require('../services/ProcessingService');

const router = express.Router();
const twilioService = new TwilioService();

// Twilio webhook signature validation middleware
const validateTwilioSignature = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    // Skip validation in development
    return next();
  }

  const twilioSignature = req.headers['x-twilio-signature'];
  const url = `https://${req.headers.host}${req.originalUrl}`;
  const params = req.body;

  const isValid = twilio.validateRequest(
    config.twilio.authToken,
    twilioSignature,
    url,
    params
  );

  if (!isValid) {
    logger.warn('Invalid Twilio signature:', {
      signature: twilioSignature,
      url,
      params
    });
    return res.status(403).send('Invalid Twilio signature');
  }

  next();
};

// Incoming call handler
router.post('/voice', validateTwilioSignature, async (req, res) => {
  const twiml = new VoiceResponse();
  
  try {
    const { From, To, CallSid } = req.body;
    
    logger.info('Incoming call:', {
      from: From,
      to: To,
      callSid: CallSid
    });

    // Log the call
    await twilioService.logCall(CallSid, From, 'incoming_call', true);

    // Greet user and request PIN
    const gather = twiml.gather({
      input: 'dtmf',
      timeout: 10,
      numDigits: 6,
      finishOnKey: '#',
      action: '/twilio/authenticate',
      method: 'POST'
    });

    gather.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Welcome to Hum It Out! Please enter your 6-digit PIN, followed by the pound key.');

    // Fallback if no input received
    twiml.say({
      voice: 'alice'
    }, 'I didn\'t receive your PIN. Please call back and try again. Goodbye!');

  } catch (error) {
    logger.error('Error handling incoming call:', error);
    twiml.say('Sorry, there was a technical issue. Please try again later.');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// PIN authentication handler
router.post('/authenticate', validateTwilioSignature, async (req, res) => {
  const twiml = new VoiceResponse();
  
  try {
    const { Digits, From, CallSid } = req.body;
    
    logger.info('PIN authentication attempt:', {
      digits: Digits ? 'REDACTED' : 'null',
      from: From,
      callSid: CallSid
    });

    // Validate PIN format
    if (!Digits || !/^\d{6}$/.test(Digits)) {
      await twilioService.logCall(CallSid, From, 'pin_failure', false, 'Invalid PIN format');
      twiml.say('Invalid PIN format. Please call back and enter a 6-digit number.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Authenticate user
    const user = await AuthService.validatePIN(Digits);
    
    if (!user) {
      await twilioService.logCall(CallSid, From, 'pin_failure', false, 'Invalid PIN');
      twiml.say('Invalid PIN. Please check your PIN and try again.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Log successful authentication
    await twilioService.logCall(CallSid, From, 'pin_success', true, null, user.id);

    // Proceed to recording
    twiml.say({
      voice: 'alice'
    }, `Welcome back! Start humming or singing your melody after the beep. You have 30 seconds. Go!`);

    twiml.record({
      maxLength: 30,
      timeout: 5,
      playBeep: true,
      trim: 'trim-silence',
      recordingStatusCallback: `/twilio/recording-status?userId=${user.id}&callSid=${CallSid}`,
      action: `/twilio/recording-complete?userId=${user.id}&callSid=${CallSid}`,
      method: 'POST'
    });

    twiml.say('Thank you for recording. We\'re processing your music now!');

  } catch (error) {
    logger.error('Authentication error:', error);
    await twilioService.logCall(req.body.CallSid, req.body.From, 'pin_failure', false, error.message);
    twiml.say('Sorry, there was a technical issue during authentication. Please try again.');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Recording completion handler
router.post('/recording-complete', validateTwilioSignature, async (req, res) => {
  const twiml = new VoiceResponse();
  
  try {
    const { userId, callSid } = req.query;
    const { RecordingUrl, RecordingSid, RecordingDuration } = req.body;

    logger.info('Recording completed:', {
      userId,
      callSid,
      recordingSid: RecordingSid,
      duration: RecordingDuration,
      url: RecordingUrl ? 'provided' : 'missing'
    });

    if (!RecordingUrl) {
      throw new Error('No recording URL provided');
    }

    // Log recording completion
    await twilioService.logCall(callSid, req.body.From, 'recording_complete', true, null, userId);

    // Queue processing job
    await ProcessingService.queueProcessingJob({
      userId,
      callSid,
      recordingUrl: RecordingUrl + '.wav', // Get WAV format
      recordingSid: RecordingSid,
      duration: parseInt(RecordingDuration),
      phoneNumber: req.body.From
    });

    // Immediate response to user
    twiml.say({
      voice: 'alice'
    }, 'Perfect! Your recording is being processed. You\'ll receive a text message with download links in about one minute. Thank you for using Hum It Out!');

  } catch (error) {
    logger.error('Recording completion error:', error);
    twiml.say('There was an issue processing your recording. Please try again.');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Recording status callback (for monitoring)
router.post('/recording-status', validateTwilioSignature, async (req, res) => {
  try {
    const { userId, callSid } = req.query;
    const { RecordingStatus, RecordingSid } = req.body;

    logger.info('Recording status update:', {
      userId,
      callSid,
      recordingSid: RecordingSid,
      status: RecordingStatus
    });

    // Update processing status if needed
    if (RecordingStatus === 'failed') {
      await ProcessingService.handleRecordingFailure(userId, callSid, 'Recording failed');
    }

  } catch (error) {
    logger.error('Recording status error:', error);
  }

  res.sendStatus(200);
});

// Error handler for Twilio webhooks
router.use((error, req, res, next) => {
  logger.error('Twilio webhook error:', error);
  
  const twiml = new VoiceResponse();
  twiml.say('Sorry, there was a technical issue. Please try again later.');
  
  res.type('text/xml');
  res.send(twiml.toString());
});

module.exports = router;
EOF

    print_success "Twilio routes created"
}

# Create services
create_services() {
    print_status "Creating service layer..."
    
    # AudioProcessor service
    cat > backend/src/services/AudioProcessor.js << 'EOF'
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

      // Step 6: Generate music with AG2
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
EOF

    print_success "AudioProcessor service created"
}

# Create AG2 agents
create_ag2_agents() {
    print_status "Creating AG2 multi-agent system..."
    
    cat > backend/src/agents/AG2MusicGenerator.js << 'EOF'
const autogen = require('autogen');
const config = require('../config/environment');
const logger = require('../utils/logger');

class AG2MusicGenerator {
  constructor() {
    this.config = {
      model: config.openai.model,
      api_key: config.openai.apiKey,
      temperature: 0.7,
      max_tokens: 1500
    };
    
    this.agents = this.initializeAgents();
  }

  initializeAgents() {
    // Music Analyst - Interprets audio data and provides musical insights
    const musicAnalyst = new autogen.AssistantAgent({
      name: "MusicAnalyst",
      system_message: `
      You are a professional music analyst and audio engineer with 20+ years of experience.
      
      Your role is to analyze audio transcriptions and provide detailed musical insights:
      - Extract tempo from vocal rhythm patterns and word timing
      - Identify key signatures from melodic content hints
      - Classify mood and energy from lyrical content and delivery style
      - Suggest appropriate song structures based on content patterns
      - Provide confidence scores for your analysis
      
      Always provide structured, actionable insights that other agents can use for music generation.
      Be specific about musical elements and explain your reasoning.
      
      Output format: Always respond with JSON containing your analysis.
      `,
      llm_config: this.config
    });

    // Chord Composer - Creates harmonic progressions
    const chordComposer = new autogen.AssistantAgent({
      name: "ChordComposer",
      system_message: `
      You are a harmony expert and chord progression composer with deep knowledge of music theory.
      
      Your expertise includes:
      - Circle of fifths and voice leading principles
      - Genre-appropriate chord progressions (pop, jazz, rock, electronic)
      - Chord extensions and substitutions
      - Rhythm and timing for chord changes
      - MIDI note mapping for digital audio workstations
      
      Based on musical analysis from the MusicAnalyst, create compelling chord progressions that:
      - Match the detected key and mood
      - Fit the estimated tempo and song structure
      - Provide multiple complexity levels (simple, intermediate, advanced)
      - Include proper voice leading and musical flow
      
      Output format: Provide chord symbols, Roman numeral analysis, and specific MIDI notes.
      `,
      llm_config: this.config
    });

    // Genre Specialist - Adapts music to different styles  
    const genreSpecialist = new autogen.AssistantAgent({
      name: "GenreSpecialist",
      system_message: `
      You are a multi-genre music specialist with expertise across diverse musical styles:
      
      Genre expertise:
      - Pop/Rock: Power chords, driving rhythms, accessible melodies
      - Jazz: Extended chords (7ths, 9ths, 11ths), swing rhythms, complex harmonies
      - Electronic/EDM: Synthesizer timbres, programmed drums, build-ups and drops
      - Acoustic/Folk: Natural instruments, organic feel, simple arrangements
      - Hip-Hop/R&B: Sample-based production, strong groove, rhythmic emphasis
      - Classical: Orchestral arrangements, complex harmonies, formal structures
      
      Take chord progressions and musical analysis, then adapt them to specified genres by:
      - Modifying chord voicings and extensions for genre authenticity
      - Suggesting appropriate instrumentation and timbres
      - Adjusting rhythm patterns and groove feels
      - Recommending production techniques and effects
      - Providing tempo and arrangement modifications
      
      Output format: Genre-specific adaptations with detailed instrumentation suggestions.
      `,
      llm_config: this.config
    });

    // Arrangement Director - Final production decisions
    const arrangementDirector = new autogen.AssistantAgent({
      name: "ArrangementDirector", 
      system_message: `
      You are an arrangement director and music producer with extensive experience in creating 
      professional recordings and preparing music for digital audio workstations.
      
      Your responsibilities:
      - Make final decisions about instrumentation and arrangement
      - Determine mix balance and relative levels for different stems
      - Choose appropriate production techniques and effects
      - Optimize arrangements for DAW import and further production
      - Consider the target audience and intended use case
      - Ensure all elements work together musically
      
      Key considerations:
      - File organization for easy DAW import
      - Stem separation for maximum flexibility
      - Loop points and musical timing
      - Dynamic range and mix headroom
      - Genre-appropriate production choices
      
      Based on input from other agents, make final production decisions and provide:
      - Complete instrumentation list with specific sounds/samples
      - Arrangement structure (intro, verse, chorus, outro)
      - Mix guidelines (levels, panning, basic EQ suggestions)
      - File naming and organization recommendations
      
      Output format: Complete production blueprint with technical specifications.
      `,
      llm_config: this.config
    });

    return {
      analyst: musicAnalyst,
      composer: chordComposer,
      specialist: genreSpecialist,
      director: arrangementDirector
    };
  }

  async generateMusic(musicalAnalysis, transcription) {
    try {
      logger.info('Starting AG2 multi-agent music generation:', {
        tempo: musicalAnalysis.tempo,
        key: musicalAnalysis.key,
        mood: musicalAnalysis.mood,
        textLength: transcription.text.length
      });

      // Step 1: Enhanced Musical Analysis
      const enhancedAnalysis = await this.runAnalysisAgent(musicalAnalysis, transcription);
      
      // Step 2: Chord Progression Generation
      const chordProgression = await this.runComposerAgent(enhancedAnalysis);
      
      // Step 3: Genre Adaptation
      const genreAdaptation = await this.runGenreSpecialist(chordProgression, enhancedAnalysis);
      
      // Step 4: Final Arrangement
      const finalArrangement = await this.runArrangementDirector(genreAdaptation, enhancedAnalysis);
      
      const result = {
        analysis: enhancedAnalysis,
        chords: chordProgression,
        genre: genreAdaptation,
        arrangement: finalArrangement,
        generatedAt: new Date().toISOString()
      };
      
      logger.info('AG2 music generation completed successfully');
      
      return result;
      
    } catch (error) {
      logger.error('AG2 music generation failed:', error);
      throw new Error(`Music generation failed: ${error.message}`);
    }
  }

  async runAnalysisAgent(musicalAnalysis, transcription) {
    const prompt = `
    As the MusicAnalyst, enhance this initial musical analysis with deeper insights:
    
    Initial Analysis:
    ${JSON.stringify(musicalAnalysis, null, 2)}
    
    Transcription Data:
    - Text: "${transcription.text}"
    - Duration: ${transcription.duration} seconds
    - Word segments: ${transcription.segments.length}
    - Confidence: ${transcription.confidence}
    
    Provide enhanced analysis focusing on:
    1. Refined tempo estimation based on word timing patterns
    2. More precise key and scale suggestions  
    3. Detailed mood and energy analysis
    4. Song structure recommendations
    5. Rhythmic patterns identified from speech rhythm
    6. Melodic hints from vocal inflection patterns
    
    Respond with enhanced JSON analysis.
    `;

    const response = await this.agents.analyst.generate_reply(prompt);
    return this.parseAgentResponse(response, 'MusicAnalyst');
  }

  async runComposerAgent(analysis) {
    const prompt = `
    As the ChordComposer, create compelling chord progressions based on this analysis:
    
    ${JSON.stringify(analysis, null, 2)}
    
    Generate:
    1. Primary chord progression (4-8 chords) in the detected key
    2. Alternative progressions for verse/chorus contrast
    3. MIDI note mappings for each chord
    4. Chord timing and rhythm patterns
    5. Voice leading considerations
    6. Complexity variations (simple, intermediate, advanced)
    
    Ensure progressions are:
    - Musically satisfying and memorable
    - Appropriate for the detected mood and genre
    - Optimized for the estimated tempo
    - Easy to loop and extend
    
    Respond with detailed chord progression data in JSON format.
    `;

    const response = await this.agents.composer.generate_reply(prompt);
    return this.parseAgentResponse(response, 'ChordComposer');
  }

  async runGenreSpecialist(chordProgression, analysis) {
    const primaryGenre = analysis.genres && analysis.genres[0] ? analysis.genres[0] : 'pop';
    
    const prompt = `
    As the GenreSpecialist, adapt these chord progressions for ${primaryGenre} genre:
    
    Chord Progressions:
    ${JSON.stringify(chordProgression, null, 2)}
    
    Musical Analysis:
    ${JSON.stringify(analysis, null, 2)}
    
    Create genre-specific adaptations:
    1. Modify chord voicings for ${primaryGenre} authenticity
    2. Suggest appropriate instrumentation (drums, bass, lead, pads)
    3. Define rhythm patterns and groove characteristics
    4. Recommend production techniques and effects
    5. Propose arrangement variations for intro/verse/chorus
    6. Consider typical ${primaryGenre} song structures
    
    Also provide lighter adaptations for 2 additional complementary genres.
    
    Respond with comprehensive genre adaptation in JSON format.
    `;

    const response = await this.agents.specialist.generate_reply(prompt);
    return this.parseAgentResponse(response, 'GenreSpecialist');
  }

  async runArrangementDirector(genreAdaptation, analysis) {
    const prompt = `
    As the ArrangementDirector, finalize the production decisions:
    
    Genre Adaptations:
    ${JSON.stringify(genreAdaptation, null, 2)}
    
    Original Analysis:
    ${JSON.stringify(analysis, null, 2)}
    
    Make final production decisions:
    1. Select specific instruments and sounds for each stem
    2. Define arrangement structure (intro, verse, chorus, outro)
    3. Set mix levels and balance between elements
    4. Choose production effects and processing
    5. Optimize for DAW compatibility and user editing
    6. Ensure professional quality and musical coherence
    
    Consider target use case: Musicians importing into DAWs for further production.
    
    Final deliverable specifications:
    - Individual stems (drums, bass, chords, melody guide)
    - Mixed backing track
    - MIDI file with all parts
    - Tempo-locked and loop-ready files
    
    Respond with complete production blueprint in JSON format.
    `;

    const response = await this.agents.director.generate_reply(prompt);
    return this.parseAgentResponse(response, 'ArrangementDirector');
  }

  parseAgentResponse(response, agentName) {
    try {
      // Extract JSON from agent response (agents might include explanation text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`No JSON found in ${agentName} response`);
      }
    } catch (error) {
      logger.error(`Failed to parse ${agentName} response:`, {
        error: error.message,
        response: response.substring(0, 200) + '...'
      });
      
      // Return fallback response based on agent type
      return this.getFallbackResponse(agentName);
    }
  }

  getFallbackResponse(agentName) {
    const fallbacks = {
      MusicAnalyst: {
        tempo: 120,
        key: 'C',
        mood: ['neutral'],
        energy: 5,
        structure: 'verse-chorus',
        confidence: 0.3
      },
      ChordComposer: {
        primaryProgression: ['C', 'Am', 'F', 'G'],
        chordNotes: {
          'C': ['C4', 'E4', 'G4'],
          'Am': ['A3', 'C4', 'E4'], 
          'F': ['F3', 'A3', 'C4'],
          'G': ['G3', 'B3', 'D4']
        },
        timing: 'whole notes'
      },
      GenreSpecialist: {
        primaryGenre: 'pop',
        instrumentation: ['drums', 'bass', 'piano', 'melody'],
        rhythmPattern: 'steady four-four',
        production: 'clean and polished'
      },
      ArrangementDirector: {
        structure: ['intro', 'verse', 'chorus', 'outro'],
        stems: ['drums', 'bass', 'chords', 'melody'],
        mixLevels: { drums: 0.8, bass: 0.7, chords: 0.6, melody: 0.9 },
        effects: 'reverb and compression'
      }
    };
    
    return fallbacks[agentName] || { error: 'Fallback failed' };
  }
}

module.exports = AG2MusicGenerator;
EOF

    print_success "AG2 multi-agent system created"
}

# Install all dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Root dependencies
    npm install
    
    # Backend dependencies
    cd backend
    npm install
    cd ..
    
    # Frontend dependencies
    cd frontend
    npm install
    cd ..
    
    print_success "All dependencies installed"
}

# Create development scripts
create_dev_scripts() {
    print_status "Creating development scripts..."
    
    mkdir -p scripts
    
    # Database setup script
    cat > scripts/setup-db.js << 'EOF'
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  const config = {
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };

  const pool = new Pool(config);

  try {
    console.log('🔧 Setting up database...');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    
    console.log('✅ Database schema created successfully');
    
    // Test connection
    const result = await pool.query('SELECT COUNT(*) as user_count FROM users');
    console.log(`📊 Database ready - ${result.rows[0].user_count} users found`);
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
EOF

    # Make it executable
    chmod +x scripts/setup-db.js
    
    print_success "Development scripts created"
}

# Create final project structure
finalize_project() {
    print_status "Finalizing project setup..."
    
    # Create remaining essential files
    echo "node_modules/" > .gitignore
    echo ".env" >> .gitignore
    echo "uploads/" >> .gitignore
    echo "generated/" >> .gitignore
    echo "temp/" >> .gitignore
    echo "logs/" >> .gitignore
    echo "*.log" >> .gitignore
    echo ".DS_Store" >> .gitignore
    
    # Create README
    echo "# 🎵 Hum It Out" > README.md
    echo "" >> README.md
    echo "Voice to music conversion system built for Cascadia JS hackathon." >> README.md
    echo "" >> README.md
    echo "## Quick Start" >> README.md
    echo "" >> README.md
    echo "\`\`\`bash" >> README.md
    echo "./build.sh" >> README.md
    echo "\`\`\`" >> README.md
    
    print_success "Project structure finalized"
}

# Main execution
main() {
    echo "🎵 Starting Hum It Out project build..."
    echo ""
    
    check_prerequisites
    echo ""
    
    create_project_structure
    echo ""
    
    create_package_files
    echo ""
    
    create_environment_config
    echo ""
    
    create_database_schema
    echo ""
    
    create_backend_files
    echo ""
    
    create_twilio_routes
    echo ""
    
    create_services
    echo ""
    
    create_ag2_agents
    echo ""
    
    install_dependencies
    echo ""
    
    create_dev_scripts
    echo ""
    
    finalize_project
    echo ""
    
    print_success "🎉 Hum It Out project build completed!"
    echo ""
    echo "Next steps:"
    echo "1. Update .env file with your API keys"
    echo "2. Run: npm run dev"
    echo "3. Set up ngrok: npm run tunnel"
    echo "4. Configure Twilio webhooks to your ngrok URL"
    echo ""
    echo "📁 Project structure created in: $(pwd)"
    echo "🚀 Ready to build amazing voice-to-music experiences!"
}

# Run main function
main