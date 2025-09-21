import React, { useState, useEffect } from 'react';
import SessionCard from './SessionCard';
import PinDisplay from './PinDisplay';
import ConnectionStatus from './ConnectionStatus';
import { Phone, Music, Download, Users } from 'lucide-react';
import { api } from '../utils/api';

function Dashboard({ user, connectionStatus, sessionUpdates, onLogout }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    totalDownloads: 0
  });

  useEffect(() => {
    loadUserSessions();
    loadUserStats();
  }, []);

  useEffect(() => {
    // Update sessions when real-time updates come in
    if (sessionUpdates && Object.keys(sessionUpdates).length > 0) {
      loadUserSessions();
    }
  }, [sessionUpdates]);

  const loadUserSessions = async () => {
    try {
      const response = await api.get('/dashboard/sessions');
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data.stats || stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSessionUpdate = () => {
    loadUserSessions();
    loadUserStats();
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="dashboard-title">🎵 Hum It Out</h1>
            <p className="dashboard-subtitle">Voice to studio-ready music</p>
          </div>
          <div className="header-right">
            <ConnectionStatus status={connectionStatus} />
            <PinDisplay pin={user.pin} />
            <button onClick={onLogout} className="logout-btn">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Stats Dashboard */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Music />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalSessions}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Download />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.completedSessions}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Users />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalDownloads}</div>
            <div className="stat-label">Downloads</div>
          </div>
        </div>
      </div>

      {/* Call Instructions */}
      <section className="call-instructions">
        <div className="instruction-content">
          <Phone className="instruction-icon" />
          <div className="instruction-text">
            <div className="phone-number">
              📞 Call: <strong>555-HUMS (555-4867)</strong>
            </div>
            <div className="instruction-steps">
              Enter your PIN when prompted, then hum your melody!
            </div>
            <div className="instruction-note">
              💡 Your generated tracks will appear below when ready (usually 60 seconds)
            </div>
          </div>
        </div>
      </section>

      {/* Sessions */}
      <section className="sessions-section">
        <div className="section-header">
          <h2>Recent Sessions</h2>
          {sessions.length > 0 && (
            <button 
              onClick={loadUserSessions} 
              className="refresh-btn"
            >
              Refresh
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-sessions">
            <div className="spinner"></div>
            <p>Loading your sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="no-sessions">
            <div className="no-sessions-icon">🎤</div>
            <h3>No sessions yet</h3>
            <p>Call the number above to create your first musical session!</p>
            <div className="getting-started">
              <h4>Getting Started:</h4>
              <ol>
                <li>Call <strong>555-HUMS</strong> from any phone</li>
                <li>Enter your PIN: <code>{user.pin}</code></li>
                <li>Hum or sing for up to 30 seconds</li>
                <li>Receive SMS with download links</li>
                <li>Import files into your favorite DAW</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="sessions-grid">
            {sessions.map(session => (
              <SessionCard 
                key={session.id} 
                session={session}
                onUpdate={handleSessionUpdate}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
