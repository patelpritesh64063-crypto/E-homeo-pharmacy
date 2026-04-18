import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useTranslation } from '../i18n/translations';
import { useStore } from '../store/useStore';

export default function CustomerLogin() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { lang } = useStore();
  const t = useTranslation(lang);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin ? { email, password } : { name, email, password };
      
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        localStorage.setItem('customer_token', data.token);
        localStorage.setItem('customer_email', email);
        if (data.user) localStorage.setItem('customer_name', data.user.name);
        navigate('/catalog');
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Failed to ' + (isLogin ? 'login' : 'register'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '40px' }}>
      <div className="glass-panel login-card" style={{ padding: '32px', maxWidth: '400px', width: '100%' }}>
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '16px', borderRadius: '50%' }}>
              <User size={32} className="text-purple" />
            </div>
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-muted">
            {isLogin ? 'Login to access your orders and profile' : 'Join us for a better shopping experience'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-badge">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!isLogin && (
            <div className="input-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '8px' }}>Full Name</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-glass"
                  style={{ paddingLeft: '40px', width: '100%' }}
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '8px' }}>Email Address</label>
            <div className="input-wrapper" style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glass"
                style={{ paddingLeft: '40px', width: '100%' }}
                required
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '8px' }}>Password</label>
            <div className="input-wrapper" style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-glass"
                style={{ paddingLeft: '40px', width: '100%' }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}
            disabled={isLoading}
          >
            {isLoading ? '...' : (isLogin ? 'Login' : 'Sign Up')}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
          <p className="text-muted text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
