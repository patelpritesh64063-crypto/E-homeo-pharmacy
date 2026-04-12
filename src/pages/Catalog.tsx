import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { api, Product } from '../utils/api';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/translations';
import ProductCard from '../components/ProductCard';
import CategoryPills from '../components/CategoryPills';
import FloatingCart from '../components/FloatingCart';

export default function Catalog() {
  const { lang } = useStore();
  const t = useTranslation(lang);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.fetchCatalog()
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not connect to the server. Make sure the backend is running on http://127.0.0.1:8787');
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === '' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '60px' }}>
        <div className="loader" style={{ margin: '0 auto 16px' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '60px' }}>
        <p style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</p>
        <p style={{ color: '#ff6b6b', fontWeight: '600', marginBottom: '8px' }}>Backend Not Running</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error}</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '20px' }}
          onClick={() => { setLoading(true); setError(''); api.fetchCatalog().then(data => { setProducts(data); setLoading(false); }).catch(() => { setError('Could not connect to the server. Make sure the backend is running on http://127.0.0.1:8787'); setLoading(false); }); }}
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '100px' }}>
      
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <input 
          type="text" 
          className="input-glass" 
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '48px' }}
        />
        <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '14px' }} />
      </div>

      <CategoryPills 
        categories={categories} 
        activeCategory={activeCategory} 
        onSelect={setActiveCategory} 
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '16px',
        marginTop: '16px'
      }}>
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <FloatingCart />
    </div>
  );
}
