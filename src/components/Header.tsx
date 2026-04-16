import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/translations';
import { Activity, Globe, User } from 'lucide-react';

export default function Header() {
  const { lang, setLang } = useStore();
  const t = useTranslation(lang);

  const toggleLang = () => {
    setLang(lang === 'en' ? 'hi' : 'en');
  };

  return (
    <header className="glass-panel" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      padding: '16px 24px',
      borderRadius: '0 0 16px 16px',
      borderTop: 'none'
    }}>
      <div className="container flex items-center justify-between">
        <Link to="/catalog" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'var(--text-main)' }}>
          <div style={{ background: 'var(--accent-purple)', padding: '8px', borderRadius: '12px' }}>
            <Activity size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '2px' }}>{t('appTitle')}</h2>
            <p className="text-muted" style={{ fontSize: '0.75rem', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('tagline')}</p>
          </div>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link to="/login" className="btn-icon flex items-center justify-center" style={{ background: 'transparent', border: '1px solid var(--glass-border)', cursor: 'pointer', width: '38px', height: '38px', color: 'var(--text-main)', textDecoration: 'none' }}>
            <User size={18} />
          </Link>
          <button onClick={toggleLang} className="btn-icon flex items-center gap-2" style={{ background: 'transparent', border: '1px solid var(--glass-border)', cursor: 'pointer', height: '38px' }}>
            <Globe size={18} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{lang.toUpperCase()}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
