import { Hono } from 'hono';
import { Env } from '../env';
import { verifyStripeSignature } from '../services/stripe';
import { sendEmail, templates } from '../services/email';

export const webhookRouter = new Hono<{ Bindings: Env }>();

webhookRouter.post('/stripe', async (c) => {
  const signature = c.req.header('stripe-signature');
  const bodyContent = await c.req.text();
  
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 400);
  }

  const isValid = await verifyStripeSignature(bodyContent, signature, c.env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    console.error('[Webhook] Invalid Stripe signature');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const event = JSON.parse(bodyContent);
  console.log(`[Webhook] Received Stripe event: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderRef = session.client_reference_id;

    if (!orderRef) {
      console.error('[Webhook] Missing client_reference_id');
      return c.json({ error: 'Missing client_reference_id' }, 400);
    }

    // 1. Get Order
    const order = await c.env.DB.prepare('SELECT * FROM orders WHERE order_ref = ?').bind(orderRef).first() as any;
    if (!order) {
      console.error(`[Webhook] Order ${orderRef} not found`);
      return c.json({ error: 'Order not found' }, 404);
    }

    // 2. Get Items for Email
    const { results: items } = await c.env.DB.prepare(`
        SELECT oi.*, p.name 
        FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_ref = ?
    `).bind(orderRef).all() as any;

    const customer = JSON.parse(order.customer_info);
    const paymentData = JSON.parse(order.payment_fields || '{}');

    // 3. Mark as Paid
    await c.env.DB.prepare(
      "UPDATE orders SET status = 'paid' WHERE order_ref = ?"
    ).bind(orderRef).run();

    // 4. Send Confirmation Email
    await sendEmail(c.env, {
      to: customer.email,
      subject: `Payment Confirmed for Order ${orderRef}`,
      html: templates.confirmation(orderRef, items, paymentData.amount_paise / 100, order.delivery_type)
    });

    console.log(`[Webhook] Order ${orderRef} marked as paid`);
  }

  return c.json({ received: true });
});
