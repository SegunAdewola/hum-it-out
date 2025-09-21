import React, { useState } from 'react';
import AudioPlayer from './AudioPlayer';
import DownloadManager from './DownloadManager';
import { Clock, Music, Key, Zap, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from '../utils/dateUtils';

function SessionCard({ session, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'processing': return 'status-processing';
      case 'failed': return 'status-failed';
      default: return 'status-pending';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⏳';
      case 'failed': return '❌';
      default: return '🔄';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const generateTitle = (session) => {
    if (session.transcribed_lyrics) {
      // Use first few words of lyrics as title
      const words = session.transcribed_lyrics.split(' ').slice(0, 3);
      return words.join(' ') + (words.length >= 3 ? '...' : '');
    }
    
    // Generate title based on musical elements
    const mood = session.mood_tags?.[0] || 'Untitled';
    const key = session.detected_key || '';
    return `${mood} ${key ? `in ${key}` : 'Melody'}`.trim();
  };

  return (
    <div className={`session-card ${getStatusColor(session.processing_status)}`}>
      {/* Card Header */}
      <div className="session-header">
        <div className="session-title-section">
          <div className="session-status-indicator">
            <span className="status-icon">{getStatusIcon(session.processing_status)}</span>
            <span className="status-text">{session.processing_status}</span>
          </div>
          <h3 className="session-title">{generateTitle(session)}</h3>
        </div>
        <div className="session-meta">
          <span className="session-time">
            {formatDistanceToNow(new Date(session.created_at))}
          </span>
          <button 
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <MoreHorizontal />
          </button>
        </div>
      </div>

      {/* Quick Info */}
      <div className="session-quick-info">
        {session.tempo && (
          <div className="info-item">
            <Zap className="info-icon" />
            <span>{session.tempo} BPM</span>
          </div>
        )}
        {session.detected_key && (
          <div className="info-item">
            <Key className="info-icon" />
            <span>{session.detected_key}</span>
          </div>
        )}
        {session.audio_duration && (
          <div className="info-item">
            <Clock className="info-icon" />
            <span>{formatDuration(session.audio_duration)}</span>
          </div>
        )}
      </div>

      {/* Mood Tags */}
      {session.mood_tags && session.mood_tags.length > 0 && (
        <div className="mood-tags">
          {session.mood_tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="mood-tag">{tag}</span>
          ))}
        </div>
      )}

      {/* Audio Player */}
      {session.processing_status === 'completed' && session.generated_tracks?.[0] && (
        <AudioPlayer
          audioUrl={session.generated_tracks[0].backing_track_url}
          title={generateTitle(session)}
          duration={session.audio_duration}
        />
      )}

      {/* Processing Status */}
      {session.processing_status === 'processing' && (
        <div className="processing-status">
          <div className="processing-spinner"></div>
          <span>AI agents are creating your music...</span>
        </div>
      )}

      {/* Failed Status */}
      {session.processing_status === 'failed' && (
        <div className="failed-status">
          <span>Processing failed. Please try again.</span>
          <button className="retry-btn" onClick={() => onUpdate()}>
            Retry
          </button>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="session-details">
          {/* Lyrics */}
          {session.transcribed_lyrics && (
            <div className="detail-section">
              <h4>Lyrics</h4>
              <div className="lyrics-text">
                {session.transcribed_lyrics}
              </div>
            </div>
          )}

          {/* Musical Analysis */}
          <div className="detail-section">
            <h4>Musical Analysis</h4>
            <div className="analysis-grid">
              {session.tempo && (
                <div className="analysis-item">
                  <span className="analysis-label">Tempo:</span>
                  <span className="analysis-value">{session.tempo} BPM</span>
                </div>
              )}
              {session.detected_key && (
                <div className="analysis-item">
                  <span className="analysis-label">Key:</span>
                  <span className="analysis-value">{session.detected_key}</span>
                </div>
              )}
              {session.genre_tags && session.genre_tags.length > 0 && (
                <div className="analysis-item">
                  <span className="analysis-label">Genres:</span>
                  <span className="analysis-value">{session.genre_tags.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Downloads */}
          {session.processing_status === 'completed' && session.generated_tracks?.[0] && (
            <DownloadManager 
              tracks={session.generated_tracks}
              sessionId={session.id}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default SessionCard;
