import { Hono } from 'hono';
import { Env } from '../env';
import { adminAuth } from '../middleware/auth';
import { createPaymentLink } from '../services/razorpay';
import { sendEmail, templates } from '../services/email';

export const adminRouter = new Hono<{ Bindings: Env }>();

// Open route for login
adminRouter.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (email === c.env.ADMIN_EMAIL && password === c.env.ADMIN_PASSWORD) {
    const token = crypto.randomUUID();
    await c.env.STORE_KV.put(`SESSION:${token}`, JSON.stringify({ email }), { expirationTtl: 86400 });
    return c.json({ token });
  }
  return c.json({ error: 'Invalid credentials' }, 401);
});

// Protect all routes below
adminRouter.use('/*', adminAuth);

// Accept Order & Create Payment Link
adminRouter.post('/orders/:ref/accept', async (c) => {
  const ref = c.req.param('ref');
  
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE order_ref = ?').bind(ref).first() as any;
  if (!order || order.status !== 'verified') return c.json({ error: 'Order not verified or not found' }, 400);

  // In real app, calculate actual amount from order_items
  const amountPaise = 50000; // 500 INR mockup
  
  const customer = JSON.parse(order.customer_info);
  const link = await createPaymentLink(c.env, ref, amountPaise, customer);
  
  await c.env.DB.prepare(
    "UPDATE orders SET status = 'accepted', payment_fields = ? WHERE order_ref = ?"
  ).bind(JSON.stringify({ payment_link: link }), ref).run();
  
  await sendEmail(c.env, {
    to: customer.email,
    subject: 'Your E-Pharm Order is Accepted',
    html: templates.paymentLink(link, amountPaise, order.delivery_type)
  });
  
  return c.json({ success: true, link });
});

// Ship Or Marks Ready Order
adminRouter.post('/orders/:ref/ship', async (c) => {
  const ref = c.req.param('ref');
  const { tracking_url } = await c.req.json();
  
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE order_ref = ?').bind(ref).first() as any;
  if (!order || order.status !== 'paid') return c.json({ error: 'Order not paid or not found' }, 400);

  await c.env.DB.prepare(
    "UPDATE orders SET status = 'shipped', shipping_fields = ? WHERE order_ref = ?"
  ).bind(JSON.stringify({ tracking_url }), ref).run();
  
  const customer = JSON.parse(order.customer_info);
  await sendEmail(c.env, {
    to: customer.email,
    subject: 'Your E-Pharm Order update',
    html: templates.shipping({ tracking_url }, order.delivery_type)
  });
  
  return c.json({ success: true });
});
