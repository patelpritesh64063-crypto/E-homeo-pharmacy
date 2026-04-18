import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/translations';
import { api } from '../utils/api';

export default function OTPVerification() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { lang, clearCart } = useStore();
  const t = useTranslation(lang);
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(30);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!state?.orderId) {
      navigate('/catalog');
    }
    const timer = setInterval(() => {
      setCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [state, navigate]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next
    if (value !== '' && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length === 6) {
      setLoading(true);
      const res = await api.verifyOTP(fullOtp, state.orderId);
      setLoading(false);
      if (res.success) {
        clearCart();
        if (res.payment_url) {
          window.location.href = res.payment_url;
        } else {
          navigate(`/track/${state.orderId}`);
        }
      } else {
        alert('Invalid OTP');
      }
    }
  };

  const handleResend = async () => {
    if (cooldown === 0) {
      await api.resendOTP(state.orderId);
      setCooldown(30);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '40px' }}>
      <div className="glass-panel" style={{ padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h2 className="mb-6">{t('verifyOTP')}</h2>
        <p className="text-muted mb-6">{t('enterOTP')}</p>
        
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={el => inputRefs.current[idx] = el}
              className="input-glass"
              style={{ width: '45px', height: '55px', textAlign: 'center', fontSize: '1.5rem', padding: 0 }}
              maxLength={1}
              value={digit}
              onChange={e => handleChange(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
            />
          ))}
        </div>
        
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', marginBottom: '16px' }}
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6}
        >
          {loading ? 'Verifying...' : t('verify')}
        </button>
        
        <button 
          onClick={handleResend} 
          disabled={cooldown > 0} 
          style={{ background: 'none', border: 'none', color: cooldown > 0 ? 'var(--text-muted)' : 'var(--accent-purple)', cursor: cooldown > 0 ? 'default' : 'pointer', fontSize: '0.875rem' }}
        >
          {t('resendOTP')} {cooldown > 0 && `(${cooldown}s)`}
        </button>
      </div>
    </div>
  );
}
