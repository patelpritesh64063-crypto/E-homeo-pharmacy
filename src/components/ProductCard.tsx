import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Product } from '../utils/api';
import { useTranslation } from '../i18n/translations';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { lang, cart, addToCart, updateQuantity } = useStore();
  const t = useTranslation(lang);
  
  const cartItem = cart.find(item => item.id === product.id);
  const quantity = cartItem?.quantity || 0;

  return (
    <div className="glass-card animate-fade-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', marginBottom: '16px' }}>
          {product.emoji}
        </div>
        <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{product.category}</span>
        <h3 style={{ margin: '4px 0 8px', fontSize: '1.1rem' }}>{product.name}</h3>
        <p className="text-muted" style={{ fontSize: '0.875rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>
      </Link>
      
      <div className="flex items-center justify-between mt-4" style={{ paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹{product.price}</span>
        
        {quantity === 0 ? (
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={() => addToCart(product)}>
            {t('addToCart')}
          </button>
        ) : (
          <div className="flex items-center gap-2" style={{ background: 'var(--glass-bg)', borderRadius: '999px', padding: '4px' }}>
            <button className="btn-icon" style={{ width: '32px', height: '32px', padding: 0 }} onClick={() => updateQuantity(product.id, quantity - 1)}>-</button>
            <span style={{ width: '20px', textAlign: 'center', fontWeight: 'bold' }}>{quantity}</span>
            <button className="btn-icon" style={{ width: '32px', height: '32px', padding: 0 }} onClick={() => updateQuantity(product.id, quantity + 1)}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}
