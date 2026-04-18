import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Package, ChevronDown, ChevronUp, LogOut, ExternalLink } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const STATUS_COLORS: Record<string, string> = {
  verified: '#a78bfa', accepted: '#34d399', paid: '#60a5fa',
  shipped: '#fbbf24', delivered: '#34d399', cancelled: '#f87171', pending: '#94a3b8'
};

export default function MyOrders() {
  const navigate = useNavigate();
  const { customer, customerToken, clearCustomer } = useStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!customerToken) { navigate('/login', { state: { from: '/my-orders' } }); return; }
    fetchOrders();
  }, [customerToken]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/my-orders`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else if (res.status === 401) {
        clearCustomer();
        navigate('/login', { state: { from: '/my-orders' } });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { clearCustomer(); navigate('/'); };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '800px', padding: '24px 16px' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'clamp(1.4rem, 4vw, 2rem)' }}>
            <Package size={28} color="var(--accent-purple)" /> My Orders
          </h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>
            Welcome back, <strong style={{ color: 'var(--text-main)' }}>{customer?.name}</strong>
          </p>
        </div>
        <button className="btn" onClick={handleLogout} style={{ gap: '8px', fontSize: '0.9rem' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-panel" style={{ height: '80px', animation: 'pulse-subtle 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && orders.length === 0 && (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🛒</div>
          <h2 style={{ marginBottom: '8px' }}>No orders yet</h2>
          <p className="text-muted" style={{ marginBottom: '24px' }}>Start shopping to see your orders here.</p>
          <button className="btn btn-primary" onClick={() => navigate('/catalog')}>Browse Catalog</button>
        </div>
      )}

      {/* Orders list */}
      {!loading && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {orders.map(order => {
            const items = (() => { try { return JSON.parse(order.items_json || '[]'); } catch { return []; } })();
            const paymentFields = (() => { try { return JSON.parse(order.payment_fields || '{}'); } catch { return {}; } })();
            const isExpanded = expanded === order.order_ref;
            const total = paymentFields.amount_paise ? paymentFields.amount_paise / 100 : 0;

            return (
              <div key={order.order_ref} className="glass-panel" style={{ overflow: 'hidden' }}>
                {/* Order header row */}
                <div
                  onClick={() => setExpanded(isExpanded ? null : order.order_ref)}
                  style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-purple)' }}>{order.order_ref}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {' · '}{order.delivery_type === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: '20px', fontWeight: 600, fontSize: '0.8rem',
                      color: STATUS_COLORS[order.status] || '#94a3b8',
                      background: (STATUS_COLORS[order.status] || '#94a3b8') + '20',
                      border: `1px solid ${(STATUS_COLORS[order.status] || '#94a3b8')}44`
                    }}>{order.status.toUpperCase()}</span>
                    {total > 0 && <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--accent-green)' }}>₹{total}</span>}
                    {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ padding: '0 24px 20px', borderTop: '1px solid var(--glass-border)' }}>
                    <h4 style={{ margin: '16px 0 12px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Items Ordered</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {items.map((item: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                            {item.emoji || '💊'} {item.name}
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>×{item.qty}</span>
                          </span>
                          <span style={{ fontWeight: 700 }}>₹{(item.qty * item.price).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                    {order.notes && (
                      <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        📝 Notes: {order.notes}
                      </p>
                    )}
                    {paymentFields.short_url && order.status === 'accepted' && (
                      <a href={paymentFields.short_url} target="_blank" rel="noopener noreferrer"
                        className="btn btn-success" style={{ marginTop: '16px', display: 'inline-flex', gap: '8px', textDecoration: 'none' }}>
                        <ExternalLink size={16} /> Pay Now
                      </a>
                    )}
                    <button className="btn" onClick={() => navigate(`/track/${order.order_ref}`)}
                      style={{ marginTop: '16px', marginLeft: '8px', background: 'rgba(255,255,255,0.07)', fontSize: '0.85rem', gap: '6px' }}>
                      Track Order
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
