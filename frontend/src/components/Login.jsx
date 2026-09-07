import React, { useState, useEffect } from 'react';
import { Globe, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';
import { AuthApi } from '../api/authApi';
import logo from '../../assets/Logo.png';
import './Login.css';

/* ─────────────────────────────────────────────────────────────
   Login — redesigned UI, auth wired to App.jsx onLoginSuccess
───────────────────────────────────────────────────────────── */
const Login = ({ onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');
  const [logoutMessage, setLogoutMessage] = useState('');
  const [formData, setFormData]         = useState({ username: '', password: '' });

  // Check for logout reason on mount
  useEffect(() => {
    const message = sessionStorage.getItem('logoutMessage');
    if (message) {
      setLogoutMessage(message);
      // Clear the message after reading
      sessionStorage.removeItem('logoutMessage');
      sessionStorage.removeItem('logoutReason');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLogoutMessage(''); // Clear logout message when attempting new login
    setIsLoading(true);
    try {
      const response = await AuthApi.login(formData.username, formData.password);
      if (onLoginSuccess) onLoginSuccess(response.data);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  return (
    <div className="login-page">
      {/* Page-level decorative blobs */}
      <div className="login-blob login-blob--tr" aria-hidden="true" />
      <div className="login-blob login-blob--bl" aria-hidden="true" />

      <div className="login-card">

        {/* ══ LEFT PANEL ══ */}
        <div className="login-left" aria-hidden="true">
          <div className="left-blob left-blob--1" />
          <div className="left-blob left-blob--2" />
          <div className="left-blob left-blob--3" />

          <div className="left-content">
            <div className="left-logo">
              <img src={logo} alt="MESOB logo" className="left-logo-img" />
            </div>

            <h1 className="left-title">MESOB Center</h1>

            <p className="left-subtitle">
              Access your HR dashboard with your personal account and stay
              connected with your workplace.
            </p>

            <span className="left-badge">
              <Globe size={13} strokeWidth={2} />
              HRMS
            </span>
          </div>
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div className="login-right">
          <div className="login-form-wrap">
            <h2 className="form-heading">Login</h2>
            <p className="form-subheading">Login to your account to continue</p>

            {logoutMessage && (
              <div className="login-info" role="status">
                <Info size={15} strokeWidth={2} aria-hidden="true" />
                <span>{logoutMessage}</span>
              </div>
            )}

            {error && (
              <div className="login-error" role="alert">
                <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="field-group">
                <label htmlFor="username" className="field-label">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  className="field-input"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={isLoading}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="password" className="field-label">Password</label>
                <div className="pw-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    className="field-input"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword
                      ? <EyeOff size={17} strokeWidth={2} />
                      : <Eye    size={17} strokeWidth={2} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="signin-btn" disabled={isLoading}>
                {isLoading ? 'Signing In…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
