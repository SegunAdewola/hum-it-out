import React, { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';

function AudioPlayer({ audioUrl, title, duration }) {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return;

    // Initialize WaveSurfer
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#58a6ff',
      progressColor: '#1f6feb',
      cursorColor: '#f0f6fc',
      barWidth: 2,
      barRadius: 3,
      responsive: true,
      height: 60,
      normalize: true,
      backend: 'WebAudio',
      mediaControls: false
    });

    // Event listeners
    wavesurfer.current.on('ready', () => {
      setTotalDuration(wavesurfer.current.getDuration());
      setIsLoading(false);
      wavesurfer.current.setVolume(volume);
    });

    wavesurfer.current.on('audioprocess', () => {
      setCurrentTime(wavesurfer.current.getCurrentTime());
    });

    wavesurfer.current.on('seek', () => {
      setCurrentTime(wavesurfer.current.getCurrentTime());
    });

    wavesurfer.current.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    wavesurfer.current.on('error', (error) => {
      console.error('WaveSurfer error:', error);
      setError('Failed to load audio');
      setIsLoading(false);
    });

    // Load audio
    wavesurfer.current.load(audioUrl);

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [audioUrl, volume]);

  const togglePlayback = () => {
    if (!wavesurfer.current || isLoading) return;

    if (isPlaying) {
      wavesurfer.current.pause();
    } else {
      wavesurfer.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(newVolume);
    }
  };

  const resetPlayback = () => {
    if (!wavesurfer.current) return;
    wavesurfer.current.seekTo(0);
    setCurrentTime(0);
    if (isPlaying) {
      setIsPlaying(false);
    }
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="audio-player error">
        <div className="error-message">
          <span>❌ {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="audio-player">
      {/* Waveform */}
      <div className="waveform-container">
        <div ref={waveformRef} className="waveform" />
        {isLoading && (
          <div className="waveform-loading">
            <div className="spinner"></div>
            <span>Loading audio...</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="audio-controls">
        <div className="playback-controls">
          <button 
            onClick={togglePlayback}
            disabled={isLoading}
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>
          
          <button 
            onClick={resetPlayback}
            disabled={isLoading}
            className="reset-btn"
          >
            <RotateCcw />
          </button>

          <div className="time-display">
            <span className="current-time">{formatTime(currentTime)}</span>
            <span className="separator">/</span>
            <span className="total-time">{formatTime(totalDuration)}</span>
          </div>
        </div>

        <div className="volume-controls">
          <button 
            onClick={() => handleVolumeChange(volume > 0 ? 0 : 0.7)}
            className="volume-btn"
          >
            {volume > 0 ? <Volume2 /> : <VolumeX />}
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="volume-slider"
          />
        </div>
      </div>

      {/* Track Info */}
      {title && (
        <div className="track-info">
          <span className="track-title">{title}</span>
        </div>
      )}
    </div>
  );
}

export default AudioPlayer;
