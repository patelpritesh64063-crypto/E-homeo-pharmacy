import { Hono } from 'hono';
import { Env } from '../env';
import { sendEmail, templates } from '../services/email';
import { runFraudCheck, FraudCheckInput } from '../services/ai';

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
  
  // Insert order items
  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      const itemId = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO order_items (id, order_ref, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?, ?)'
      ).bind(itemId, orderRef, item.product_id, item.quantity, item.price).run();
    }
  }
  
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
  
  // ─── AI FRAUD CHECK (non-blocking, fire-and-forget style) ─────
  // We run it inline but catch all errors so verification is never blocked.
  try {
    await performFraudCheck(c.env, orderRef);
  } catch (err) {
    console.error('[FraudCheck] Error (order auto-approved):', err);
    // Save fallback decision
    await c.env.DB.prepare(
      'UPDATE orders SET ai_decision_fields = ? WHERE order_ref = ?'
    ).bind(JSON.stringify({
      decision: 'approved',
      reasoning: 'AI check failed — auto-approved',
      flags: [],
      checked_at: new Date().toISOString(),
    }), orderRef).run();
  }
  
  return c.json({ success: true });
});

// ─── Fraud Check Helper ──────────────────────────────────────────

async function performFraudCheck(env: Env, orderRef: string) {
  // 1. Get order + customer info
  const order = await env.DB.prepare(
    'SELECT * FROM orders WHERE order_ref = ?'
  ).bind(orderRef).first() as any;
  if (!order) return;

  const customer = JSON.parse(order.customer_info);

  // 2. Get order items with product details
  const { results: orderItems } = await env.DB.prepare(
    `SELECT oi.*, p.name as product_name, p.max_daily_qty, p.stock_qty
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_ref = ?`
  ).bind(orderRef).all() as any;

  const items = (orderItems || []).map((i: any) => ({
    product_name: i.product_name,
    quantity: i.quantity,
    price: i.price_at_time,
    max_daily_qty: i.max_daily_qty,
  }));

  const total = items.reduce((sum: number, i: any) => sum + (i.quantity * i.price), 0);

  // 3. Get recent orders from same email (last 24hrs)
  const { results: recentOrders } = await env.DB.prepare(
    `SELECT o.order_ref, o.created_at, COUNT(oi.id) as item_count
     FROM orders o
     LEFT JOIN order_items oi ON o.order_ref = oi.order_ref
     WHERE json_extract(o.customer_info, '$.email') = ?
       AND o.order_ref != ?
       AND o.created_at >= datetime('now', '-24 hours')
     GROUP BY o.order_ref`
  ).bind(customer.email, orderRef).all() as any;

  // 4. Get stock levels for ordered products
  const stockLevels = (orderItems || []).map((i: any) => ({
    product_name: i.product_name,
    stock_qty: i.stock_qty,
    ordered_qty: i.quantity,
  }));

  // 5. Build input and run AI
  const fraudInput: FraudCheckInput = {
    order: {
      order_ref: orderRef,
      items,
      total,
      delivery_type: order.delivery_type,
      notes: order.notes || '',
      customer_email: customer.email,
    },
    recentOrders: (recentOrders || []).map((o: any) => ({
      order_ref: o.order_ref,
      created_at: o.created_at,
      item_count: o.item_count || 0,
      total: 0, // simplified
    })),
    stockLevels,
  };

  const result = await runFraudCheck(env, fraudInput);

  // 6. Save AI decision to order
  await env.DB.prepare(
    'UPDATE orders SET ai_decision_fields = ? WHERE order_ref = ?'
  ).bind(JSON.stringify({
    ...result,
    checked_at: new Date().toISOString(),
  }), orderRef).run();
}

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

