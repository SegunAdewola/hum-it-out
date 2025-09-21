# 🔧 BUILDER.md - Implementation Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Design](#database-design)  
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [AI/ML Pipeline](#aiml-pipeline)
6. [Twilio Integration](#twilio-integration)
7. [File Management](#file-management)
8. [Security & Authentication](#security--authentication)
9. [Performance Optimization](#performance-optimization)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Architecture](#deployment-architecture)

---

## Architecture Overview

### System Design Philosophy

**Decision: Microservices-inspired Modular Monolith**
- **Why**: Hackathon timeline requires rapid development and simple deployment
- **Trade-off**: Sacrifices theoretical scalability for practical implementation speed
- **Implementation**: Clear service boundaries within single codebase

**Decision: Phone-First Interface**
- **Why**: Unique value proposition, no app installation barrier
- **Trade-off**: Audio quality limited by phone infrastructure
- **Implementation**: Twilio handles telephony complexity, we focus on AI processing

**Decision: Async Processing Pipeline**
- **Why**: Prevents call timeouts, better user experience
- **Trade-off**: Added complexity in state management
- **Implementation**: SMS notifications bridge the async gap

### Technology Stack Rationale

#### Backend: Node.js + Express
**Why Node.js:**
- JavaScript ecosystem consistency (frontend/backend)
- Excellent async I/O for audio processing
- Rich package ecosystem for AI/audio libraries
- Fast prototyping for hackathon timeline

**Why Express:**
- Minimal overhead for API development
- Easy Twilio webhook integration
- Middleware ecosystem for common needs
- Simple routing for REST API

#### Frontend: React + Tailwind
**Why React:**
- Component reusability for session cards
- State management for real-time updates
- Easy integration with audio playback
- Developer familiarity for rapid development

**Why Tailwind:**
- Rapid UI development without CSS files
- Consistent design system
- Dark mode support out-of-the-box
- Small bundle size when purged

#### Database: PostgreSQL (Neon)
**Why PostgreSQL:**
- JSONB support for flexible AI metadata
- UUID primary keys for security
- Array data types for mood tags
- ACID compliance for financial/user data

**Why Neon:**
- Serverless PostgreSQL (no server management)
- Branch-like database copies for testing
- Auto-scaling for hackathon demo spikes
- Built-in connection pooling

---

## Database Design

### Schema Architecture

```sql
-- Users table: Authentication and contact info
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  pin VARCHAR(6) UNIQUE NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table: Recording metadata and analysis
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_audio_url VARCHAR(500) NOT NULL,
  transcribed_lyrics TEXT,
  tempo INTEGER,
  detected_key VARCHAR(10),
  mood_tags TEXT[],
  processing_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Generated tracks table: Output files and metadata
CREATE TABLE generated_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  backing_track_url VARCHAR(500),
  midi_url VARCHAR(500),
  stems_folder_url VARCHAR(500),
  lyrics_url VARCHAR(500),
  generation_params JSONB,
  file_sizes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_pin ON users(pin);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_tracks_session_id ON generated_tracks(session_id);
```

### Design Decisions

**UUID Primary Keys:**
- **Why**: Non-enumerable IDs prevent data scraping
- **Trade-off**: 16-byte overhead vs 4-byte integers
- **Implementation**: PostgreSQL `gen_random_uuid()` for performance

**PIN as VARCHAR(6):**
- **Why**: Leading zeros preservation (e.g., "001234")
- **Trade-off**: String comparison vs integer comparison
- **Implementation**: Database constraint ensures exactly 6 digits

**JSONB for Metadata:**
- **Why**: Flexible storage for AI-generated parameters
- **Trade-off**: Less queryable vs structured columns
- **Implementation**: Store chord progressions, tempo variations, generation settings

**Array Types for Tags:**
- **Why**: PostgreSQL native support for multi-value fields
- **Trade-off**: Database-specific vs normalized junction table
- **Implementation**: `TEXT[]` for mood tags (upbeat, melancholy, energetic)

**Cascading Deletes:**
- **Why**: Data consistency when users delete accounts
- **Trade-off**: Accidental data loss vs orphaned records
- **Implementation**: `ON DELETE CASCADE` with soft delete option

---

## Backend Implementation

### Server Architecture

```javascript
// server.js - Main application entry point
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow Twilio webhooks
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com' 
    : 'http://localhost:3000',
  credentials: true
}));

// Rate limiting for API protection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Twilio-specific rate limiting (stricter)
const twilioLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10 // 10 calls per 5 minutes per IP
});
app.use('/twilio', twilioLimiter);
```

**Design Decisions:**

**Express Middleware Stack:**
- **Helmet**: Security headers (XSS, clickjacking protection)
- **CORS**: Controlled cross-origin access for frontend
- **Rate Limiting**: API abuse prevention
- **Body Parsing**: JSON/URL-encoded request handling

**Environment Configuration:**
```javascript
// config/environment.js
module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.NEON_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview'
  },
  ag2: {
    apiKey: process.env.AG2_API_KEY,
    endpoint: process.env.AG2_ENDPOINT
  }
};
```

### Service Layer Architecture

```javascript
// services/AudioProcessor.js - Core audio processing logic
class AudioProcessor {
  constructor() {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    this.agents = new AG2MultiAgentSystem();
  }

  async processRecording(userId, recordingUrl) {
    try {
      // Step 1: Download and validate audio
      const audioFile = await this.downloadAudio(recordingUrl);
      await this.validateAudioFile(audioFile);

      // Step 2: Transcribe with OpenAI Whisper
      const transcription = await this.transcribeAudio(audioFile);
      
      // Step 3: Extract musical features
      const musicalAnalysis = await this.analyzeMusicalElements(transcription);
      
      // Step 4: Create database session
      const session = await this.createSession(userId, {
        audioUrl: recordingUrl,
        lyrics: transcription.text,
        ...musicalAnalysis
      });

      // Step 5: Generate music with AG2 agents
      const generatedMusic = await this.agents.generateMusic(musicalAnalysis);
      
      // Step 6: Create and save files
      const files = await this.createAudioFiles(session.id, generatedMusic);
      
      // Step 7: Update session with results
      await this.saveGeneratedFiles(session.id, files);
      
      return { sessionId: session.id, files };
      
    } catch (error) {
      await this.handleProcessingError(userId, error);
      throw error;
    }
  }
}
```

**Design Decisions:**

**Service Layer Pattern:**
- **Why**: Business logic separation from HTTP concerns
- **Implementation**: Each service handles one domain (Audio, User, File)
- **Benefits**: Testability, reusability, clear boundaries

**Error Handling Strategy:**
```javascript
// middleware/errorHandler.js
class ErrorHandler {
  static handle(error, req, res, next) {
    // Log error details for debugging
    logger.error('Request error:', {
      method: req.method,
      url: req.url,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Twilio webhook errors need special handling
    if (req.path.startsWith('/twilio')) {
      return this.handleTwilioError(error, res);
    }

    // API errors return JSON
    if (req.path.startsWith('/api')) {
      return this.handleAPIError(error, res);
    }

    // Default server error
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
}
```

**Database Connection Management:**
```javascript
// database/connection.js
const { Pool } = require('pg');

class DatabaseManager {
  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries for optimization
      if (duration > 1000) {
        logger.warn('Slow query detected:', { text, duration });
      }
      
      return res;
    } catch (error) {
      logger.error('Database query error:', { text, error: error.message });
      throw error;
    }
  }
}
```

---

## Frontend Implementation

### Component Architecture

```javascript
// src/App.jsx - Main application component
import React, { useState, useEffect, createContext } from 'react';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import { useAuth } from './hooks/useAuth';
import { useWebSocket } from './hooks/useWebSocket';

// Global state context
export const AppContext = createContext();

function App() {
  const { user, loading, login, logout } = useAuth();
  const { connectionStatus, sessionUpdates } = useWebSocket();
  
  return (
    <AppContext.Provider value={{ user, connectionStatus }}>
      <div className="app min-h-screen bg-gray-900 text-gray-100">
        {loading ? (
          <LoadingSpinner />
        ) : user ? (
          <Dashboard user={user} sessionUpdates={sessionUpdates} />
        ) : (
          <AuthModal onLogin={login} />
        )}
      </div>
    </AppContext.Provider>
  );
}
```

**Design Decisions:**

**Context API vs Redux:**
- **Choice**: React Context for simple state management
- **Why**: Hackathon timeline doesn't justify Redux complexity
- **Trade-off**: Less optimized re-renders vs development speed
- **Implementation**: Single context for user/session data

**Component Structure:**
```
src/components/
├── Dashboard.jsx           # Main user interface
├── SessionCard.jsx         # Individual session display
├── AudioPlayer.jsx         # Waveform visualization & playback
├── DownloadManager.jsx     # File download handling
├── PinDisplay.jsx          # PIN code visualization
├── LoadingSpinner.jsx      # Loading states
└── AuthModal.jsx           # Login/registration
```

### Real-time Updates

```javascript
// hooks/useWebSocket.js - Real-time session updates
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function useWebSocket() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [sessionUpdates, setSessionUpdates] = useState({});

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3001');
    
    newSocket.on('connect', () => {
      setConnectionStatus('connected');
    });

    newSocket.on('session_update', (update) => {
      setSessionUpdates(prev => ({
        ...prev,
        [update.sessionId]: update
      }));
    });

    newSocket.on('processing_complete', (data) => {
      // Refresh session data when processing completes
      window.dispatchEvent(new CustomEvent('refreshSessions'));
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return { connectionStatus, sessionUpdates };
}
```

**Design Decisions:**

**WebSocket Integration:**
- **Why**: Real-time processing updates enhance UX
- **Implementation**: Socket.io for reliability across browsers
- **Benefits**: Users see progress without page refresh

**Audio Playback Implementation:**
```javascript
// components/AudioPlayer.jsx - Audio visualization and playback
import React, { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

function AudioPlayer({ audioUrl, title, duration }) {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    // Initialize WaveSurfer for audio visualization
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#58a6ff',
      progressColor: '#1f6feb',
      cursorColor: '#f0f6fc',
      barWidth: 2,
      barRadius: 3,
      responsive: true,
      height: 40,
      normalize: true
    });

    wavesurfer.current.load(audioUrl);

    // Event listeners
    wavesurfer.current.on('ready', () => {
      const duration = wavesurfer.current.getDuration();
      setDuration(duration);
    });

    wavesurfer.current.on('audioprocess', () => {
      setCurrentTime(wavesurfer.current.getCurrentTime());
    });

    return () => wavesurfer.current.destroy();
  }, [audioUrl]);

  const togglePlayback = () => {
    if (isPlaying) {
      wavesurfer.current.pause();
    } else {
      wavesurfer.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="audio-player bg-gray-800 p-4 rounded-lg">
      <div ref={waveformRef} className="mb-3" />
      <div className="flex items-center justify-between">
        <button 
          onClick={togglePlayback}
          className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <span className="text-sm text-gray-400 font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
```

**Audio Library Choice:**
- **WaveSurfer.js**: Professional waveform visualization
- **Web Audio API**: Low-level audio processing when needed
- **HTML5 Audio**: Fallback for simple playback

---

## AI/ML Pipeline

### Multi-Agent Architecture (AG2)

```python
# agents/MusicGenerationAgents.py - AG2 multi-agent system
import autogen
from typing import Dict, List, Any

class MusicGenerationSystem:
    def __init__(self):
        self.config = {
            "model": "gpt-4-turbo-preview",
            "api_key": os.getenv("OPENAI_API_KEY"),
            "temperature": 0.7
        }
        
        self.agents = self._initialize_agents()
        self.workflow = self._setup_workflow()

    def _initialize_agents(self):
        """Initialize specialized music agents"""
        
        # Music Analyst - Interprets audio data
        music_analyst = autogen.AssistantAgent(
            name="MusicAnalyst",
            system_message="""
            You are a professional music analyst and audio engineer. 
            Your role is to analyze audio transcriptions and extract musical elements:
            - Tempo (BPM) estimation from vocal rhythm
            - Key signature detection from pitch patterns  
            - Mood/genre classification from lyrical content and vocal tone
            - Song structure suggestions (verse, chorus, bridge)
            
            Always provide structured JSON output with confidence scores.
            Focus on actionable insights for music production.
            """,
            llm_config=self.config
        )

        # Chord Composer - Creates harmonic progressions
        chord_composer = autogen.AssistantAgent(
            name="ChordComposer", 
            system_message="""
            You are a harmony expert and chord progression composer.
            Based on musical analysis, create compelling chord progressions:
            - Use music theory principles (circle of fifths, voice leading)
            - Match the detected key and mood
            - Suggest multiple variations (simple, complex, jazz extensions)
            - Provide timing and rhythm information
            
            Output chord symbols, Roman numeral analysis, and MIDI note data.
            Prioritize musically satisfying progressions over complexity.
            """,
            llm_config=self.config
        )

        # Genre Specialist - Adapts music to different styles
        genre_specialist = autogen.AssistantAgent(
            name="GenreSpecialist",
            system_message="""
            You are a multi-genre music specialist with expertise across:
            - Pop/Rock: Power chords, driving rhythms
            - Jazz: Extended chords, swing rhythms
            - Electronic: Synthesizer timbres, programmed drums
            - Acoustic: Natural instruments, organic feel
            - Hip-Hop: Sample-based, strong beats
            
            Take chord progressions and adapt them to specified genres.
            Suggest appropriate instrumentation, tempo adjustments, and production techniques.
            """,
            llm_config=self.config
        )

        # Arrangement Director - Final production decisions
        arrangement_director = autogen.AssistantAgent(
            name="ArrangementDirector",
            system_message="""
            You are an arrangement director and music producer.
            Make final decisions about:
            - Instrumentation choices (which stems to generate)
            - Mix balance and levels
            - Song structure and dynamics
            - Production techniques and effects
            
            Consider the target audience and intended use case.
            Optimize for DAW import and further production.
            """,
            llm_config=self.config
        )

        return {
            'analyst': music_analyst,
            'composer': chord_composer, 
            'specialist': genre_specialist,
            'director': arrangement_director
        }

    async def generate_music(self, audio_analysis: Dict) -> Dict:
        """Execute multi-agent workflow to generate music"""
        
        # Step 1: Music Analysis
        analysis_result = await self._run_analysis(audio_analysis)
        
        # Step 2: Chord Generation
        chord_result = await self._run_composition(analysis_result)
        
        # Step 3: Genre Adaptation
        genre_result = await self._run_genre_adaptation(chord_result)
        
        # Step 4: Final Arrangement
        final_result = await self._run_arrangement(genre_result)
        
        return final_result
```

**Design Decisions:**

**Multi-Agent vs Single Model:**
- **Choice**: Multi-agent system with specialized roles
- **Why**: Better expertise simulation, more interesting results
- **Trade-off**: Increased complexity vs improved output quality
- **Implementation**: Each agent has domain-specific prompts

**Agent Communication Pattern:**
```python
def _setup_workflow(self):
    """Define agent interaction patterns"""
    return autogen.GroupChat(
        agents=[
            self.agents['analyst'],
            self.agents['composer'], 
            self.agents['specialist'],
            self.agents['director']
        ],
        messages=[],
        max_round=4,  # One round per agent
        speaker_selection_method="round_robin"
    )
```

### OpenAI Integration

```javascript
// services/OpenAIService.js - Audio processing with OpenAI
class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async transcribeAudio(audioBuffer) {
    try {
      const response = await this.client.audio.transcriptions.create({
        file: new File([audioBuffer], 'recording.wav', { type: 'audio/wav' }),
        model: 'whisper-1',
        language: 'en', // Optimize for English
        response_format: 'verbose_json', // Get timestamps
        temperature: 0.0 // Deterministic transcription
      });

      return {
        text: response.text,
        duration: response.duration,
        segments: response.segments, // Word-level timestamps
        confidence: this.calculateConfidence(response.segments)
      };
    } catch (error) {
      throw new OpenAIError('Transcription failed', error);
    }
  }

  async analyzeMusicalElements(transcription) {
    const prompt = `
    Analyze this audio transcription for musical elements:
    
    Text: "${transcription.text}"
    Duration: ${transcription.duration} seconds
    Word segments: ${JSON.stringify(transcription.segments)}
    
    Extract:
    1. Estimated tempo (BPM) - analyze rhythm from segment timing
    2. Suggested key signature (C, G, Am, etc.)
    3. Mood classification (upbeat, melancholy, energetic, chill, etc.)
    4. Genre suggestions (pop, rock, jazz, electronic, acoustic)
    5. Song structure hints (verse, chorus, bridge)
    
    Respond with valid JSON:
    {
      "tempo": 120,
      "key": "C",
      "mood": ["upbeat", "energetic"],
      "genres": ["pop", "rock"],
      "structure": "verse-chorus",
      "confidence": 0.8,
      "reasoning": "Fast-paced delivery suggests upbeat tempo..."
    }
    `;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3 // Some creativity, but mostly consistent
    });

    return JSON.parse(response.choices[0].message.content);
  }
}
```

**Design Decisions:**

**Whisper Model Choice:**
- **Choice**: whisper-1 (OpenAI hosted)
- **Why**: Better than local models for phone audio quality
- **Trade-off**: API cost vs quality and reliability
- **Implementation**: Verbose JSON for word timestamps

**GPT-4 for Analysis:**
- **Choice**: GPT-4 Turbo for musical analysis
- **Why**: Better reasoning about temporal patterns in audio
- **Trade-off**: Higher cost vs improved accuracy
- **Implementation**: Structured JSON prompts for consistent output

---

## Twilio Integration

### Voice Webhook Architecture

```javascript
// routes/twilio.js - Twilio webhook handlers
const twilio = require('twilio');
const { VoiceResponse } = require('twilio').twiml;

class TwilioController {
  // Incoming call handler
  static async handleIncomingCall(req, res) {
    const twiml = new VoiceResponse();
    
    try {
      // Log call for analytics
      logger.info('Incoming call:', {
        from: req.body.From,
        to: req.body.To,
        callSid: req.body.CallSid
      });

      // Gather PIN with validation
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

      // Timeout fallback
      twiml.say('I didn\'t receive your PIN. Please call back and try again. Goodbye!');
      
    } catch (error) {
      logger.error('Call handling error:', error);
      twiml.say('Sorry, there was a technical issue. Please try again later.');
    }

    res.type('text/xml');
    res.send(twiml.toString());
  }

  // PIN authentication
  static async authenticateUser(req, res) {
    const twiml = new VoiceResponse();
    const enteredPin = req.body.Digits;
    const callSid = req.body.CallSid;

    try {
      // Validate PIN format
      if (!enteredPin || !/^\d{6}$/.test(enteredPin)) {
        twiml.say('Invalid PIN format. Please call back and enter a 6-digit number.');
        res.type('text/xml');
        return res.send(twiml.toString());
      }

      // Database lookup with error handling
      const user = await UserService.findByPin(enteredPin);
      
      if (!user) {
        // Log failed attempt for security monitoring
        await SecurityService.logFailedAttempt(req.body.From, enteredPin);
        
        twiml.say('Invalid PIN. Please check your PIN and try again.');
        res.type('text/xml');
        return res.send(twiml.toString());
      }

      // Success - proceed to recording
      await CallService.createCallSession(callSid, user.id);
      
      twiml.say({
        voice: 'alice'
      }, `Welcome back, ${user.name || 'user'}! Start humming or singing your melody after the beep. You have 30 seconds. Go!`);

      twiml.record({
        maxLength: 30,
        timeout: 5,
        playBeep: true,
        trim: 'trim-silence',
        recordingStatusCallback: `/twilio/recording-status?userId=${user.id}&callSid=${callSid}`,
        action: `/twilio/recording-complete?userId=${user.id}&callSid=${callSid}`,
        method: 'POST'
      });

      twiml.say('Thank you for recording. We\'re processing your music now!');

    } catch (error) {
      logger.error('Authentication error:', error);
      twiml.say('Sorry, there was a technical issue during authentication. Please try again.');
    }

    res.type('text/xml');
    res.send(twiml.toString());
  }

  // Recording completion handler
  static async handleRecordingComplete(req, res) {
    const twiml = new VoiceResponse();
    const { userId, callSid } = req.query;
    const recordingUrl = req.body.RecordingUrl;

    try {
      // Validate recording
      if (!recordingUrl) {
        throw new Error('No recording URL provided');
      }

      // Queue processing job
      await ProcessingQueue.add('processRecording', {
        userId,
        callSid,
        recordingUrl: recordingUrl + '.wav', // Get WAV format
        recordingSid: req.body.RecordingSid,
        duration: req.body.RecordingDuration
      });

      // Immediate response to user
      twiml.say({
        voice: 'alice'
      }, 'Perfect! Your recording is being processed. You\'ll receive a text message with download links in about one minute. Thank you for using Hum It Out!');

      // Log successful recording
      logger.info('Recording completed:', {
        userId,
        callSid,
        recordingDuration: req.body.RecordingDuration,
        recordingSize: req.body.RecordingSize
      });

    } catch (error) {
      logger.error('Recording completion error:', error);
      twiml.say('There was an issue processing your recording. Please try again.');
    }

    res.type('text/xml');
    res.send(twiml.toString());
  }
}
```

**Design Decisions:**

**TwiML Response Structure:**
- **Why TwiML**: Twilio's XML-based instruction format
- **Implementation**: Structured responses for call flow control
- **Benefits**: Declarative call handling, automatic retries

**Error Handling Strategy:**
```javascript
// Always provide TwiML response, even on errors
catch (error) {
  logger.error('Webhook error:', error);
  const twiml = new VoiceResponse();
  twiml.say('Sorry, there was a technical issue. Please try again later.');
  res.type('text/xml');
  res.send(twiml.toString());
}
```

**Security Considerations:**
```javascript
// Verify Twilio webhook authenticity
const twilioSignature = req.headers['x-twilio-signature'];
const url = `https://${req.headers.host}${req.originalUrl}`;
const params = req.body;

if (!twilio.validateRequest(authToken, twilioSignature, url, params)) {
  return res.status(403).send('Invalid Twilio signature');
}
```

### SMS Notification System

```javascript
// services/SMSService.js - SMS delivery for download links
class SMSService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async sendDownloadLinks(phoneNumber, sessionData) {
    const message = this.formatDownloadMessage(sessionData);
    
    try {
      const result = await this.client.messages.create({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: message
      });

      logger.info('SMS sent successfully:', {
        messageSid: result.sid,
        to: phoneNumber,
        sessionId: sessionData.sessionId
      });

      return result;
    } catch (error) {
      logger.error('SMS delivery failed:', error);
      throw new SMSError('Failed to send download links', error);
    }
  }

  formatDownloadMessage(sessionData) {
    const { sessionTitle, downloadUrl, tempo, key } = sessionData;
    
    return `
🎵 Your track "${sessionTitle}" is ready!

🔧 Details: ${tempo} BPM, ${key} key
⏱️ Generated in ${sessionData.processingTime}s

📥 Download your files:
${downloadUrl}

Files included:
• Backing track (WAV)
• MIDI file
• Individual stems (ZIP)
• Lyrics (TXT)

🎚️ Ready for GarageBand, Logic Pro, Ableton, or your favorite DAW!

- Hum It Out Team
    `.trim();
  }
}
```

---

## File Management

### Audio File Processing

```javascript
// services/AudioFileProcessor.js - Audio file generation and management
const Tone = require('tone');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');

class AudioFileProcessor {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'generated');
    this.tempDir = path.join(process.cwd(), 'temp');
  }

  async generateMusicFiles(sessionId, musicData) {
    const sessionDir = path.join(this.outputDir, sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    const results = {
      backingTrack: null,
      stems: {},
      midi: null,
      lyrics: null,
      metadata: null
    };

    try {
      // Generate individual stems
      results.stems = await this.generateStems(sessionDir, musicData);
      
      // Create backing track (mixed stems)
      results.backingTrack = await this.createBackingTrack(sessionDir, results.stems);
      
      // Generate MIDI file
      results.midi = await this.generateMIDI(sessionDir, musicData);
      
      // Create lyrics file
      results.lyrics = await this.createLyricsFile(sessionDir, musicData.lyrics);
      
      // Generate metadata file
      results.metadata = await this.createMetadataFile(sessionDir, musicData);
      
      // Create downloadable ZIP package
      const zipFile = await this.createDownloadPackage(sessionId, results);
      
      return {
        ...results,
        downloadPackage: zipFile,
        totalSize: await this.calculateTotalSize(results)
      };

    } catch (error) {
      // Cleanup on error
      await this.cleanupFiles(sessionDir);
      throw error;
    }
  }

  async generateStems(sessionDir, musicData) {
    const stemsDir = path.join(sessionDir, 'stems');
    await fs.mkdir(stemsDir, { recursive: true });

    const { chordProgression, tempo, key } = musicData;
    const stems = {};

    // Initialize Tone.js context
    await Tone.start();

    // Generate drum stem
    stems.drums = await this.generateDrumStem(stemsDir, tempo, musicData.style);
    
    // Generate bass stem  
    stems.bass = await this.generateBassStem(stemsDir, chordProgression, tempo);
    
    // Generate chord stems (multiple instruments)
    stems.chords = await this.generateChordStems(stemsDir, chordProgression, tempo, key);
    
    // Generate melody guide stem
    stems.melody = await this.generateMelodyStem(stemsDir, musicData.melodyData, tempo);

    return stems;
  }

  async generateChordStems(stemsDir, chordProgression, tempo, key) {
    const instruments = ['piano', 'guitar', 'synth', 'strings'];
    const chordStems = {};

    for (const instrument of instruments) {
      const synth = this.createInstrumentSynth(instrument);
      const recorder = new Tone.Recorder();
      synth.connect(recorder);

      recorder.start();

      // Play chord progression
      const chordDuration = (60 / tempo) * 4; // 4 beats per chord
      
      for (let i = 0; i < chordProgression.length; i++) {
        const chord = chordProgression[i];
        const chordNotes = this.getChordNotes(chord, key);
        
        await synth.triggerAttackRelease(chordNotes, chordDuration);
        await this.wait(chordDuration * 1000);
      }

      const recording = await recorder.stop();
      const filename = `chords-${instrument}.wav`;
      const filepath = path.join(stemsDir, filename);
      
      const buffer = await recording.get();
      await fs.writeFile(filepath, buffer);
      
      chordStems[instrument] = filepath;
    }

    return chordStems;
  }

  createInstrumentSynth(instrument) {
    const synthConfigs = {
      piano: () => new Tone.Piano(),
      guitar: () => new Tone.PluckSynth({
        attackNoise: 1,
        dampening: 4000,
        resonance: 0.7
      }),
      synth: () => new Tone.PolySynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 }
      }),
      strings: () => new Tone.PolySynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.3, decay: 0.1, sustain: 0.9, release: 2 },
        filter: { frequency: 2000, type: 'lowpass' }
      })
    };

    return synthConfigs[instrument]();
  }
}
```

**Design Decisions:**

**Tone.js for Audio Synthesis:**
- **Choice**: Tone.js over native Web Audio API
- **Why**: Higher-level abstractions for musical concepts
- **Trade-off**: Larger bundle size vs development speed
- **Implementation**: Server-side rendering for consistent output

**File Organization:**
```
generated/
├── {sessionId}/
│   ├── backing-track.wav
│   ├── stems/
│   │   ├── drums.wav
│   │   ├── bass.wav
│   │   ├── chords-piano.wav
│   │   ├── chords-guitar.wav
│   │   └── melody-guide.wav
│   ├── session.mid
│   ├── lyrics.txt
│   ├── metadata.json
│   └── download-package.zip
```

**Quality Settings:**
```javascript
// Audio export settings for professional quality
const AUDIO_SETTINGS = {
  sampleRate: 48000,    // Professional standard
  bitDepth: 24,         // High dynamic range
  channels: 2,          // Stereo
  format: 'wav'         // Uncompressed for quality
};
```

---

## Security & Authentication

### PIN-Based Authentication System

```javascript
// services/AuthService.js - Secure PIN management
class AuthService {
  static async generateUniquePIN() {
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
    // Basic format validation
    if (!pin || !/^\d{6}$/.test(pin)) {
      throw new ValidationError('PIN must be exactly 6 digits');
    }

    // Database lookup
    const result = await db.query(
      'SELECT id, email, phone, created_at FROM users WHERE pin = $1',
      [pin]
    );

    if (result.rows.length === 0) {
      // Log failed attempt for security monitoring
      await SecurityLogger.logFailedPINAttempt(pin);
      throw new AuthError('Invalid PIN');
    }

    return result.rows[0];
  }

