import { ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore, useCartTotal } from '../store/useStore';
import { useTranslation } from '../i18n/translations';

export default function FloatingCart() {
  const navigate = useNavigate();
  const { lang, cart } = useStore();
  const t = useTranslation(lang);
  const total = useCartTotal();

  if (cart.length === 0) return null;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="glass-panel animate-fade-in" style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: '400px',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 40,
      background: 'rgba(124, 111, 233, 0.9)',
      border: '1px solid rgba(255,255,255,0.2)',
      cursor: 'pointer'
    }} onClick={() => navigate('/checkout')}>
      <div className="flex items-center gap-4">
        <div style={{ position: 'relative' }}>
          <ShoppingBag size={24} color="#fff" />
          <div style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: 'var(--accent-green)',
            color: '#111',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 'bold'
          }}>
            {totalItems}
          </div>
        </div>
        <div style={{ color: '#fff' }}>
          <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>{totalItems} {t('items')}</p>
          <p style={{ fontWeight: 'bold' }}>₹{total}</p>
        </div>
      </div>
      <div style={{ color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{t('checkout')}</span>
        <span>→</span>
      </div>
    </div>
  );
}
