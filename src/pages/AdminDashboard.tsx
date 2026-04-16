import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Truck, LogOut, Search } from 'lucide-react';

interface Order {
  order_ref: string;
  status: string;
  created_at: string;
  customer_info: string;
  delivery_type: string;
  notes: string | null;
}

const AdminDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${BASE_URL}/api/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        if (res.status === 401) {
          localStorage.removeItem('admin_token');
          navigate('/admin/login');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (ref: string) => {
    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${BASE_URL}/api/admin/orders/${ref}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Order Accepted & Payment Link Generated!');
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to accept');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleShip = async (ref: string) => {
    const trackingUrl = prompt("Enter Tracking URL:");
    if (!trackingUrl) return;

    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${BASE_URL}/api/admin/orders/${ref}/ship`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tracking_url: trackingUrl })
      });
      if (res.ok) {
        alert('Order Shipped!');
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to ship');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'var(--text-muted)';
      case 'verified': return 'var(--accent-purple)';
      case 'accepted': return 'var(--accent-green)';
      case 'paid': return '#3b82f6';
      case 'shipped': return '#f59e0b';
      case 'delivered': return 'var(--accent-green)';
      case 'cancelled': return '#ef4444';
      default: return 'var(--text-muted)';
    }
  };

  const filteredOrders = orders.filter(o =>
    o.order_ref.toLowerCase().includes(search.toLowerCase()) ||
    JSON.parse(o.customer_info).name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1200px' }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="text-muted">Manage orders, stock, and store operations</p>
        </div>
        <button className="btn" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 style={{ fontSize: '1.25rem' }}>Recent Orders</h2>
          <div className="input-wrapper" style={{ width: '300px' }}>
            <Search className="input-icon" size={18} />
            <input
              type="text"
              className="input-glass"
              placeholder="Search by ID or Name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-center">Loading orders...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '12px' }}>Order ID</th>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px' }}>Customer</th>
                  <th style={{ padding: '12px' }}>Type</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center' }}>No orders found</td></tr>
                ) : filteredOrders.map(order => {
                  const customer = JSON.parse(order.customer_info);
                  return (
                    <tr key={order.order_ref} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{order.order_ref}</td>
                      <td style={{ padding: '12px' }}>{new Date(order.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        <div>{customer.name}</div>
                        <div className="text-sm text-muted">{customer.email}</div>
                      </td>
                      <td style={{ padding: '12px', textTransform: 'capitalize' }}>{order.delivery_type}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          color: getStatusColor(order.status),
                          border: `1px solid ${getStatusColor(order.status)}`
                        }}>
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {order.status === 'verified' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleAccept(order.order_ref)}>
                            <CheckCircle size={14} style={{ marginRight: '4px', display: 'inline' }} /> Accept
                          </button>
                        )}
                        {order.status === 'paid' && (
                          <button className="btn btn-success btn-sm" onClick={() => handleShip(order.order_ref)}>
                            <Truck size={14} style={{ marginRight: '4px', display: 'inline' }} /> {order.delivery_type === 'delivery' ? 'Ship' : 'Ready'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
