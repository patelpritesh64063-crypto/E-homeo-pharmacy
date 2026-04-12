import { Hono } from 'hono';
import { Env, Variables } from '../env';
import { verifyRazorpaySignature } from '../services/razorpay';
import { sendEmail, templates } from '../services/email';

export const webhooksRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Razorpay Webhook Handler
 * Verified via HMAC SHA256 using RAZORPAY_SECRET as the secret.
 */
webhooksRouter.post('/razorpay', async (c) => {
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
  
  // 1. Handle Payment Link Paid Event
  if (payload.event === 'payment_link.paid') {
    const linkEntity = payload.payload.payment_link.entity;
    const paymentEntity = payload.payload.payment.entity;
    
    const orderRef = linkEntity.reference_id;
    const paymentId = paymentEntity.id;
    const amountPaid = paymentEntity.amount / 100;

    // Fetch order to get customer info and items
    const order = await c.env.DB.prepare('SELECT * FROM orders WHERE order_ref = ?').bind(orderRef).first() as any;
    
    if (order) {
      // Update DB Status
      await c.env.DB.prepare(`
        UPDATE orders 
        SET status = 'paid', 
            payment_fields = json_set(payment_fields, '$.razorpay_payment_id', ?) 
        WHERE order_ref = ?
      `).bind(paymentId, orderRef).run();

      // Get items for the confirmation email
      const { results: items } = await c.env.DB.prepare(`
        SELECT oi.quantity, p.name, oi.price_at_time as price
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_ref = ?
      `).bind(orderRef).all() as any;

      // Send Confirmation Email
      const customer = JSON.parse(order.customer_info);
      await sendEmail(c.env, {
        to: customer.email,
        subject: `Payment Confirmed - Order ${orderRef}`,
        html: templates.confirmation(orderRef, items, amountPaid, order.delivery_type)
      });
      
      console.log(`[Webhook] Order ${orderRef} marked as PAID. Email sent.`);
    }
  }
  
  // Acknowledge receipt
  return c.json({ received: true });
});
