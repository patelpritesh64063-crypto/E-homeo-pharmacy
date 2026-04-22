import { Hono } from 'hono';
import { Env } from '../env';
import { verifyRazorpaySignature } from '../services/razorpay';
import { sendEmail, templates } from '../services/email';

export const webhookRouter = new Hono<{ Bindings: Env }>();

/**
 * Razorpay Webhook Handler
 */
webhookRouter.post('/razorpay', async (c) => {
  const signature = c.req.header('x-razorpay-signature');
  const bodyText = await c.req.text();
  
  if (!signature) {
    console.error('[Webhook] Missing Razorpay signature');
    return c.json({ error: 'Missing signature' }, 401);
  }

  // Verify signature
  const isValid = await verifyRazorpaySignature(bodyText, signature, c.env.RAZORPAY_SECRET);
  if (!isValid) {
    console.error('[Webhook] Invalid Razorpay signature');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const payload = JSON.parse(bodyText);
  
  if (payload.event === 'payment_link.paid') {
    const linkEntity = payload.payload.payment_link.entity;
    const paymentEntity = payload.payload.payment.entity;
    
    const orderRef = linkEntity.reference_id;
    const paymentId = paymentEntity.id;
    const amountPaid = paymentEntity.amount / 100;

    // 1. Get Order
    const order = await c.env.DB.prepare('SELECT * FROM orders WHERE order_ref = ?').bind(orderRef).first() as any;
    if (!order) {
      console.error(`[Webhook] Order ${orderRef} not found`);
      return c.json({ error: 'Order not found' }, 404);
    }

    // 2. Mark as Paid
    await c.env.DB.prepare(`
      UPDATE orders 
      SET status = 'paid', 
          payment_fields = json_set(payment_fields, '$.razorpay_payment_id', ?) 
      WHERE order_ref = ?
    `).bind(paymentId, orderRef).run();

    // 3. Get Items for Email
    const { results: items } = await c.env.DB.prepare(`
        SELECT oi.*, p.name 
        FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_ref = ?
    `).bind(orderRef).all() as any;

    const customer = JSON.parse(order.customer_info);

    // 4. Send Confirmation Email
    await sendEmail(c.env, {
      to: customer.email,
      subject: `Payment Confirmed for Order ${orderRef}`,
      html: templates.confirmation(orderRef, items, amountPaid, order.delivery_type)
    });

    console.log(`[Webhook] Order ${orderRef} marked as paid`);
  }

  return c.json({ received: true });
});
