import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/translations';
import { api, OrderStatus } from '../utils/api';
import TimelineStatus from '../components/TimelineStatus';
import Confetti from '../components/Confetti';
import { IndianRupee } from 'lucide-react';

export default function OrderTracking() {
  const { orderId } = useParams();
  const { lang } = useStore();
  const t = useTranslation(lang);
  
  const [status, setStatus] = useState<OrderStatus>('Verified');
  const [loading, setLoading] = useState(true);
  const [showConfetti] = useState(false);

  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      api.trackOrder(orderId).then(res => {
        setStatus(res.status);
        if (res.payment_url) {
          setPaymentUrl(res.payment_url);
        }
        setLoading(false);
      });
    }
  }, [orderId]);

  const handlePayment = () => {
    if (paymentUrl) {
      window.location.href = paymentUrl; // Redirect to Razorpay payment link
    } else {
      // Fallback
      alert('Payment link not generated yet. Please contact admin.');
    }
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '40px' }}><p>Loading...</p></div>;

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '600px' }}>
      {showConfetti && <Confetti />}
      
      <h1 className="mb-6">{t('trackingTitle')}</h1>
      <p className="text-muted mb-6">Order #{orderId}</p>

      <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
        <TimelineStatus currentStatus={status} />
      </div>

      {(status === 'Accepted' || status === 'Verified') && (
        <button className="btn btn-success" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} onClick={handlePayment}>
          <IndianRupee size={20} /> {t('payNow')}
        </button>
      )}

      {(status === 'Shipped' || status === 'Delivered') && (
        <div className="glass-panel text-center animate-fade-in" style={{ padding: '24px', background: 'rgba(52, 211, 153, 0.1)', borderColor: 'var(--accent-green)' }}>
          <h2 className="text-green mb-2">Thank you!</h2>
          <p>Your order process is complete.</p>
        </div>
      )}
    </div>
  );
}
