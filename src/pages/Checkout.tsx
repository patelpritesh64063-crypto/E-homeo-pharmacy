import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, useCartTotal } from '../store/useStore';
import { useTranslation } from '../i18n/translations';
import { api } from '../utils/api';
import { ShieldCheck, User } from 'lucide-react';

export default function Checkout() {
  const navigate = useNavigate();
  const { lang, cart, deliveryMethod, setDeliveryMethod, clearCart, customer, customerToken } = useStore();
  const t = useTranslation(lang);
  const total = useCartTotal();
  
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  // Require login before accessing checkout
  useEffect(() => {
    if (!customerToken) {
      navigate('/login', { state: { from: '/checkout' } });
    }
  }, [customerToken]);

  // Pre-fill form from logged-in customer
  useEffect(() => {
    if (customer) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || customer.name || '',
        email: prev.email || customer.email || '',
        phone: prev.phone || customer.phone || '',
      }));
    }
  }, [customer]);

  const deliveryCharge = deliveryMethod === 'delivery' ? 40 : 0;
  const finalTotal = total + deliveryCharge;

  if (cart.length === 0) {
    return (
      <div className="container animate-fade-in" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🛒</div>
        <h2 style={{ marginBottom: '8px' }}>Your cart is empty</h2>
        <p className="text-muted" style={{ marginBottom: '24px' }}>Add some products before checking out.</p>
        <button className="btn btn-primary" onClick={() => navigate('/catalog')}>Browse Catalog</button>
      </div>
    );
  }

  if (!customerToken) return null; // Will redirect

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      items: cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      })),
      customer_info: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      },
      delivery_type: deliveryMethod,
      notes: formData.notes
    };

    try {
      const result = await api.placeOrder(payload);
      if (result.success && result.payment_url) {
        clearCart();
        window.location.href = result.payment_url;
      } else {
        alert('Order failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert(err.message || 'Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '640px' }}>
      <h1 className="mb-6">{t('checkout')}</h1>

      {/* Logged-in badge */}
      {customer && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
          background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
          borderRadius: '12px', marginBottom: '20px', fontSize: '0.875rem'
        }}>
          <ShieldCheck size={18} color="var(--accent-green)" />
          <span>Logged in as <strong style={{ color: 'var(--accent-green)' }}>{customer.name}</strong> · {customer.email}</span>
        </div>
      )}

      {/* Order Summary */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px' }}>
        <h3 className="mb-6">Order Summary</h3>
        {cart.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>{item.emoji || '💊'}</span>
              <span>{item.quantity}× {item.name}</span>
            </div>
            <span style={{ fontWeight: 700 }}>₹{item.price * item.quantity}</span>
          </div>
        ))}

        <div style={{ margin: '20px 0', borderTop: '1px solid var(--glass-border)' }} />

        {/* Delivery method */}
        <div className="flex gap-4 mb-6">
          {[
            { value: 'delivery', label: t('delivery'), sub: '₹40 flat rate' },
            { value: 'pickup', label: t('pickup'), sub: 'Free · Pick up from store' },
          ].map(m => (
            <label key={m.value} style={{ flex: 1, cursor: 'pointer' }}>
              <input type="radio" name="delivery" checked={deliveryMethod === m.value as any}
                onChange={() => setDeliveryMethod(m.value as any)} style={{ display: 'none' }} />
              <div style={{
                padding: '16px', textAlign: 'center', borderRadius: '12px',
                background: 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.2s',
                border: deliveryMethod === m.value ? '2px solid var(--accent-purple)' : '2px solid transparent'
              }}>
                <strong>{m.label}</strong>
                <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>{m.sub}</div>
              </div>
            </label>
          ))}
        </div>

        {deliveryCharge > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <span>Delivery charge</span><span>₹{deliveryCharge}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800 }}>
          <span>Total</span>
          <span style={{ color: 'var(--accent-green)' }}>₹{finalTotal}</span>
        </div>
      </div>

      {/* Contact Details */}
      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} /> Contact Details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input required className="input-glass" placeholder={t('name')}
            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          <input required type="email" className="input-glass" placeholder={t('email')}
            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <input required type="tel" className="input-glass" placeholder="Mobile number (+91...)"
            value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          <textarea className="input-glass" placeholder="Order notes (optional)"
            value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} style={{ resize: 'vertical' }} />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '24px', padding: '16px', fontSize: '1rem' }}>
          {loading ? '⏳ Redirecting to payment...' : `🔒 Pay ₹${finalTotal} via Stripe`}
        </button>
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px' }}>
          Secure payment powered by Stripe
        </p>
      </form>
    </div>
  );
}
