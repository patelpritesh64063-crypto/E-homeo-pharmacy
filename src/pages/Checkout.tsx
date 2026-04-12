import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, useCartTotal } from '../store/useStore';
import { useTranslation } from '../i18n/translations';
import { api } from '../utils/api';

export default function Checkout() {
  const navigate = useNavigate();
  const { lang, cart, deliveryMethod, setDeliveryMethod } = useStore();
  const t = useTranslation(lang);
  const total = useCartTotal();
  
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const deliveryCharge = deliveryMethod === 'delivery' ? 40 : 0;
  const finalTotal = total + deliveryCharge;

  if (cart.length === 0) {
    return (
      <div className="container animate-fade-in" style={{ textAlign: 'center', paddingTop: '40px' }}>
        <p>Your cart is empty.</p>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/catalog')}>Back to Catalog</button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { orderId, success } = await api.placeOrder({ ...formData, cart, deliveryMethod, finalTotal });
    setLoading(false);
    if (success) {
      navigate('/otp', { state: { orderId } });
    }
  };

  return (
    <div className="container animate-fade-in">
      <h1 className="mb-6">{t('checkout')}</h1>
      
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 className="mb-6">Order Summary</h3>
        {cart.map(item => (
          <div key={item.id} className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
            <div>
              <span>{item.quantity}x {item.name}</span>
            </div>
            <span style={{ fontWeight: 'bold' }}>₹{item.price * item.quantity}</span>
          </div>
        ))}
        
        <div style={{ margin: '24px 0', borderTop: '1px solid var(--glass-border)' }}></div>
        
        <div className="flex gap-4 mb-6">
          <label style={{ flex: 1, display: 'block' }}>
            <input 
              type="radio" 
              name="delivery" 
              checked={deliveryMethod === 'delivery'} 
              onChange={() => setDeliveryMethod('delivery')} 
              style={{ display: 'none' }}
            />
            <div className={`glass-card ${deliveryMethod === 'delivery' ? 'active-method' : ''}`} style={{ padding: '16px', textAlign: 'center', cursor: 'pointer', border: deliveryMethod === 'delivery' ? '2px solid var(--accent-purple)' : '2px solid transparent' }}>
              <strong>{t('delivery')}</strong>
              <div className="text-muted text-sm mt-2">{t('flatRate')}</div>
            </div>
          </label>
          
          <label style={{ flex: 1, display: 'block' }}>
            <input 
              type="radio" 
              name="delivery" 
              checked={deliveryMethod === 'pickup'} 
              onChange={() => setDeliveryMethod('pickup')} 
              style={{ display: 'none' }}
            />
            <div className={`glass-card ${deliveryMethod === 'pickup' ? 'active-method' : ''}`} style={{ padding: '16px', textAlign: 'center', cursor: 'pointer', border: deliveryMethod === 'pickup' ? '2px solid var(--accent-purple)' : '2px solid transparent' }}>
              <strong>{t('pickup')}</strong>
              <div className="text-muted text-sm mt-2">{t('free')}</div>
            </div>
          </label>
        </div>

        <div className="flex justify-between items-center mt-4">
          <span style={{ fontSize: '1.25rem' }}>{t('total')}</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>₹{finalTotal}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '24px' }}>
        <div className="flex flex-col gap-4">
          <input required className="input-glass" placeholder={t('name')} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <input required type="email" className="input-glass" placeholder={t('email')} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <input required type="tel" className="input-glass" placeholder={t('phone')} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          <textarea className="input-glass" placeholder={t('notes')} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} />
        </div>
        
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }}>
          {loading ? 'Processing...' : `${t('placeOrder')} - ₹${finalTotal}`}
        </button>
      </form>
    </div>
  );
}
