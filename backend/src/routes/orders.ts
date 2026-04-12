import { Hono } from 'hono';
import { Env } from '../env';
import { sendEmail, templates } from '../services/email';

export const ordersRouter = new Hono<{ Bindings: Env }>();

ordersRouter.post('/place', async (c) => {
  const body = await c.req.json();
  // Assume body contains items, customer_info (name, email, phone), delivery_type
  
  const orderRef = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
  
  // Create order in DB as pending
  await c.env.DB.prepare(
    'INSERT INTO orders (order_ref, customer_info, status, delivery_type) VALUES (?, ?, ?, ?)'
  ).bind(
    orderRef,
    JSON.stringify(body.customer_info),
    'pending',
    body.delivery_type
  ).run();
  
  // (Simplified) Insert order items here in a batch
  
  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await c.env.STORE_KV.put(`OTP:${orderRef}`, otp, { expirationTtl: 600 }); // 10 mins
  
  // Send email
  await sendEmail(c.env, {
    to: body.customer_info.email,
    subject: 'E-Pharm Order Verification',
    html: templates.otp(otp, body.delivery_type)
  });
  
  return c.json({ success: true, orderRef });
});

ordersRouter.post('/verify-otp', async (c) => {
  const { orderRef, otp } = await c.req.json();
  
  // Check attempts
  const attemptsKey = `ATTEMPTS:${orderRef}`;
  let attempts = parseInt(await c.env.STORE_KV.get(attemptsKey) || '0');
  
  if (attempts >= 5) {
    return c.json({ error: 'Max verify attempts reached' }, 429);
  }
  
  const storedOtp = await c.env.STORE_KV.get(`OTP:${orderRef}`);
  if (!storedOtp) {
    return c.json({ error: 'OTP expired or invalid' }, 400);
  }
  
  if (storedOtp !== otp) {
    await c.env.STORE_KV.put(attemptsKey, (attempts + 1).toString(), { expirationTtl: 600 });
    return c.json({ success: false, error: 'Incorrect OTP' });
  }
  
  // Success -> update DB
  await c.env.DB.prepare(
    "UPDATE orders SET status = 'verified' WHERE order_ref = ?"
  ).bind(orderRef).run();
  
  await c.env.STORE_KV.delete(`OTP:${orderRef}`); // invalidate
  
  return c.json({ success: true });
});

ordersRouter.post('/resend-otp', async (c) => {
  const { orderRef } = await c.req.json();
  
  const resendKey = `RESEND:${orderRef}`;
  if (await c.env.STORE_KV.get(resendKey)) {
    return c.json({ error: 'Please wait 60 seconds before resending' }, 429);
  }
  
  // Fetch order to get email
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE order_ref = ?').bind(orderRef).first();
  if (!order) return c.json({ error: 'Order not found' }, 404);
  
  const customer = JSON.parse(order.customer_info as string);
  
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await c.env.STORE_KV.put(`OTP:${orderRef}`, otp, { expirationTtl: 600 });
  await c.env.STORE_KV.put(resendKey, '1', { expirationTtl: 60 });
  
  await sendEmail(c.env, {
    to: customer.email,
    subject: 'E-Pharm Order Verification (Resend)',
    html: templates.otp(otp, order.delivery_type as string)
  });
  
  return c.json({ success: true });
});
