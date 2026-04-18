import { Hono } from 'hono';
import { Env, Variables } from '../env';
import { adminAuth } from '../middleware/auth';
import { sendEmail, templates } from '../services/email';
import { createPaymentLink } from '../services/razorpay';

export const adminRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── ADMIN LOGIN FLOW (3-STEP) ──────────────────────────────────

// Step 1: Credentials Check
adminRouter.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (email !== c.env.ADMIN_EMAIL || password !== c.env.ADMIN_PASSWORD) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await c.env.STORE_KV.put(`ADMIN_OTP:${email}`, otp, { expirationTtl: 600 });
    
    // Email OTP to admin
    await sendEmail(c.env, {
      to: c.env.ADMIN_EMAIL,
      subject: 'Admin Login OTP',
      html: templates.otp(otp, '', true)
    });

    return c.json({ success: true, message: 'OTP sent to your email' });
  } catch (err: any) {
    console.error('[Admin Login Error]', err);
    return c.json({ 
      error: err.message.includes('Email delivery failed') 
        ? 'Failed to send OTP email. Please verify your RESEND_API_KEY.' 
        : 'An error occurred during login.' 
    }, 500);
  }
});

// Step 2: OTP Verification -> Session
adminRouter.post('/login-verify', async (c) => {
  const { email, otp } = await c.req.json();
  
  const storedOtp = await c.env.STORE_KV.get(`ADMIN_OTP:${email}`);
  if (!storedOtp || storedOtp !== otp) {
    return c.json({ error: 'Invalid or expired OTP' }, 401);
  }

  // Success -> Create Session
  const token = crypto.randomUUID();
  await c.env.STORE_KV.put(`SESSION:${token}`, JSON.stringify({ email, created_at: new Date().toISOString() }), { expirationTtl: 86400 });
  await c.env.STORE_KV.delete(`ADMIN_OTP:${email}`);

  return c.json({ token, success: true });
});

// ─── PROTECTED ADMIN ROUTES ──────────────────────────────────────

adminRouter.use('/*', adminAuth);

// List all orders
adminRouter.get('/orders', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM orders ORDER BY created_at DESC'
  ).all();
  return c.json(results);
});

// Get order details with items
adminRouter.get('/orders/:ref', async (c) => {
  const ref = c.req.param('ref');
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE order_ref = ?').bind(ref).first() as any;
  if (!order) return c.json({ error: 'Not found' }, 404);

  const { results: items } = await c.env.DB.prepare(`
    SELECT oi.*, p.name, p.sku, p.emoji
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_ref = ?
  `).bind(ref).all();

  return c.json({ ...order, items });
});

// Accept Order -> Decrement Stock -> Create Payment Link -> Notify
adminRouter.post('/orders/:ref/accept', async (c) => {
  const ref = c.req.param('ref');
  
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE order_ref = ?').bind(ref).first() as any;
  if (!order || order.status !== 'verified') return c.json({ error: 'Order must be verified by customer first' }, 400);

  const { results: items } = await c.env.DB.prepare(`
    SELECT oi.product_id, oi.quantity, p.price, p.name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_ref = ?
  `).bind(ref).all() as any;

  // 1. Calculate Total and Check Stock again
  let totalPaise = 0;
  for (const item of items) {
    totalPaise += item.quantity * item.price * 100;
  }

  // 2. Decrement Stock
  for (const item of items) {
    await c.env.DB.prepare(
      'UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?'
    ).bind(item.quantity, item.product_id).run();
  }

  // 3. Create Razorpay Link
  const customer = JSON.parse(order.customer_info);
  const payLink = await createPaymentLink(c.env, ref, totalPaise, customer, `Payment for E-Pharm Order ${ref}`);

  // 4. Update Order
  await c.env.DB.prepare(
    "UPDATE orders SET status = 'accepted', payment_fields = ? WHERE order_ref = ?"
  ).bind(JSON.stringify({ 
    payment_link_id: payLink.id, 
    short_url: payLink.short_url,
    amount_paise: totalPaise
  }), ref).run();

  // 5. Send Email
  await sendEmail(c.env, {
    to: customer.email,
    subject: `Your E-Pharm Order ${ref} is Accepted`,
    html: templates.paymentLink(payLink.short_url, totalPaise, order.delivery_type, order.notes)
  });

  return c.json({ success: true, link: payLink.short_url });
});

// Reject Order
adminRouter.post('/orders/:ref/reject', async (c) => {
  const ref = c.req.param('ref');
  const { reason } = await c.req.json();

  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE order_ref = ?').bind(ref).first() as any;
  if (!order) return c.json({ error: 'Order not found' }, 404);

  await c.env.DB.prepare(
    "UPDATE orders SET status = 'cancelled', rejected_reason = ? WHERE order_ref = ?"
  ).bind(reason, ref).run();

  const customer = JSON.parse(order.customer_info);
  await sendEmail(c.env, {
    to: customer.email,
    subject: `Update regarding your E-Pharm Order ${ref}`,
    html: templates.rejection(reason)
  });

  return c.json({ success: true });
});

// Ship Or Mark Ready
adminRouter.post('/orders/:ref/ship', async (c) => {
  const ref = c.req.param('ref');
  const { tracking_url } = await c.req.json();

  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE order_ref = ?').bind(ref).first() as any;
  if (!order || order.status !== 'paid') return c.json({ error: 'Order not paid' }, 400);

  await c.env.DB.prepare(
    "UPDATE orders SET status = 'shipped', shipping_fields = ? WHERE order_ref = ?"
  ).bind(JSON.stringify({ tracking_url }), ref).run();

  const customer = JSON.parse(order.customer_info);
  await sendEmail(c.env, {
    to: customer.email,
    subject: `Your E-Pharm Order ${ref} is ${order.delivery_type === 'delivery' ? 'Shipped' : 'Ready'}`,
    html: templates.shipping(order.delivery_type, tracking_url, order.notes)
  });

  return c.json({ success: true });
});

// Deliver Order
adminRouter.post('/orders/:ref/delivered', async (c) => {
  const ref = c.req.param('ref');
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE order_ref = ?').bind(ref).first() as any;
  if (!order) return c.json({ error: 'Order not found' }, 404);

  await c.env.DB.prepare(
    "UPDATE orders SET status = 'delivered' WHERE order_ref = ?"
  ).bind(ref).run();

  const customer = JSON.parse(order.customer_info);
  await sendEmail(c.env, {
    to: customer.email,
    subject: `Order ${ref} Delivered`,
    html: templates.delivered(ref)
  });

  return c.json({ success: true });
});
