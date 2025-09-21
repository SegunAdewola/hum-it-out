import React, { useState } from 'react';
import { Download, Package, Music, FileText, Disc3 } from 'lucide-react';

function DownloadManager({ tracks, sessionId }) {
  const [downloadCounts, setDownloadCounts] = useState({});
  
  if (!tracks || tracks.length === 0) {
    return null;
  }

  const track = tracks[0]; // Use the first/latest track version

  const downloadItems = [
    {
      id: 'backing-track',
      name: 'Backing Track',
      description: 'Full mixed track ready to play',
      url: track.backing_track_url,
      icon: <Music />,
      type: 'audio/wav',
      className: 'download-backing-track'
    },
    {
      id: 'midi',
      name: 'MIDI File',
      description: 'For DAW import and editing',
      url: track.midi_url,
      icon: <Disc3 />,
      type: 'audio/midi',
      className: 'download-midi'
    },
    {
      id: 'stems',
      name: 'Stems Package',
      description: 'Individual tracks (drums, bass, chords)',
      url: track.stems_folder_url,
      icon: <Package />,
      type: 'application/zip',
      className: 'download-stems'
    },
    {
      id: 'lyrics',
      name: 'Lyrics',
      description: 'Formatted lyric sheet',
      url: track.lyrics_url,
      icon: <FileText />,
      type: 'text/plain',
      className: 'download-lyrics'
    }
  ];

  const handleDownload = async (item) => {
    if (!item.url) {
      console.warn(`No URL available for ${item.name}`);
      return;
    }

    try {
      // Track download count
      setDownloadCounts(prev => ({
        ...prev,
        [item.id]: (prev[item.id] || 0) + 1
      }));

      // Create download link
      const link = document.createElement('a');
      link.href = item.url;
      link.download = `HumItOut_${sessionId}_${item.id}.${getFileExtension(item.type)}`;
      link.target = '_blank';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Optional: Track download analytics
      if (window.gtag) {
        window.gtag('event', 'download', {
          event_category: 'engagement',
          event_label: item.name,
          value: 1
        });
      }

    } catch (error) {
      console.error(`Download failed for ${item.name}:`, error);
      // You might want to show a toast notification here
    }
  };

  const getFileExtension = (mimeType) => {
    const extensions = {
      'audio/wav': 'wav',
      'audio/midi': 'mid',
      'application/zip': 'zip',
      'text/plain': 'txt'
    };
    return extensions[mimeType] || 'file';
  };

  const handleDownloadAll = () => {
    // Download all available files with a small delay between each
    downloadItems.forEach((item, index) => {
      if (item.url) {
        setTimeout(() => handleDownload(item), index * 500);
      }
    });
  };

  return (
    <div className="download-manager">
      <div className="download-header">
        <h4>Downloads</h4>
        <button 
          onClick={handleDownloadAll}
          className="download-all-btn"
          title="Download all files"
        >
          <Package />
          Download All
        </button>
      </div>

      <div className="download-grid">
        {downloadItems.map(item => (
          <div 
            key={item.id} 
            className={`download-item ${item.className} ${!item.url ? 'unavailable' : ''}`}
          >
            <div className="download-info">
              <div className="download-icon">
                {item.icon}
              </div>
              <div className="download-details">
                <div className="download-name">{item.name}</div>
                <div className="download-description">{item.description}</div>
              </div>
            </div>

            <div className="download-actions">
              {downloadCounts[item.id] && (
                <span className="download-count">
                  {downloadCounts[item.id]}× downloaded
                </span>
              )}
              
              <button
                onClick={() => handleDownload(item)}
                disabled={!item.url}
                className="download-btn"
                title={item.url ? `Download ${item.name}` : 'Not available'}
              >
                <Download />
                {item.url ? 'Download' : 'N/A'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="download-footer">
        <div className="download-tips">
          <h5>💡 Usage Tips:</h5>
          <ul>
            <li><strong>Backing Track:</strong> Play immediately or use as reference</li>
            <li><strong>MIDI:</strong> Import into any DAW for full customization</li>
            <li><strong>Stems:</strong> Individual tracks for professional mixing</li>
            <li><strong>Lyrics:</strong> Reference sheet for vocal recording</li>
          </ul>
        </div>
        
        <div className="daw-compatibility">
          <h5>🎚️ Compatible with:</h5>
          <div className="daw-list">
            <span>GarageBand</span>
            <span>Logic Pro</span>
            <span>Ableton Live</span>
            <span>FL Studio</span>
            <span>Pro Tools</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DownloadManager;
