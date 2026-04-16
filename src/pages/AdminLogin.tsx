import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, Key } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep(2);
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('Connection failed. Please check if the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${BASE_URL}/api/admin/login-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('admin_token', data.token);
        navigate('/admin/dashboard');
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('Connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-container animate-fade-in">
      <div className="glass-panel login-card">
        <div className="login-header">
          <div className="login-icon">
            <Lock size={32} className="text-purple" />
          </div>
          <h1>Admin Portal</h1>
          <p className="text-muted">Access your store management dashboard</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleLogin} className="login-form">
            {error && (
              <div className="error-badge">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  id="email"
                  type="email"
                  placeholder="admin@epharm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-glass"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-glass"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-login" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loader"></span>
              ) : (
                <>
                  Login Options
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="login-form">
            {error && (
              <div className="error-badge">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            
            <p className="text-center text-sm mb-4">An OTP has been sent to your email.</p>

            <div className="input-group">
              <label htmlFor="otp">Enter OTP</label>
              <div className="input-wrapper">
                <Key className="input-icon" size={18} />
                <input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="input-glass"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-login" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loader"></span>
              ) : (
                <>
                  Verify OTP
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        <div className="login-footer">
          <p className="text-muted">Secure Encrypted Session</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
