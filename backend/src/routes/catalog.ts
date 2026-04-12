import { Hono } from 'hono';
import { Env } from '../env';
import { adminAuth } from '../middleware/auth';

export const catalogRouter = new Hono<{ Bindings: Env }>();

// ─── Public Routes ───────────────────────────────────────────────

// Get all active products
catalogRouter.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM products WHERE active_flag = 1 ORDER BY name ASC'
  ).all();
  return c.json(results);
});

// Get single product detail + related
catalogRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const product = await c.env.DB.prepare(
    'SELECT * FROM products WHERE id = ?'
  ).bind(id).first();
  
  if (!product) return c.json({ error: 'Product not found' }, 404);
  
  const { results: related } = await c.env.DB.prepare(
    'SELECT * FROM products WHERE category = ? AND id != ? AND active_flag = 1 LIMIT 4'
  ).bind(product.category, id).all();
  
  return c.json({ product, related });
});

// ─── Admin Routes (Protected) ────────────────────────────────────

// Applied to all routes below
catalogRouter.use('/*', adminAuth);

// Create new product
catalogRouter.post('/', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO products (
      id, name, sku, category, price, cost_price, stock_qty, 
      min_qty, max_daily_qty, supplier_info, active_flag, emoji, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.name, body.sku, body.category, body.price, body.cost_price, 
    body.stock_qty || 0, body.min_qty || 0, body.max_daily_qty || null,
    JSON.stringify(body.supplier_info || {}), body.active_flag ?? 1,
    body.emoji || null, body.description || null
  ).run();

  return c.json({ success: true, id }, 201);
});

// Update product
catalogRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  await c.env.DB.prepare(`
    UPDATE products SET 
      name = ?, sku = ?, category = ?, price = ?, cost_price = ?, 
      stock_qty = ?, min_qty = ?, max_daily_qty = ?, supplier_info = ?, 
      active_flag = ?, emoji = ?, description = ?
    WHERE id = ?
  `).bind(
    body.name, body.sku, body.category, body.price, body.cost_price, 
    body.stock_qty, body.min_qty, body.max_daily_qty,
    JSON.stringify(body.supplier_info), body.active_flag,
    body.emoji, body.description, id
  ).run();

  return c.json({ success: true });
});

// Delete product (Soft delete by default for order history integrity)
catalogRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  
  // Actually we should just set active_flag = 0
  await c.env.DB.prepare(
    'UPDATE products SET active_flag = 0 WHERE id = ?'
  ).bind(id).run();

  return c.json({ success: true, message: 'Product de-activated' });
});
