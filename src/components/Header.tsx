import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Activity, Globe, User, Package, LogOut, ChevronDown } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function Header() {
  const { lang, setLang, customer, customerToken, clearCustomer } = useStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleLang = () => setLang(lang === 'en' ? 'hi' : 'en');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    if (customerToken) {
      try {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${customerToken}` }
        });
      } catch {}
    }
    clearCustomer();
    setDropdownOpen(false);
    navigate('/');
  };

  // Get initials for avatar
  const initials = customer?.name
    ? customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="glass-panel" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      padding: '14px 24px', borderRadius: '0 0 16px 16px', borderTop: 'none'
    }}>
      <div className="container flex items-center justify-between">
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--accent-purple)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
            <Activity size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1px', fontWeight: 800 }}>E-Homeo</h2>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>Natural Pharmacy</p>
          </div>
        </Link>

        {/* Nav links (desktop) */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Link to="/catalog" style={{ textDecoration: 'none', color: 'var(--text-muted)', padding: '8px 14px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.2s' }}
            onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text-main)'}
            onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-muted)'}>
            Catalog
          </Link>
        </nav>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Language toggle */}
          <button onClick={toggleLang} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)',
            borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600
          }}>
            <Globe size={15} /> {lang.toUpperCase()}
          </button>

          {/* Customer section */}
          {customer ? (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button onClick={() => setDropdownOpen(o => !o)}
                style={{
                  background: 'rgba(124,111,233,0.15)', border: '1px solid rgba(124,111,233,0.3)',
                  borderRadius: '99px', padding: '6px 12px 6px 6px', cursor: 'pointer', color: 'var(--text-main)',
                  display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                }}>
                {/* Avatar circle */}
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-purple)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: '#fff'
                }}>
                  {initials}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {customer.name?.split(' ')[0]}
                </span>
                <ChevronDown size={14} color="var(--text-muted)" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: '180px',
                  background: 'rgba(15,23,42,0.95)', border: '1px solid var(--glass-border)',
                  borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 200,
                  backdropFilter: 'blur(16px)'
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{customer.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{customer.email}</div>
                  </div>
                  <button onClick={() => { navigate('/my-orders'); setDropdownOpen(false); }}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', color: 'var(--text-main)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => (e.target as HTMLElement).style.background = 'none'}>
                    <Package size={16} color="var(--accent-purple)" /> My Orders
                  </button>
                  <button onClick={handleLogout}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', color: '#f87171', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', borderTop: '1px solid var(--glass-border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.target as HTMLElement).style.background = 'rgba(248,113,113,0.08)'}
                    onMouseLeave={e => (e.target as HTMLElement).style.background = 'none'}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => navigate('/login')}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)',
                borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: 'var(--text-main)',
                display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.875rem', fontWeight: 600
              }}>
              <User size={16} /> Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