  static async rotatePIN(userId) {
    const newPin = await this.generateUniquePIN();
    
    await db.query(
      'UPDATE users SET pin = $1, updated_at = NOW() WHERE id = $2',
      [newPin, userId]
    );

    return newPin;
  }
}
```

**Design Decisions:**

**PIN vs Password:**
- **Choice**: 6-digit PIN for phone authentication
- **Why**: Easy to remember and speak over phone
- **Security**: Cryptographically random generation
- **Rate Limiting**: Prevent brute force attacks

**Security Monitoring:**
```javascript
// middleware/SecurityMiddleware.js
class SecurityMiddleware {
  static rateLimitPINAttempts = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 attempts per window
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      const twiml = new VoiceResponse();
      twiml.say('Too many failed PIN attempts. Please wait 15 minutes and try again.');
      res.type('text/xml').send(twiml.toString());
    },
    keyGenerator: (req) => req.body.From // Rate limit by phone number
  });

  static logSecurityEvent(event, details) {
    logger.warn('Security event:', {
      event,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip,
      userAgent: details.userAgent
    });

    // Alert on suspicious patterns
    if (event === 'multiple_failed_pins') {
      AlertService.notifySecurityTeam(event, details);
    }
  }
}
```

### Data Protection

```javascript
// services/EncryptionService.js - Sensitive data encryption
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    const decipher = crypto.createDecipher(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Usage for sensitive data
class UserService {
  static async createUser(email, phone) {
    const pin = await AuthService.generateUniquePIN();
    
    // Encrypt PII data
    const encryptedPhone = phone ? EncryptionService.encrypt(phone) : null;
    
    const result = await db.query(`
      INSERT INTO users (email, pin, encrypted_phone)
      VALUES ($1, $2, $3)
      RETURNING id, email, pin, created_at
    `, [email, pin, encryptedPhone]);

    return result.rows[0];
  }
}
```

---

## Performance Optimization

### Caching Strategy

```javascript
// services/CacheService.js - Redis-based caching
const redis = require('redis');

class CacheService {
  constructor() {
    this.client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });
  }

  // Cache processed audio analysis
  async cacheAudioAnalysis(audioHash, analysis) {
    const key = `audio_analysis:${audioHash}`;
    await this.client.setex(key, 3600, JSON.stringify(analysis)); // 1 hour TTL
  }

  async getCachedAudioAnalysis(audioHash) {
    const key = `audio_analysis:${audioHash}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Cache generated music components
  async cacheGeneratedMusic(musicHash,