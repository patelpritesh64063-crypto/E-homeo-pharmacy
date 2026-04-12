import { Hono } from 'hono';
import { Env } from '../env';
import { verifyRazorpaySignature } from '../services/razorpay';

export const webhooksRouter = new Hono<{ Bindings: Env }>();

webhooksRouter.post('/razorpay', async (c) => {
  const signature = c.req.header('x-razorpay-signature');
  const bodyText = await c.req.text();
  
  if (!signature) return c.json({ error: 'Missing signature' }, 401);

  const isValid = await verifyRazorpaySignature(bodyText, signature, c.env.RAZORPAY_SECRET);
  if (!isValid) return c.json({ error: 'Invalid signature' }, 401);

  const payload = JSON.parse(bodyText);
  
  // Payment link paid event
  if (payload.event === 'payment_link.paid') {
    const orderRef = payload.payload.payment_link.entity.reference_id;
    const paymentId = payload.payload.payment.entity.id;
    
    // Update order status to paid
    await c.env.DB.prepare(
      "UPDATE orders SET status = 'paid', payment_fields = json_insert(payment_fields, '$.razorpay_payment_id', ?) WHERE order_ref = ?"
    ).bind(paymentId, orderRef).run();
    
    // Webhook should respond quickly, 200 OK
  }
  
  return c.json({ received: true });
});
