import { Hono } from 'hono';
import { Env } from '../env';
import { adminAuth } from '../middleware/auth';
import { createPaymentLink } from '../services/razorpay';
import { sendEmail, templates } from '../services/email';
import { handleDailyStockCron } from '../cron/dailyStock';

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

  // Check AI decision — warn admin if flagged
  let aiWarning = null;
  if (order.ai_decision_fields) {
    const aiDecision = JSON.parse(order.ai_decision_fields);
    if (aiDecision.decision === 'flagged') {
      aiWarning = {
        message: 'AI ने इस order को flagged किया है',
        reasoning: aiDecision.reasoning,
        flags: aiDecision.flags,
      };
    }
  }

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
  
  return c.json({ success: true, link, aiWarning });
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

// ─── AI ENDPOINTS ────────────────────────────────────────────────

// View AI fraud decision for a specific order
adminRouter.get('/orders/:ref/ai-decision', async (c) => {
  const ref = c.req.param('ref');
  const order = await c.env.DB.prepare(
    'SELECT ai_decision_fields FROM orders WHERE order_ref = ?'
  ).bind(ref).first() as any;
  
  if (!order) return c.json({ error: 'Order not found' }, 404);
  
  const decision = order.ai_decision_fields 
    ? JSON.parse(order.ai_decision_fields) 
    : { decision: 'pending', reasoning: 'AI check अभी तक नहीं हुआ' };
  
  return c.json(decision);
});

// Manually trigger stock analysis (Admin "Run AI" button)
adminRouter.post('/ai/run-stock-analysis', async (c) => {
  const result = await handleDailyStockCron(c.env);
  return c.json(result);
});

// Get last cron run info
adminRouter.get('/ai/last-run', async (c) => {
  const lastRun = await c.env.STORE_KV.get('CRON:last_stock_analysis');
  const lastError = await c.env.STORE_KV.get('CRON:last_stock_analysis_error');
  
  return c.json({
    lastRun: lastRun ? JSON.parse(lastRun) : null,
    lastError: lastError ? JSON.parse(lastError) : null,
  });
});

// Get daily summary
adminRouter.get('/ai/summary/:date', async (c) => {
  const date = c.req.param('date');
  const summary = await c.env.DB.prepare(
    'SELECT * FROM daily_summaries WHERE date = ?'
  ).bind(date).first() as any;
  
  if (!summary) return c.json({ error: 'No summary for this date' }, 404);
  
  return c.json({
    date: summary.date,
    stats: JSON.parse(summary.stats),
    insights: summary.ai_insights ? JSON.parse(summary.ai_insights) : null,
    lowStock: summary.low_stock_data ? JSON.parse(summary.low_stock_data) : [],
  });
});

// List draft purchase orders
adminRouter.get('/ai/purchase-orders', async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM purchase_orders WHERE status = 'draft' ORDER BY created_at DESC"
  ).all() as any;
  
  return c.json((results || []).map((po: any) => ({
    po_number: po.po_number,
    status: po.status,
    details: JSON.parse(po.items),
    created_at: po.created_at,
  })));
});

