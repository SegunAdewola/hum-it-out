# Hum It Out - Project Context for Claude

## Project Overview
**Hum It Out** is a voice-to-music conversion system built for the Cascadia JS hackathon. Users call a phone number, hum or sing a melody, and receive studio-ready music files (MIDI, backing tracks, stems) via SMS within 60 seconds.

## Key Innovation
- **Phone-first interface** - No app downloads, works from any phone
- **PIN-based authentication** - Call from anywhere using your unique PIN
- **AI-powered music generation** - Multi-agent system creates professional backing tracks
- **Instant DAW integration** - Files ready for GarageBand, Logic Pro, Ableton Live

## Technical Architecture

### Core Technologies
- **Frontend:** React + Tailwind CSS (GitHub dark mode aesthetic)
- **Backend:** Node.js + Express
- **Database:** Neon PostgreSQL
- **Voice Infrastructure:** Twilio Voice + SMS
- **AI Processing:** OpenAI Whisper + GPT-4
- **Multi-Agent Orchestration:** AG2 (AutoGen)
- **Audio Synthesis:** Tone.js + Web Audio API

### Sponsor Tool Integration (Cascadia JS Requirements)
1. **Twilio** - Voice calls, recordings, SMS notifications
2. **OpenAI** - Audio transcription, music analysis, lyric enhancement
3. **Neon** - User data, session storage, file metadata
4. **AG2/AutoGen** - Multi-agent music generation workflow

### System Flow
```
Phone Call → Twilio → PIN Authentication → Recording → 
OpenAI Whisper → AG2 Multi-Agent Processing → 
Music Generation → File Creation → SMS Delivery → 
Web Dashboard Access
```

## User Experience

### Authentication Flow
1. User registers on web dashboard → Gets unique 6-digit PIN
2. User calls 555-HUMS (555-4867) from any phone
3. System prompts for PIN → Validates against database
4. Authenticated user can record 30-second audio

### Recording & Processing
1. User hums/sings melody with or without lyrics
2. Twilio captures high-quality audio recording
3. OpenAI Whisper transcribes lyrics and analyzes tempo
4. AG2 multi-agent system processes musical elements:
   - **MusicAnalyst**: Determines key, mood, genre
   - **ChordComposer**: Creates chord progressions
   - **GenreSpecialist**: Generates style variations
   - **ArrangementDirector**: Finalizes instrumentation

### Output Generation
Generated package includes:
- **Backing track** (.wav) - Full mixed track ready to play
- **Individual stems** (.wav) - Drums, bass, chords, melody guide
- **MIDI file** (.mid) - For DAW import and instrument customization
- **Lyrics sheet** (.txt) - Clean, formatted lyrics
- **Session metadata** (tempo, key, chord progression)

### File Access
- **SMS notification** with download links sent immediately
- **Web dashboard** provides session history and re-downloads
- **Versioning support** - "Build on session 1234" for iterations

## Technical Challenges Solved

### Audio Quality from Phone Calls
- Twilio provides high-quality voice recording (.wav format)
- OpenAI Whisper trained on diverse audio quality inputs
- Preprocessing normalization for consistent results

### Real-time Processing
- Async pipeline prevents call timeout
- User gets immediate confirmation, processing continues
- SMS notification when files are ready (typically 45-90 seconds)

### Cross-Device Access
- PIN system allows any phone to access user account
- No app installation required
- Web dashboard for session management

### DAW Integration
- Standardized file formats (.mid, .wav, .txt)
- Tempo-locked stems for instant sync
- Descriptive filenames include BPM and key information

## Database Schema

### Users Table
- Authentication via unique 6-digit PIN
- Email for account recovery
- Phone number for SMS notifications

### Sessions Table  
- Links to user account
- Original audio file URL
- Transcribed lyrics and musical analysis
- Processing timestamps

### Generated Tracks Table
- Links to session
- Version control for iterations
- File URLs for all generated assets
- Generation parameters for reproducibility

## Security Considerations
- PIN-based authentication (no passwords over phone)
- Rate limiting on authentication attempts
- Temporary file cleanup (30-day retention)
- Audio recordings stored securely in cloud storage

## Hackathon Success Criteria

### Technical Complexity (Target: 8/10)
- Multi-modal AI pipeline (voice → text → music)
- Real-time audio processing
- Multi-agent AI orchestration with AG2
- Cross-platform file compatibility

### Cool Factor (Target: 9/10)
- Voice-to-music feels magical
- Judge participation in live demo
- Professional-quality output
- Unique phone-based UX

### Demo Reliability (Target: 8/10)
- Simplified processing pipeline with fallbacks
- Pre-tested audio samples
- Backup generation methods
- Local development environment

### Presentation Value (Target: 9/10)
- Clear problem/solution narrative
- Live judge interaction
- Before/after audio comparison
- Real DAW integration demonstration

## Development Timeline (1 Day)
- **Phase 1 (2 hours):** Database setup, basic Twilio webhooks
- **Phase 2 (2 hours):** OpenAI integration, audio processing
- **Phase 3 (2 hours):** AG2 multi-agent workflow
- **Phase 4 (2 hours):** Frontend dashboard, file generation
- **Phase 5 (1 hour):** Integration testing, demo preparation

## Future Enhancements (Post-Hackathon)
- Real-time collaboration (multiple callers → same session)
- Advanced mixing interface in web dashboard
- Integration with Spotify, SoundCloud APIs
- Voice recognition for user authentication
- Mobile app companion

## Context for Claude Assistance
This project demonstrates:
- **Product thinking** - Solving real creator problems
- **Technical architecture** - Scalable, modular design  
- **User experience** - Simple but powerful workflow
- **Integration skills** - Multiple APIs working together
- **Presentation skills** - Demo-ready in constrained timeframe

The user (developer) is experienced with sampling and music production workflows, understands DAW integration needs, and values both technical sophistication and user experience simplicity.