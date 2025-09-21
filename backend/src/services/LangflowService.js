const axios = require('axios');
const config = require('../config/environment');
const logger = require('../utils/logger');

class LangflowService {
  constructor() {
    this.apiUrl = config.langflow?.endpoint || 'http://localhost:7860/api/v1/run';
    this.apiKey = config.langflow?.apiKey;
  }

  async processAudioWorkflow(audioData, musicalAnalysis) {
    try {
      logger.info('Starting Langflow audio processing workflow');

      // Langflow workflow for audio-to-music conversion
      const flowPayload = {
        input_value: JSON.stringify({
          audio_analysis: musicalAnalysis,
          transcription: audioData.transcription,
          user_preferences: {
            genre: musicalAnalysis.genres?.[0] || 'pop',
            tempo: musicalAnalysis.tempo || 120,
            key: musicalAnalysis.key || 'C'
          }
        }),
        output_type: "chat",
        input_type: "chat",
        tweaks: {
          "ChatInput-music-analysis": {
            "input_value": JSON.stringify(musicalAnalysis)
          },
          "ChatOutput-music-generation": {
            "data_template": "{text}"
          }
        }
      };

      const response = await axios.post(this.apiUrl, flowPayload, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        timeout: 30000
      });

      if (response.data && response.data.outputs) {
        logger.info('Langflow workflow completed successfully');
        return this.parseLangflowResponse(response.data);
      } else {
        throw new Error('Invalid Langflow response format');
      }

    } catch (error) {
      logger.warn('Langflow processing failed, using local generation:', error.message);
      
      // Fallback to local OpenAI processing
      return await this.localMusicGeneration(audioData, musicalAnalysis);
    }
  }

  parseLangflowResponse(langflowData) {
    try {
      // Parse Langflow's structured output
      const outputs = langflowData.outputs || [];
      const musicOutput = outputs.find(output => output.type === 'music_generation');
      
      if (musicOutput && musicOutput.outputs) {
        const musicData = JSON.parse(musicOutput.outputs[0].results.message.text);
        
        return {
          source: 'langflow',
          analysis: musicData.analysis || {},
          chords: musicData.chords || {},
          arrangement: musicData.arrangement || {},
          genre: musicData.genre || {},
          generatedAt: new Date().toISOString()
        };
      }
      
      throw new Error('No valid music output found in Langflow response');
    } catch (error) {
      logger.error('Failed to parse Langflow response:', error);
      throw error;
    }
  }

  async localMusicGeneration(audioData, musicalAnalysis) {
    // Fallback: Use our OpenAI multi-agent system
    const OpenAIMusicGenerator = require('./OpenAIMusicGenerator');
    const generator = new OpenAIMusicGenerator();
    
    const result = await generator.generateMusic(musicalAnalysis, audioData.transcription);
    
    return {
      ...result,
      source: 'local_openai_multiagent'
    };
  }

  async createLangflowWorkflow() {
    // Create a basic Langflow workflow configuration
    const workflow = {
      "description": "Hum It Out - Voice to Music AI Workflow",
      "name": "voice-to-music-workflow",
      "data": {
        "nodes": [
          {
            "id": "audio-input",
            "type": "ChatInput",
            "position": { "x": 100, "y": 100 },
            "data": {
              "input_value": "Audio analysis data will be provided here",
              "sender": "User",
              "sender_name": "Audio Analyzer"
            }
          },
          {
            "id": "music-analyst", 
            "type": "OpenAI",
            "position": { "x": 300, "y": 100 },
            "data": {
              "model_name": "gpt-4",
              "system_message": "You are a professional music analyst. Analyze audio data and provide detailed musical insights including tempo, key, mood, and structure recommendations.",
              "temperature": 0.7
            }
          },
          {
            "id": "chord-composer",
            "type": "OpenAI", 
            "position": { "x": 500, "y": 100 },
            "data": {
              "model_name": "gpt-4",
              "system_message": "You are a chord progression composer. Create compelling chord progressions based on musical analysis, optimized for the detected key and mood.",
              "temperature": 0.6
            }
          },
          {
            "id": "arrangement-director",
            "type": "OpenAI",
            "position": { "x": 700, "y": 100 },
            "data": {
              "model_name": "gpt-4", 
              "system_message": "You are a music arrangement director. Make final production decisions including instrumentation, mix levels, and file organization for DAW compatibility.",
              "temperature": 0.5
            }
          },
          {
            "id": "music-output",
            "type": "ChatOutput",
            "position": { "x": 900, "y": 100 },
            "data": {
              "data_template": "{text}",
              "sender": "AI Music System",
              "sender_name": "Music Generator"
            }
          }
        ],
        "edges": [
          {
            "id": "e1",
            "source": "audio-input",
            "target": "music-analyst"
          },
          {
            "id": "e2", 
            "source": "music-analyst",
            "target": "chord-composer"
          },
          {
            "id": "e3",
            "source": "chord-composer", 
            "target": "arrangement-director"
          },
          {
            "id": "e4",
            "source": "arrangement-director",
            "target": "music-output"
          }
        ]
      }
    };

    return workflow;
  }

  async checkLangflowAvailability() {
    try {
      const response = await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = LangflowService;
