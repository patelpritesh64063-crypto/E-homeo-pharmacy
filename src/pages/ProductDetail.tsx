import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Product } from '../utils/api';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/translations';
import ProductCard from '../components/ProductCard';
import { ArrowLeft } from 'lucide-react';
import FloatingCart from '../components/FloatingCart';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, cart, addToCart, updateQuantity } = useStore();
  const t = useTranslation(lang);

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.fetchProduct(id).then(data => {
        setProduct(data.product);
        setRelated(data.related);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '40px' }}><p>Loading...</p></div>;
  if (!product) return <div className="container"><p>Product not found.</p></div>;

  const cartItem = cart.find(item => item.id === product.id);
  const quantity = cartItem?.quantity || 0;

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '100px' }}>
      <button onClick={() => navigate(-1)} className="btn-icon" style={{ marginBottom: '16px' }}>
        <ArrowLeft size={24} />
      </button>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', marginBottom: '24px' }}>
          {product.emoji}
        </div>

        <span className="text-muted" style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.875rem' }}>{product.category}</span>
        <h1 style={{ margin: '8px 0 16px', fontSize: '2rem' }}>{product.name}</h1>
        <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '24px' }}>{product.description}</p>

        <div className="flex items-center justify-between mt-4" style={{ paddingTop: '24px', borderTop: '1px solid var(--glass-border)' }}>
          <span style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>₹{product.price}</span>

          {quantity === 0 ? (
            <button className="btn btn-primary" onClick={() => addToCart(product)}>
              {t('addToCart')}
            </button>
          ) : (
            <div className="flex items-center gap-4" style={{ background: 'var(--glass-bg)', borderRadius: '999px', padding: '8px' }}>
              <button className="btn-icon" onClick={() => updateQuantity(product.id, quantity - 1)}>-</button>
              <span style={{ width: '24px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>{quantity}</span>
              <button className="btn-icon" onClick={() => updateQuantity(product.id, quantity + 1)}>+</button>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <>
          <h2 style={{ marginBottom: '16px' }}>{t('relatedProducts')}</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '16px'
          }}>
            {related.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}

      <FloatingCart />
    </div>
  );
}
