import { Hono } from 'hono';
import { Env, Variables } from '../env';
import { sendEmail, templates } from '../services/email';
import { runFraudCheck, FraudCheckInput } from '../services/ai';

export const ordersRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * 1. PLACE ORDER
 * Validates stock and daily limits before creating a pending order.
 */
ordersRouter.post('/place', async (c) => {
  try {
    const body = await c.req.json();
    const { items, customer_info, delivery_type, notes } = body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Order must contain items' }, 400);
    }

    // A. Validate Stock & Max Daily Qty
    for (const item of items) {
      const product = await c.env.DB.prepare(
        'SELECT id, name, stock_qty, max_daily_qty FROM products WHERE id = ?'
      ).bind(item.product_id).first() as any;

      if (!product) return c.json({ error: `Product ${item.product_id} not found` }, 404);
      
      // Check stock
      if (product.stock_qty < item.quantity) {
        return c.json({ error: `Insufficient stock for ${product.name}. Available: ${product.stock_qty}` }, 400);
      }

      // Check daily limit for this user
      if (product.max_daily_qty) {
        const today = new Date().toISOString().split('T')[0];
        const prevQty = await c.env.DB.prepare(`
          SELECT SUM(oi.quantity) as total
          FROM order_items oi
          JOIN orders o ON oi.order_ref = o.order_ref
          WHERE oi.product_id = ? 
            AND json_extract(o.customer_info, '$.email') = ?
            AND DATE(o.created_at) = ?
            AND o.status != 'cancelled'
        `).bind(item.product_id, customer_info.email, today).first('total') as number || 0;

        if (prevQty + item.quantity > product.max_daily_qty) {
          return c.json({ 
            error: `Daily limit exceeded for ${product.name}. Max allowed: ${product.max_daily_qty} per day.` 
          }, 400);
        }
      }
    }

    const orderRef = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    
    // B. Create Order record
    await c.env.DB.prepare(
      'INSERT INTO orders (order_ref, customer_info, status, delivery_type, notes) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      orderRef,
      JSON.stringify(customer_info),
      'pending',
      delivery_type,
      notes || null
    ).run();
    
    // C. Insert Order Items
    for (const item of items) {
      const itemId = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO order_items (id, order_ref, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?, ?)'
      ).bind(itemId, orderRef, item.product_id, item.quantity, item.price).run();
    }
    
    // D. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await c.env.STORE_KV.put(`OTP:${orderRef}`, otp, { expirationTtl: 600 }); // 10 mins
    
    // E. Send Verification Email
    await sendEmail(c.env, {
      to: customer_info.email,
      subject: `Verify Your E-Pharm Order ${orderRef}`,
      html: templates.otp(otp, delivery_type)
    });
    
    return c.json({ success: true, orderRef });
  } catch (err: any) {
    console.error('[Order Place Error]', err);
    return c.json({ 
      success: false, 
      error: err.message.includes('Email delivery failed') 
        ? 'Failed to send verification email. Please check ADMIN settings.' 
        : 'Failed to place order. Please try again later.' 
    }, 500);
  }
});

/**
 * 2. VERIFY OTP
 * Updates status to 'verified' and triggers AI fraud check.
 */
ordersRouter.post('/verify-otp', async (c) => {
  const { orderRef, otp } = await c.req.json();
  
  // Check attempts
  const attemptsKey = `ATTEMPTS:${orderRef}`;
  const attempts = parseInt(await c.env.STORE_KV.get(attemptsKey) || '0');
  
  if (attempts >= 5) {
    return c.json({ error: 'Too many incorrect attempts. Order locked.' }, 429);
  }
  
  const storedOtp = await c.env.STORE_KV.get(`OTP:${orderRef}`);
  if (!storedOtp) {
    return c.json({ error: 'OTP expired or not found. Please resend.' }, 400);
  }
  
  if (storedOtp !== otp) {
    await c.env.STORE_KV.put(attemptsKey, (attempts + 1).toString(), { expirationTtl: 600 });
    return c.json({ error: 'Invalid OTP code' }, 400);
  }
  
  // Success
  await c.env.DB.prepare(
    "UPDATE orders SET status = 'verified' WHERE order_ref = ?"
  ).bind(orderRef).run();
  
  // Cleanup
  await c.env.STORE_KV.delete(`OTP:${orderRef}`);
  await c.env.STORE_KV.delete(attemptsKey);
  
  // Trigger AI Fraud Check (Background)
  c.executionCtx.waitUntil(performFraudCheck(c.env, orderRef));
  
  return c.json({ success: true });
});

