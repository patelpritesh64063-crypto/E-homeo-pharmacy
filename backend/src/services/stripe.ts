import { Env } from '../env';

/**
 * Creates a Stripe Checkout Session for an order.
 */
export const createStripeSession = async (
  env: Env,
  orderRef: string,
  amountPaise: number,
  customer: { name: string; email: string; phone?: string },
  description: string
) => {
  const formData = new URLSearchParams();
  formData.append('success_url', `${env.FRONTEND_URL.replace(/\/$/, '')}/track/${orderRef}?status=paid`);
  formData.append('cancel_url', `${env.FRONTEND_URL.replace(/\/$/, '')}/track/${orderRef}`);
  formData.append('mode', 'payment');
  formData.append('client_reference_id', orderRef);
  formData.append('customer_email', customer.email);
  
  // Line Items
  formData.append('line_items[0][price_data][currency]', 'inr');
  formData.append('line_items[0][price_data][product_data][name]', `Order ${orderRef}`);
  formData.append('line_items[0][price_data][product_data][description]', description);
  formData.append('line_items[0][price_data][unit_amount]', amountPaise.toString());
  formData.append('line_items[0][quantity]', '1');

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('[Stripe] Session Creation Failed:', errorBody);
    throw new Error('Could not create Stripe session');
  }

  const data = await res.json() as any;
  return {
    id: data.id,
    url: data.url,
  };
};

/**
 * Verifies Stripe Webhook Signature.
 * Note: Cloudflare Workers require a slightly manual verification since the 'stripe' package is heavy.
 */
export const verifyStripeSignature = async (
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> => {
  if (!signature || !secret) return false;

  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const hash = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !hash) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const expectedHash = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return expectedHash === hash;
};
