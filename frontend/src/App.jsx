import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import LoadingSpinner from './components/LoadingSpinner';
import { useAuth } from './hooks/useAuth';
import { useWebSocket } from './hooks/useWebSocket';
import './styles/app.css';

function App() {
  const { user, loading, login, logout, register } = useAuth();
  const { connectionStatus, sessionUpdates } = useWebSocket(user?.id);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Show auth modal if no user and not loading
    if (!user && !loading) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [user, loading]);

  if (loading) {
    return <LoadingSpinner message="Loading Hum It Out..." />;
  }

  return (
    <div className="app">
      {user ? (
        <Dashboard 
          user={user} 
          connectionStatus={connectionStatus}
          sessionUpdates={sessionUpdates}
          onLogout={logout}
        />
      ) : (
        <AuthModal 
          isOpen={showAuthModal}
          onLogin={login}
          onRegister={register}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}

export default App;
