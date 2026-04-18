import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Shield, Truck, Star, Leaf, ArrowRight, Sparkles } from 'lucide-react';
import { api, Product } from '../utils/api';

export default function Home() {
  const navigate = useNavigate();
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchCatalog().then(all => {
      setBestSellers(all.slice(0, 4));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      {/* ─── Hero Section ─────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 20px 40px' }}>
        {/* Animated Background Orbs */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px',
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,111,233,0.18) 0%, transparent 70%)',
            animation: 'float 8s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute', bottom: '-10%', right: '-10%', width: '500px', height: '500px',
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)',
            animation: 'float 10s ease-in-out infinite reverse'
          }} />
          <div style={{
            position: 'absolute', top: '40%', right: '20%', width: '300px', height: '300px',
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,111,233,0.10) 0%, transparent 70%)',
            animation: 'float 6s ease-in-out infinite 2s'
          }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(124,111,233,0.15)', border: '1px solid rgba(124,111,233,0.3)',
            borderRadius: '99px', padding: '8px 20px', marginBottom: '32px',
            fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-purple)'
          }}>
            <Sparkles size={14} />
            100% Authentic Homeopathy
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 7vw, 5rem)', fontWeight: 800, lineHeight: 1.1,
            marginBottom: '24px', letterSpacing: '-0.02em'
          }}>
            Heal Naturally with{' '}
            <span style={{
              background: 'linear-gradient(135deg, #7C6FE9 0%, #34D399 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              E-Homeo Pharmacy
            </span>
          </h1>

          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: 'var(--text-muted)', maxWidth: '560px', margin: '0 auto 48px', lineHeight: 1.7 }}>
            Premium homeopathic medicines, dilutions, and mother tinctures delivered to your doorstep. Trusted remedies, modern convenience.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/catalog')}
              style={{ padding: '16px 36px', fontSize: '1.05rem', gap: '10px', borderRadius: '99px' }}>
              <ShoppingBag size={20} /> Shop Now
            </button>
            <button className="btn" onClick={() => navigate('/catalog')}
              style={{ padding: '16px 36px', fontSize: '1.05rem', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', gap: '8px' }}>
              Browse Catalog <ArrowRight size={18} />
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(24px, 6vw, 64px)', marginTop: '64px', flexWrap: 'wrap' }}>
            {[
              { value: '500+', label: 'Products' },
              { value: '10k+', label: 'Happy Customers' },
              { value: '4.9★', label: 'Rating' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 800, background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stat.value}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Section ─────────────────────────────── */}
      <section style={{ padding: '60px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 700, marginBottom: '12px' }}>Why Choose E-Homeo?</h2>
          <p style={{ color: 'var(--text-muted)' }}>Everything you need for your healing journey</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {[
            { icon: <Shield size={28} />, title: '100% Authentic', desc: 'All medicines sourced from certified manufacturers and quality-tested.', color: 'var(--accent-purple)' },
            { icon: <Truck size={28} />, title: 'Fast Delivery', desc: 'Free home delivery on orders above ₹500. Quick dispatch within 24 hours.', color: 'var(--accent-green)' },
            { icon: <Star size={28} />, title: 'Expert Care', desc: 'Years of experience in homeopathy. Each product curated by specialists.', color: '#f59e0b' },
            { icon: <Leaf size={28} />, title: 'Natural Healing', desc: 'Gentle, side-effect-free remedies that work with your body\'s natural systems.', color: '#34d399' },
          ].map(feat => (
            <div key={feat.title} className="glass-card" style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '16px', margin: '0 auto 20px',
                background: feat.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: feat.color, border: `1px solid ${feat.color}30`
              }}>
                {feat.icon}
              </div>
              <h3 style={{ marginBottom: '10px', fontWeight: 700, fontSize: '1.05rem' }}>{feat.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Best Sellers ─────────────────────────────────── */}
      <section style={{ padding: '40px 20px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: 700 }}>Best Sellers</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Our most popular remedies</p>
          </div>
          <button className="btn" onClick={() => navigate('/catalog')}
            style={{ background: 'rgba(255,255,255,0.07)', gap: '8px' }}>
            View All <ArrowRight size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="glass-card" style={{ height: '260px', background: 'rgba(30,41,59,0.3)', animation: 'pulse-subtle 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
            {bestSellers.map(product => (
              <div key={product.id} className="glass-card" onClick={() => navigate(`/product/${product.id}`)}
                style={{ padding: '0', cursor: 'pointer', overflow: 'hidden' }}>
                <div style={{
                  height: '160px', background: 'linear-gradient(135deg, rgba(124,111,233,0.15) 0%, rgba(52,211,153,0.1) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem',
                  position: 'relative', overflow: 'hidden'
                }}>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>{product.emoji || '💊'}</span>
                  )}
                </div>
                <div style={{ padding: '16px' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{product.category}</p>
                  <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '12px', lineHeight: 1.3 }}>{product.name}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-green)' }}>₹{product.price}</span>
                    <button className="btn btn-primary" onClick={e => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
                      style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Buy Now</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── CTA Banner ───────────────────────────────────── */}
      <section style={{ padding: '0 20px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          borderRadius: '24px', padding: 'clamp(40px, 6vw, 64px)',
          background: 'linear-gradient(135deg, rgba(124,111,233,0.25) 0%, rgba(52,211,153,0.15) 100%)',
          border: '1px solid rgba(124,111,233,0.3)', textAlign: 'center', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-40%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,111,233,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '16px', position: 'relative' }}>
            Start Your Healing Journey Today
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '32px', position: 'relative' }}>
            Explore our complete range of homeopathic medicines and find the perfect remedy for you.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/catalog')}
            style={{ padding: '16px 48px', fontSize: '1.1rem', gap: '10px', position: 'relative' }}>
            <ShoppingBag size={20} /> Shop the Catalog
          </button>
        </div>
      </section>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
