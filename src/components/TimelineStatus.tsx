import { CheckCircle2, Clock, Truck, Home } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/translations';

type Status = 'Verified' | 'Accepted' | 'Paid' | 'Shipped' | 'Delivered';

const STATUS_ORDER: Status[] = ['Verified', 'Accepted', 'Paid', 'Shipped', 'Delivered'];

export default function TimelineStatus({ currentStatus }: { currentStatus: Status }) {
  const { lang } = useStore();
  const t = useTranslation(lang);
  
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  const getIcon = (status: Status, idx: number) => {
    const isActive = idx <= currentIndex;
    const color = isActive ? 'var(--accent-green)' : 'var(--text-muted)';
    
    switch (status) {
      case 'Verified': return <CheckCircle2 color={color} size={20} />;
      case 'Accepted': return <Clock color={color} size={20} />;
      case 'Paid': return <CheckCircle2 color={color} size={20} />;
      case 'Shipped': return <Truck color={color} size={20} />;
      case 'Delivered': return <Home color={color} size={20} />;
    }
  };

  return (
    <div style={{ position: 'relative', paddingLeft: '16px' }}>
      <div style={{
        position: 'absolute',
        left: '25px',
        top: '20px',
        bottom: '20px',
        width: '2px',
        background: 'var(--glass-border)',
        zIndex: 0
      }} />
      
      {STATUS_ORDER.map((status, idx) => {
        const isActive = idx <= currentIndex;
        return (
          <div key={status} className="flex items-center gap-4 animate-fade-in" style={{ marginBottom: '24px', position: 'relative', zIndex: 1, animationDelay: `${idx * 0.1}s` }}>
            <div style={{
              background: 'var(--bg-dark)',
              padding: '4px',
              borderRadius: '50%'
            }}>
              {getIcon(status, idx)}
            </div>
            <span style={{ 
              color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: isActive ? 600 : 400,
              fontSize: '1.1rem'
            }}>
              {t(`status${status}` as any)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
