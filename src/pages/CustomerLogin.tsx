import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Phone, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: any;
    handleGoogleCallback?: (response: any) => void;
  }
}

type Tab = 'google' | 'email' | 'phone';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCustomer } = useStore();
  const returnTo = (location.state as any)?.from || '/catalog';

  const [tab, setTab] = useState<Tab>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Countdown for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const tryInit = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-btn'),
          { theme: 'filled_black', size: 'large', width: 320, text: 'continue_with' }
        );
      } else {
        setTimeout(tryInit, 500);
      }
    };
    tryInit();
  }, [tab]);

  const handleGoogleCallback = async (response: any) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomer(data.user, data.token);
        navigate(returnTo, { replace: true });
      } else {
        setError(data.error || 'Google sign-in failed');
      }
    } catch { setError('Connection failed'); }
    finally { setLoading(false); }
  };

  const sendOtp = async () => {
    setError('');
    if (tab === 'email' && !email) return setError('Enter your email address');
    if (tab === 'phone' && !phone) return setError('Enter your mobile number');
    setLoading(true);
    try {
      const body = tab === 'email' ? { email } : { phone: `+91${phone.replace(/\D/g, '')}` };
      const res = await fetch(`${BASE_URL}/api/auth/otp/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) { setOtpSent(true); setCountdown(60); setOtp(''); }
      else setError(data.error || 'Failed to send OTP');
    } catch { setError('Connection failed. Try again.'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    setError('');
    if (otp.length !== 6) return setError('Enter the 6-digit OTP');
    setLoading(true);
    try {
      const body = tab === 'email'
        ? { email, otp }
        : { phone: `+91${phone.replace(/\D/g, '')}`, otp };
      const res = await fetch(`${BASE_URL}/api/auth/otp/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomer(data.user, data.token);
        navigate(returnTo, { replace: true });
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch { setError('Connection failed'); }
    finally { setLoading(false); }
  };

  const switchTab = (t: Tab) => {
    setTab(t); setError(''); setOtpSent(false); setOtp('');
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px 32px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, rgba(124,111,233,0.3), rgba(52,211,153,0.2))',
            border: '1px solid rgba(124,111,233,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'
          }}>🌿</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '6px' }}>Welcome Back</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Sign in to track your orders & shop easily</p>
        </div>

        {/* Tab buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: GOOGLE_CLIENT_ID ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px', marginBottom: '28px' }}>
          {[
            ...(GOOGLE_CLIENT_ID ? [{ id: 'google', label: 'Google', icon: '🔵' }] : []),
            { id: 'email', label: 'Email OTP', icon: '✉️' },
            { id: 'phone', label: 'Phone OTP', icon: '📱' },
          ].map(t => (
            <button key={t.id} onClick={() => switchTab(t.id as Tab)}
              style={{
                padding: '10px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s',
                background: tab === t.id ? 'var(--accent-purple)' : 'rgba(255,255,255,0.07)',
                color: tab === t.id ? '#fff' : 'var(--text-muted)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
              }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
            display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171', fontSize: '0.875rem'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Google Sign-In */}
        {tab === 'google' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            {GOOGLE_CLIENT_ID ? (
              <div id="google-btn" style={{ minHeight: '44px' }} />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <p>Google Sign-In is not configured yet.</p>
                <p style={{ marginTop: '8px' }}>Please use <strong>Email OTP</strong> or <strong>Phone OTP</strong> to sign in.</p>
              </div>
            )}
          </div>
        )}

        {/* Email OTP */}
        {tab === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!otpSent ? (
              <>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="email" className="input-glass" placeholder="Enter your email address"
                    value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendOtp()}
                    style={{ paddingLeft: '44px' }} />
                </div>
                <button className="btn btn-primary" onClick={sendOtp} disabled={loading} style={{ width: '100%', gap: '8px' }}>
                  {loading ? 'Sending...' : 'Send OTP'} {!loading && <ArrowRight size={18} />}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                  OTP sent to <strong style={{ color: 'var(--text-main)' }}>{email}</strong>
                </p>
                <input className="input-glass" placeholder="Enter 6-digit OTP" maxLength={6}
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 700 }} />
                <button className="btn btn-primary" onClick={verifyOtp} disabled={loading || otp.length !== 6} style={{ width: '100%' }}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
                <button onClick={() => { countdown === 0 ? sendOtp() : null; }}
                  disabled={countdown > 0}
                  style={{ background: 'none', border: 'none', color: countdown > 0 ? 'var(--text-muted)' : 'var(--accent-purple)', cursor: countdown > 0 ? 'default' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}>
                  <RefreshCw size={14} /> {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Phone OTP */}
        {tab === 'phone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!otpSent ? (
              <>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, zIndex: 1, pointerEvents: 'none' }}>
                    🇮🇳 +91
                  </div>
                  <input type="tel" className="input-glass" placeholder="10-digit mobile number"
                    value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={e => e.key === 'Enter' && sendOtp()}
                    style={{ paddingLeft: '80px' }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  SMS OTP via Fast2SMS. Requires FAST2SMS_API_KEY to be configured.
                </p>
                <button className="btn btn-primary" onClick={sendOtp} disabled={loading || phone.length !== 10} style={{ width: '100%', gap: '8px' }}>
                  {loading ? 'Sending SMS...' : 'Send OTP'} {!loading && <Phone size={18} />}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                  OTP sent to <strong style={{ color: 'var(--text-main)' }}>+91 {phone}</strong>
                </p>
                <input className="input-glass" placeholder="Enter 6-digit OTP" maxLength={6}
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 700 }} />
                <button className="btn btn-primary" onClick={verifyOtp} disabled={loading || otp.length !== 6} style={{ width: '100%' }}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
                <button onClick={() => countdown === 0 && sendOtp()} disabled={countdown > 0}
                  style={{ background: 'none', border: 'none', color: countdown > 0 ? 'var(--text-muted)' : 'var(--accent-purple)', cursor: countdown > 0 ? 'default' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}>
                  <RefreshCw size={14} /> {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                </button>
              </>
            )}
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          By signing in, you agree to our terms. Your data is secure.
        </p>
      </div>
    </div>
  );
}
