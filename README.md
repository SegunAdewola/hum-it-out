# 🎵 Hum It Out

> Voice to studio-ready music, instantly.

[![Hackathon](https://img.shields.io/badge/hackathon-Cascadia%20JS-blue)](https://cascadiajs.com)
[![Tech Stack](https://img.shields.io/badge/stack-Node.js%20%7C%20React%20%7C%20OpenAI%20%7C%20Twilio-green)](https://github.com)

Transform your voice into professional music files in under 60 seconds. Call from any phone, hum your melody, and download MIDI files, backing tracks, and stems ready for your favorite DAW.

## ✨ What It Does

- **📞 Call a phone number** - No app downloads required
- **🎤 Hum or sing** - 30 seconds of your melody idea  
- **🤖 AI processes** - Multi-agent system creates music
- **📥 Download files** - MIDI, backing tracks, and stems
- **🎚️ Import to DAW** - Ready for GarageBand, Logic Pro, Ableton

## 🛠 Tech Stack

**Frontend:** React, Tailwind CSS  
**Backend:** Node.js, Express, PostgreSQL  
**AI:** OpenAI Whisper & GPT-4  
**Voice:** Twilio Voice & SMS  
**Database:** Neon PostgreSQL  

## 🚀 Quick Start

### 1. Setup Environment
```bash
# Copy environment template
cp .env.example .env

# Add your API keys to .env:
# - NEON_DATABASE_URL (free PostgreSQL from neon.tech)
# - TWILIO_ACCOUNT_SID & AUTH_TOKEN (from twilio.com)  
# - OPENAI_API_KEY (from platform.openai.com)
```

### 2. Install & Run
```bash
# Install dependencies
npm run install:all

# Setup database
npm run setup:db

# Start development
npm run dev
```

### 3. Configure Twilio Webhook
```bash
# Start ngrok tunnel
npm run tunnel

# Copy ngrok URL to Twilio Console:
# Phone Numbers → Your Number → Webhook: https://abc123.ngrok.io/twilio/voice
```

### 4. Test the System
1. Visit `http://localhost:3000` to get your PIN
2. Call your Twilio number
3. Enter PIN when prompted
4. Hum for 30 seconds
5. Check dashboard for generated music files

## 🎼 How It Works

```
Phone Call → PIN Authentication → Voice Recording → 
AI Analysis → Music Generation → File Creation → 
SMS Notification → Web Dashboard Access
```

## 🎯 Output Files

Each session generates:
- **`backing-track.wav`** - Full mixed track ready to play
- **`session.mid`** - MIDI file for DAW import
- **`stems/`** - Individual tracks (drums, bass, chords, melody)
- **`lyrics.txt`** - Transcribed lyrics
- **`download-package.zip`** - Everything bundled together

## 🎚️ DAW Integration

Files are optimized for immediate import into:
- GarageBand
- Logic Pro  
- Ableton Live
- FL Studio
- Pro Tools

All stems are tempo-locked and sync automatically when imported.

## 📱 Demo

**Live Demo Flow:**
1. Show dashboard with PIN
2. Call system live from judge's phone
3. Hum melody for 30 seconds  
4. Display real-time processing status
5. Download and play generated files
6. Import into DAW for live music creation

## 🏆 Hackathon Features

**Technical Complexity:**
- Multi-modal AI pipeline (voice → text → music)
- Real-time audio processing
- Multi-agent music generation system
- Cross-platform file compatibility

**Innovation:**
- Phone-first interface (no app required)
- Voice-to-music transformation
- Professional-quality output
- Instant DAW integration

## 📄 License

MIT License

---

**Built for Cascadia JS Hackathon 2025**  
*Ready to turn your hums into hits? 🎵*