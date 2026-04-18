import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Truck, LogOut, Search, Edit2, Plus, X, Package, AlertTriangle } from 'lucide-react';

interface Order {
  order_ref: string;
  status: string;
  created_at: string;
  customer_info: string;
  delivery_type: string;
  notes: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock_qty: number;
  emoji: string;
  image_url?: string;
  active_flag: number;
}

const EMPTY_PRODUCT = {
  name: '', sku: '', category: 'Dilution', price: '',
  cost_price: '', stock_qty: '', emoji: '', image_url: '', description: ''
};

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newItem, setNewItem] = useState({ ...EMPTY_PRODUCT });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    fetchOrders();
  }, []);

  useEffect(() => {
    if (activeTab === 'inventory' && products.length === 0) fetchProducts();
  }, [activeTab]);

  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/orders`, { headers: authHeaders });
      if (res.ok) setOrders(await res.json());
      else if (res.status === 401) { localStorage.removeItem('admin_token'); navigate('/admin/login'); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${BASE_URL}/api/public/catalog`);
      if (res.ok) setProducts(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingProducts(false); }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: newItem.name.trim(),
        sku: newItem.sku.trim().toUpperCase(),
        category: newItem.category.trim(),
        price: parseFloat(newItem.price),
        cost_price: parseFloat(newItem.cost_price) || 0,
        stock_qty: parseInt(newItem.stock_qty),
        emoji: newItem.emoji.trim() || '💊',
        image_url: newItem.image_url.trim() || null,
        description: newItem.description.trim() || null,
        active_flag: 1
      };
      const res = await fetch(`${BASE_URL}/api/public/catalog`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewItem({ ...EMPTY_PRODUCT });
        await fetchProducts();
      } else {
        const err = await res.json();
        alert('Failed: ' + (err.error || 'Unknown error'));
      }
    } catch (e: any) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/public/catalog/${editingProduct.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          ...editingProduct,
          supplier_info: {}
        })
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditingProduct(null);
        await fetchProducts();
      } else {
        alert('Failed to update product');
      }
    } catch (e: any) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleAccept = async (ref: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/orders/${ref}/accept`, {
        method: 'POST', headers: authHeaders
      });
      const data = await res.json();
      if (res.ok) { alert('Order Accepted! Payment link sent.'); fetchOrders(); }
      else alert(data.error || 'Failed to accept');
    } catch (e) { console.error(e); }
  };

  const handleShip = async (ref: string) => {
    const trackingUrl = prompt('Enter Tracking URL (or leave blank):') || '';
    try {
      const res = await fetch(`${BASE_URL}/api/admin/orders/${ref}/ship`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ tracking_url: trackingUrl })
      });
      const data = await res.json();
      if (res.ok) { alert('Order marked as Shipped!'); fetchOrders(); }
      else alert(data.error || 'Failed to ship');
    } catch (e) { console.error(e); }
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: '#94a3b8', verified: '#a78bfa', accepted: '#34d399',
      paid: '#60a5fa', shipped: '#fbbf24', delivered: '#34d399', cancelled: '#f87171'
    };
    return map[status] || '#94a3b8';
  };

  const filteredOrders = orders.filter(o => {
    const c = JSON.parse(o.customer_info);
    return o.order_ref.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const Modal = ({ title, onClose, onSubmit, children }: any) => (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '16px', backdropFilter: 'blur(4px)'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '32px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={22} />
        </button>
        <h2 style={{ marginBottom: '24px', fontSize: '1.25rem' }}>{title}</h2>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {children}
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '8px' }}>
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </form>
      </div>
    </div>
  );

  const ProductForm = ({ values, onChange }: { values: any; onChange: (v: any) => void }) => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '12px' }}>
        <input required className="input-glass" placeholder="Product Name *" value={values.name} onChange={e => onChange({ ...values, name: e.target.value })} />
        <input className="input-glass" placeholder="Emoji" value={values.emoji} onChange={e => onChange({ ...values, emoji: e.target.value })} style={{ textAlign: 'center', fontSize: '1.4rem' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <input required className="input-glass" placeholder="SKU *" value={values.sku} onChange={e => onChange({ ...values, sku: e.target.value })} />
        <input required className="input-glass" placeholder="Category *" value={values.category} onChange={e => onChange({ ...values, category: e.target.value })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <input required type="number" min="0" step="0.01" className="input-glass" placeholder="Price ₹ *" value={values.price} onChange={e => onChange({ ...values, price: e.target.value })} />
        <input type="number" min="0" step="0.01" className="input-glass" placeholder="Cost ₹" value={values.cost_price} onChange={e => onChange({ ...values, cost_price: e.target.value })} />
        <input required type="number" min="0" className="input-glass" placeholder="Stock *" value={values.stock_qty} onChange={e => onChange({ ...values, stock_qty: e.target.value })} />
      </div>
      <input className="input-glass" placeholder="Image URL (paste link from web)" value={values.image_url} onChange={e => onChange({ ...values, image_url: e.target.value })} />
      {values.image_url && (
        <div style={{ borderRadius: '12px', overflow: 'hidden', height: '140px', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={values.image_url} alt="Preview" style={{ maxHeight: '140px', maxWidth: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <textarea className="input-glass" placeholder="Description (optional)" rows={2} value={values.description} onChange={e => onChange({ ...values, description: e.target.value })} style={{ resize: 'vertical' }} />
    </>
  );

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={28} className="text-purple" /> Admin Dashboard
          </h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>Manage orders, inventory & store operations</p>
        </div>
        <button className="btn" onClick={() => { localStorage.removeItem('admin_token'); navigate('/admin/login'); }} style={{ gap: '8px' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {(['orders', 'inventory'] as const).map(tab => (
          <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab(tab); setSearch(''); }}
            style={{ textTransform: 'capitalize' }}>
            {tab === 'orders' ? `📋 Orders (${orders.length})` : `📦 Inventory (${products.length})`}
          </button>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        {/* Panel header */}
        <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {activeTab === 'orders' ? 'Recent Orders' : 'Product Inventory'}
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {activeTab === 'inventory' && (
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px' }}>
                <Plus size={16} /> Add Product
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="input-glass" placeholder="Search..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '38px', width: '220px' }} />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {activeTab === 'orders' && (
          loading ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Loading orders...</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                    {['Order ID', 'Date', 'Customer', 'Type', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No orders found</td></tr>
                  ) : filteredOrders.map(order => {
                    const customer = JSON.parse(order.customer_info);
                    return (
                      <tr key={order.order_ref} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--accent-purple)' }}>{order.order_ref}</td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{new Date(order.created_at).toLocaleDateString('en-IN')}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 500 }}>{customer.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{customer.email}</div>
                        </td>
                        <td style={{ padding: '14px 16px', textTransform: 'capitalize', fontSize: '0.9rem' }}>{order.delivery_type}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                            color: getStatusColor(order.status),
                            background: getStatusColor(order.status) + '22',
                            border: `1px solid ${getStatusColor(order.status)}44`
                          }}>{order.status.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          {order.status === 'verified' && (
                            <button className="btn btn-primary" onClick={() => handleAccept(order.order_ref)}
                              style={{ padding: '8px 16px', fontSize: '0.85rem', gap: '6px' }}>
                              <CheckCircle size={14} /> Accept
                            </button>
                          )}
                          {order.status === 'paid' && (
                            <button className="btn btn-success" onClick={() => handleShip(order.order_ref)}
                              style={{ padding: '8px 16px', fontSize: '0.85rem', gap: '6px' }}>
                              <Truck size={14} /> {order.delivery_type === 'delivery' ? 'Ship' : 'Ready'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Inventory Table */}
        {activeTab === 'inventory' && (
          loadingProducts ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Loading products...</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                    {['IMG', 'SKU', 'Product Name', 'Price', 'Stock', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No products found</td></tr>
                  ) : filteredProducts.map(product => (
                    <tr key={product.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 16px' }}>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name}
                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--glass-border)' }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(124,111,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                            {product.emoji || '💊'}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-purple)' }}>{product.sku}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 500 }}>{product.name}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 700 }}>₹{product.price}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: product.stock_qty < 10 ? '#f87171' : 'inherit', fontWeight: product.stock_qty < 10 ? 700 : 400 }}>
                          {product.stock_qty < 10 && <AlertTriangle size={14} />}
                          {product.stock_qty}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <button className="btn" onClick={() => { setEditingProduct({ ...product }); setShowEditModal(true); }}
                          style={{ background: 'rgba(255,255,255,0.08)', padding: '8px 14px', fontSize: '0.85rem', gap: '6px' }}>
                          <Edit2 size={13} /> Edit
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

      {/* Add Product Modal */}
      {showAddModal && (
        <Modal title="➕ Add New Product" onClose={() => { setShowAddModal(false); setNewItem({ ...EMPTY_PRODUCT }); }} onSubmit={handleAddProduct}>
          <ProductForm values={newItem} onChange={setNewItem} />
        </Modal>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <Modal title="✏️ Edit Product" onClose={() => { setShowEditModal(false); setEditingProduct(null); }} onSubmit={handleEditProduct}>
          <ProductForm values={{
            name: editingProduct.name, sku: editingProduct.sku, category: editingProduct.category,
            price: String(editingProduct.price), cost_price: '', stock_qty: String(editingProduct.stock_qty),
            emoji: editingProduct.emoji || '', image_url: editingProduct.image_url || '', description: ''
          }} onChange={(v: any) => setEditingProduct({
            ...editingProduct,
            name: v.name, sku: v.sku, category: v.category,
            price: parseFloat(v.price) || 0, stock_qty: parseInt(v.stock_qty) || 0,
            emoji: v.emoji, image_url: v.image_url
          })} />
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;