/**
 * 3. RESEND OTP
 * Limit: Max 3 resends, 60s cooldown.
 */
ordersRouter.post('/resend-otp', async (c) => {
  const { orderRef } = await c.req.json();
  
  // A. Check Cooldown
  const cooldownKey = `COOLDOWN:${orderRef}`;
  if (await c.env.STORE_KV.get(cooldownKey)) {
    return c.json({ error: 'Please wait 60 seconds before resending' }, 429);
  }

  // B. Check Resend Count
  const countKey = `RESENDS:${orderRef}`;
  const resendCount = parseInt(await c.env.STORE_KV.get(countKey) || '0');
  if (resendCount >= 3) {
    return c.json({ error: 'Maximum resend limit reached' }, 429);
  }
  
  // C. Fetch Order info
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE order_ref = ?').bind(orderRef).first() as any;
  if (!order) return c.json({ error: 'Order not found' }, 404);
  
  const customer = JSON.parse(order.customer_info);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // D. Update KV
  await c.env.STORE_KV.put(`OTP:${orderRef}`, otp, { expirationTtl: 600 });
  await c.env.STORE_KV.put(cooldownKey, '1', { expirationTtl: 60 });
  await c.env.STORE_KV.put(countKey, (resendCount + 1).toString(), { expirationTtl: 3600 });
  
  // E. Email
  await sendEmail(c.env, {
    to: customer.email,
    subject: `(Resend) Verify Your E-Pharm Order ${orderRef}`,
    html: templates.otp(otp, order.delivery_type)
  });
  
  return c.json({ success: true });
});

/**
 * 4. TRACK ORDER
 * Returns current status of an order by reference.
 */
ordersRouter.get('/:ref/status', async (c) => {
  const ref = c.req.param('ref');
  const order = await c.env.DB.prepare(
    'SELECT status, payment_fields FROM orders WHERE order_ref = ?'
  ).bind(ref).first() as { status: string, payment_fields?: string } | null;

  if (!order) return c.json({ error: 'Order not found' }, 404);
  
  let paymentUrl = undefined;
  if (order.payment_fields) {
    try {
      const parsed = JSON.parse(order.payment_fields);
      paymentUrl = parsed.short_url;
    } catch(e) {}
  }
  
  return c.json({ status: order.status, payment_url: paymentUrl });
});

async function performFraudCheck(env: Env, orderRef: string) {
  try {
    const order = await env.DB.prepare('SELECT * FROM orders WHERE order_ref = ?').bind(orderRef).first() as any;
    if (!order) return;

    const customer = JSON.parse(order.customer_info);
    const { results: orderItems } = await env.DB.prepare(`
      SELECT oi.*, p.name, p.max_daily_qty, p.stock_qty
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_ref = ?
    `).bind(orderRef).all() as any;

    const items = orderItems.map((i: any) => ({
      product_name: i.name,
      quantity: i.quantity,
      price: i.price_at_time,
      max_daily_qty: i.max_daily_qty
    }));

    const total = items.reduce((sum: number, i: any) => sum + (i.quantity * i.price), 0);

    const fraudResult = await runFraudCheck(env, {
      order: {
        order_ref: orderRef,
        items,
        total,
        delivery_type: order.delivery_type,
        notes: order.notes || '',
        customer_email: customer.email
      },
      recentOrders: [], // Simplified for now
      stockLevels: orderItems.map((i: any) => ({
        product_name: i.name,
        stock_qty: i.stock_qty,
        ordered_qty: i.quantity
      }))
    });

    await env.DB.prepare(
      'UPDATE orders SET ai_decision_fields = ? WHERE order_ref = ?'
    ).bind(JSON.stringify(fraudResult), orderRef).run();
  } catch (e) {
    console.error('[AI] Fraud check failed:', e);
  }
}
