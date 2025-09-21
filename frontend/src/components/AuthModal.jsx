import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone } from 'lucide-react';

function AuthModal({ isOpen, onLogin, onRegister, onClose }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLoginMode) {
        await onLogin(formData.email, formData.password);
      } else {
        await onRegister(formData);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: ''
    });
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <div className="auth-modal-header">
          <h2>🎵 {isLoginMode ? 'Welcome Back' : 'Join Hum It Out'}</h2>
          <button onClick={onClose} className="close-btn">
            <X />
          </button>
        </div>

        <div className="auth-modal-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLoginMode && (
              <div className="form-group">
                <label htmlFor="name">
                  <User size={18} />
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required={!isLoginMode}
                  placeholder="Your full name"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">
                <Mail size={18} />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
              />
            </div>

            {!isLoginMode && (
              <div className="form-group">
                <label htmlFor="phone">
                  <Phone size={18} />
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1234567890"
                />
                <small className="form-help">
                  Optional: For SMS notifications when your tracks are ready
                </small>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">
                <Lock size={18} />
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Your password"
                minLength={6}
              />
              {!isLoginMode && (
                <small className="form-help">
                  Minimum 6 characters
                </small>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-submit-btn"
            >
              {loading ? (
                <>
                  <div className="spinner small"></div>
                  {isLoginMode ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLoginMode ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="auth-switch">
            <p>
              {isLoginMode ? "Don't have an account?" : "Already have an account?"}
              <button 
                onClick={switchMode}
                className="auth-switch-btn"
              >
                {isLoginMode ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {!isLoginMode && (
            <div className="auth-info">
              <h4>What you'll get:</h4>
              <ul>
                <li>🎵 Unique 6-digit PIN for phone calls</li>
                <li>📱 SMS notifications when tracks are ready</li>
                <li>💾 Access to all your generated music</li>
                <li>🎚️ Professional-quality DAW-ready files</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
