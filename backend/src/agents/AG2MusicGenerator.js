const OpenAI = require('openai');
const config = require('../config/environment');
const logger = require('../utils/logger');

class AG2MusicGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async generateMusic(musicalAnalysis, transcription) {
    try {
      logger.info('Starting multi-agent music generation:', {
        tempo: musicalAnalysis.tempo,
        key: musicalAnalysis.key,
        mood: musicalAnalysis.mood,
        textLength: transcription.text.length
      });

      // Step 1: Enhanced Musical Analysis (Music Analyst Agent)
      const enhancedAnalysis = await this.runMusicAnalyst(musicalAnalysis, transcription);
      
      // Step 2: Chord Progression Generation (Chord Composer Agent)
      const chordProgression = await this.runChordComposer(enhancedAnalysis);
      
      // Step 3: Genre Adaptation (Genre Specialist Agent)
      const genreAdaptation = await this.runGenreSpecialist(chordProgression, enhancedAnalysis);
      
      // Step 4: Final Arrangement (Arrangement Director Agent)
      const finalArrangement = await this.runArrangementDirector(genreAdaptation, enhancedAnalysis);
      
      const result = {
        analysis: enhancedAnalysis,
        chords: chordProgression,
        genre: genreAdaptation,
        arrangement: finalArrangement,
        generatedAt: new Date().toISOString(),
        processingTime: Date.now()
      };
      
      logger.info('Multi-agent music generation completed successfully');
      
      return result;
      
    } catch (error) {
      logger.error('Multi-agent music generation failed:', error);
      
      // Return fallback music data
      return this.getFallbackMusicData(musicalAnalysis, transcription);
    }
  }

  async runMusicAnalyst(musicalAnalysis, transcription) {
    const prompt = `You are the MusicAnalyst - a professional music analyst with 20+ years of experience.

Your task: Enhance the initial musical analysis with deeper insights.

Initial Analysis:
${JSON.stringify(musicalAnalysis, null, 2)}

Transcription Data:
- Text: "${transcription.text}"
- Duration: ${transcription.duration} seconds
- Word segments: ${transcription.segments.length}
- Confidence: ${transcription.confidence}

As the MusicAnalyst, provide enhanced analysis focusing on:
1. Refined tempo estimation based on word timing patterns
2. More precise key and scale suggestions  
3. Detailed mood and energy analysis
4. Song structure recommendations
5. Rhythmic patterns identified from speech rhythm
6. Melodic hints from vocal inflection patterns

Respond with enhanced JSON analysis that other agents can use:

{
  "tempo": 120,
  "key": "C",
  "scale": "major",
  "mood": ["upbeat", "energetic"],
  "energy": 8,
  "structure": "verse-chorus-verse-chorus",
  "rhythmicPattern": "steady four-four with syncopation",
  "melodicHints": "ascending phrases with strong resolution",
  "confidence": 0.85,
  "reasoning": "Analysis of vocal timing suggests..."
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ 
          role: 'system', 
          content: 'You are a professional music analyst. Always respond with valid JSON only.' 
        }, { 
          role: 'user', 
          content: prompt 
        }],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      logger.info('MusicAnalyst completed analysis');
      return analysis;
    } catch (error) {
      logger.warn('MusicAnalyst failed, using enhanced defaults:', error.message);
      return {
        ...musicalAnalysis,
        scale: 'major',
        rhythmicPattern: 'steady four-four',
        melodicHints: 'vocal melody detected',
        confidence: 0.6
      };
    }
  }

  async runChordComposer(analysis) {
    const prompt = `You are the ChordComposer - a harmony expert with deep music theory knowledge.

Your task: Create compelling chord progressions based on this musical analysis.

Musical Analysis:
${JSON.stringify(analysis, null, 2)}

As the ChordComposer, create:
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

Respond with detailed chord progression data:

{
  "primaryProgression": ["C", "Am", "F", "G"],
  "verseProgression": ["Am", "F", "C", "G"],
  "chorusProgression": ["C", "G", "Am", "F"],
  "chordNotes": {
    "C": ["C4", "E4", "G4"],
    "Am": ["A3", "C4", "E4"],
    "F": ["F3", "A3", "C4"],
    "G": ["G3", "B3", "D4"]
  },
  "romanNumerals": ["I", "vi", "IV", "V"],
  "timing": "whole notes",
  "voiceLeading": "smooth stepwise motion",
  "complexity": "intermediate",
  "reasoning": "C-Am-F-G provides strong harmonic foundation..."
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ 
          role: 'system', 
          content: 'You are a chord progression composer. Always respond with valid JSON only.' 
        }, { 
          role: 'user', 
          content: prompt 
        }],
        response_format: { type: "json_object" },
        temperature: 0.6
      });

      const chords = JSON.parse(response.choices[0].message.content);
      logger.info('ChordComposer completed progression');
      return chords;
    } catch (error) {
      logger.warn('ChordComposer failed, using default progression:', error.message);
      return {
        primaryProgression: ['C', 'Am', 'F', 'G'],
        chordNotes: {
          'C': ['C4', 'E4', 'G4'],
          'Am': ['A3', 'C4', 'E4'],
          'F': ['F3', 'A3', 'C4'],
          'G': ['G3', 'B3', 'D4']
        },
        timing: 'whole notes'
      };
    }
  }

  async runGenreSpecialist(chordProgression, analysis) {
    const primaryGenre = analysis.genres && analysis.genres[0] ? analysis.genres[0] : 'pop';
    
    const prompt = `You are the GenreSpecialist - a multi-genre music expert.

Your task: Adapt chord progressions for ${primaryGenre} genre authenticity.

Chord Progressions:
${JSON.stringify(chordProgression, null, 2)}

Musical Analysis:
${JSON.stringify(analysis, null, 2)}

As the GenreSpecialist, create genre-specific adaptations:
1. Modify chord voicings for ${primaryGenre} authenticity
2. Suggest appropriate instrumentation (drums, bass, lead, pads)
3. Define rhythm patterns and groove characteristics
4. Recommend production techniques and effects
5. Propose arrangement variations for intro/verse/chorus
6. Consider typical ${primaryGenre} song structures

Also provide adaptations for 2 additional complementary genres.

Respond with comprehensive genre adaptation:

{
  "primaryGenre": "${primaryGenre}",
  "instrumentation": {
    "drums": "acoustic kit with tight snare",
    "bass": "electric bass with slight overdrive",
    "chords": "piano with subtle reverb",
    "melody": "clean electric guitar"
  },
  "rhythmPattern": "driving four-four with backbeat emphasis",
  "production": {
    "effects": ["reverb", "compression", "EQ"],
    "mixing": "punchy and present",
    "tempo": 120
  },
  "alternativeGenres": {
    "acoustic": { "instrumentation": "acoustic guitar, light percussion" },
    "electronic": { "instrumentation": "synthesizers, programmed drums" }
  },
  "arrangement": {
    "intro": "4 bars piano solo",
    "verse": "bass and drums enter",
    "chorus": "full instrumentation",
    "outro": "fade with melody"
  }
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ 
          role: 'system', 
          content: 'You are a multi-genre music specialist. Always respond with valid JSON only.' 
        }, { 
          role: 'user', 
          content: prompt 
        }],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const genre = JSON.parse(response.choices[0].message.content);
      logger.info('GenreSpecialist completed adaptation');
      return genre;
    } catch (error) {
      logger.warn('GenreSpecialist failed, using default adaptation:', error.message);
      return {
        primaryGenre: primaryGenre,
        instrumentation: {
          drums: 'acoustic drum kit',
          bass: 'electric bass',
          chords: 'piano',
          melody: 'synth lead'
        },
        rhythmPattern: 'steady four-four'
      };
    }
  }

  async runArrangementDirector(genreAdaptation, analysis) {
    const prompt = `You are the ArrangementDirector - a music producer with extensive recording experience.

Your task: Finalize production decisions for a professional track.

Genre Adaptations:
${JSON.stringify(genreAdaptation, null, 2)}

Original Analysis:
${JSON.stringify(analysis, null, 2)}

As the ArrangementDirector, make final production decisions:
1. Select specific instruments and sounds for each stem
2. Define arrangement structure (intro, verse, chorus, outro)
3. Set mix levels and balance between elements
4. Choose production effects and processing
5. Optimize for DAW compatibility and user editing
6. Ensure professional quality and musical coherence

Consider: Musicians will import this into DAWs for further production.

Respond with complete production blueprint:

{
  "finalInstrumentation": {
    "drums": "acoustic kit with room mics",
    "bass": "electric bass, fingerstyle",
    "chords": "grand piano, stereo spread",
    "melody": "clean guitar with chorus effect"
  },
  "arrangement": {
    "structure": ["intro", "verse", "chorus", "verse", "chorus", "outro"],
    "totalBars": 32,
    "sections": {
      "intro": "4 bars, piano only",
      "verse": "8 bars, bass and drums enter",
      "chorus": "8 bars, full arrangement"
    }
  },
  "mixLevels": {
    "drums": 0.85,
    "bass": 0.75,
    "chords": 0.65,
    "melody": 0.90
  },
  "production": {
    "effects": ["room reverb", "bus compression", "subtle EQ"],
    "tempo": 120,
    "key": "C",
    "totalDuration": "approximately 2 minutes"
  },
  "fileSpecs": {
    "format": "WAV 48kHz/24-bit",
    "stemSeparation": "clean isolation for mixing",
    "loopReady": true,
    "dawOptimized": true
  }
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ 
          role: 'system', 
          content: 'You are a music arrangement director. Always respond with valid JSON only.' 
        }, { 
          role: 'user', 
          content: prompt 
        }],
        response_format: { type: "json_object" },
        temperature: 0.5
      });

      const arrangement = JSON.parse(response.choices[0].message.content);
      logger.info('ArrangementDirector completed final arrangement');
      return arrangement;
    } catch (error) {
      logger.warn('ArrangementDirector failed, using default arrangement:', error.message);
      return {
        finalInstrumentation: {
          drums: 'acoustic kit',
          bass: 'electric bass',
          chords: 'piano',
          melody: 'synth lead'
        },
        mixLevels: {
          drums: 0.8,
          bass: 0.7,
          chords: 0.6,
          melody: 0.9
        }
      };
    }
  }

  getFallbackMusicData(musicalAnalysis, transcription) {
    logger.info('Using fallback music data due to AI generation failure');
    
    return {
      analysis: {
        ...musicalAnalysis,
        confidence: 0.5,
        source: 'fallback'
      },
      chords: {
        primaryProgression: ['C', 'Am', 'F', 'G'],
        chordNotes: {
          'C': ['C4', 'E4', 'G4'],
          'Am': ['A3', 'C4', 'E4'],
          'F': ['F3', 'A3', 'C4'],
          'G': ['G3', 'B3', 'D4']
        }
      },
      genre: {
        primaryGenre: 'pop',
        instrumentation: {
          drums: 'acoustic kit',
          bass: 'electric bass', 
          chords: 'piano',
          melody: 'clean guitar'
        }
      },
      arrangement: {
        structure: ['intro', 'verse', 'chorus', 'outro'],
        mixLevels: { drums: 0.8, bass: 0.7, chords: 0.6, melody: 0.9 }
      },
      lyrics: transcription.text,
      generatedAt: new Date().toISOString()
    };
  }

  // Simulate multi-agent conversation for demo purposes
  async simulateAgentConversation(analysisType, data) {
    const conversations = {
      analyst: [
        "🎵 MusicAnalyst: Analyzing vocal patterns and timing...",
        `🎵 MusicAnalyst: Detected ${data.tempo || 120} BPM with ${data.key || 'C'} tonality`,
        `🎵 MusicAnalyst: Mood classification: ${(data.mood || ['neutral']).join(', ')}`,
        "🎵 MusicAnalyst: Passing analysis to ChordComposer..."
      ],
      composer: [
        "🎹 ChordComposer: Receiving musical analysis...",
        `🎹 ChordComposer: Creating progression in ${data.key || 'C'} major`,
        "🎹 ChordComposer: Selected I-vi-IV-V progression for strong harmonic foundation",
        "🎹 ChordComposer: Sending chord data to GenreSpecialist..."
      ],
      specialist: [
        `🎸 GenreSpecialist: Adapting for ${data.genres?.[0] || 'pop'} genre...`,
        "🎸 GenreSpecialist: Selected acoustic kit drums with tight snare",
        "🎸 GenreSpecialist: Electric bass with clean tone",
        "🎸 GenreSpecialist: Forwarding to ArrangementDirector..."
      ],
      director: [
        "🎚️ ArrangementDirector: Finalizing production decisions...",
        "🎚️ ArrangementDirector: Set mix levels - drums 85%, bass 75%, piano 65%",
        "🎚️ ArrangementDirector: Adding subtle reverb and compression",
        "🎚️ ArrangementDirector: Production complete - files ready for DAW import!"
      ]
    };

    return conversations[analysisType] || ["🤖 Agent: Processing..."];
  }

  // For demo purposes - show the "agent thinking" process
  async generateWithLiveUpdates(musicalAnalysis, transcription, onUpdate) {
    try {
      if (onUpdate) onUpdate("🎵 MusicAnalyst: Starting analysis...");
      const enhancedAnalysis = await this.runMusicAnalyst(musicalAnalysis, transcription);
      
      if (onUpdate) onUpdate("🎹 ChordComposer: Creating chord progressions...");
      const chordProgression = await this.runChordComposer(enhancedAnalysis);
      
      if (onUpdate) onUpdate("🎸 GenreSpecialist: Adapting for genre...");
      const genreAdaptation = await this.runGenreSpecialist(chordProgression, enhancedAnalysis);
      
      if (onUpdate) onUpdate("🎚️ ArrangementDirector: Finalizing arrangement...");
      const finalArrangement = await this.runArrangementDirector(genreAdaptation, enhancedAnalysis);
      
      if (onUpdate) onUpdate("✅ Multi-agent processing complete!");

      return {
        analysis: enhancedAnalysis,
        chords: chordProgression,
        genre: genreAdaptation,
        arrangement: finalArrangement,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      if (onUpdate) onUpdate("⚠️ Using fallback generation...");
      return this.getFallbackMusicData(musicalAnalysis, transcription);
    }
  }
}

module.exports = AG2MusicGenerator;
