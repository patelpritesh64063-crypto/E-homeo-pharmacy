import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Truck, LogOut, Search, Package, Plus, Edit2 } from 'lucide-react';

interface Order {
  order_ref: string;
  status: string;
  created_at: string;
  customer_info: string;
  delivery_type: string;
  notes: string | null;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
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

  useEffect(() => {
    if (activeTab === 'inventory' && products.length === 0) {
      fetchProducts();
    }
  }, [activeTab]);

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

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${BASE_URL}/api/public/catalog`);
      if (res.ok) setProducts(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleUpdateStock = async (id: string, currentStock: number) => {
    const newStockStr = prompt("Enter new stock qty:", currentStock.toString());
    if (!newStockStr) return;
    const newStock = parseInt(newStockStr);
    if (isNaN(newStock)) return;

    try {
      const product = products.find(p => p.id === id);
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${BASE_URL}/api/public/catalog/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...product, stock_qty: newStock })
      });
      if (res.ok) {
        alert('Stock updated!');
        fetchProducts();
      } else {
        alert('Failed to update stock. Are you admin?');
      }
    } catch (e) { console.error(e); }
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

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

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

      <div className="flex gap-4 mb-6">
        <button className={`btn ${activeTab === 'orders' ? 'btn-primary' : ''}`} onClick={() => { setActiveTab('orders'); setSearch(''); }}>
          Orders
        </button>
        <button className={`btn ${activeTab === 'inventory' ? 'btn-primary' : ''}`} onClick={() => { setActiveTab('inventory'); setSearch(''); }}>
          Inventory
        </button>
      </div>
      
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 style={{ fontSize: '1.25rem' }}>{activeTab === 'orders' ? 'Recent Orders' : 'Product Inventory'}</h2>
          <div className="input-wrapper" style={{ width: '300px' }}>
            <Search className="input-icon" size={18} />
            <input
              type="text"
              className="input-glass"
              placeholder={activeTab === 'orders' ? "Search by ID or Name..." : "Search by product name/sku..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {activeTab === 'orders' && (
          loading ? (
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
          )
        )}

        {activeTab === 'inventory' && (
          loadingProducts ? (
            <p className="text-center">Loading products...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '12px' }}>SKU</th>
                    <th style={{ padding: '12px' }}>Product Name</th>
                    <th style={{ padding: '12px' }}>Price</th>
                    <th style={{ padding: '12px' }}>Stock</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>No products found</td></tr>
                  ) : filteredProducts.map(product => (
                    <tr key={product.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{product.sku}</td>
                      <td style={{ padding: '12px' }}>{product.emoji} {product.name}</td>
                      <td style={{ padding: '12px' }}>₹{product.price}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ color: product.stock_qty < 10 ? '#ef4444' : 'inherit', fontWeight: product.stock_qty < 10 ? 'bold' : 'normal' }}>
                          {product.stock_qty}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button className="btn btn-sm" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} onClick={() => handleUpdateStock(product.id, product.stock_qty)}>
                          <Edit2 size={14} style={{ marginRight: '4px', display: 'inline' }} /> Manage Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
