import React from 'react';

function ConnectionStatus({ status }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          className: 'status-connected',
          icon: '🟢',
          text: 'Connected',
          description: 'Real-time updates active'
        };
      case 'disconnected':
        return {
          className: 'status-disconnected', 
          icon: '🔴',
          text: 'Disconnected',
          description: 'Refresh to reconnect'
        };
      case 'connecting':
        return {
          className: 'status-connecting',
          icon: '🟡',
          text: 'Connecting...',
          description: 'Establishing connection'
        };
      default:
        return {
          className: 'status-unknown',
          icon: '⚪',
          text: 'Unknown',
          description: 'Connection status unknown'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`connection-status ${config.className}`}>
      <div className="status-indicator">
        <span className="status-icon">{config.icon}</span>
        <span className="status-text">{config.text}</span>
      </div>
      <div className="status-description">{config.description}</div>
    </div>
  );
}

export default ConnectionStatus;
