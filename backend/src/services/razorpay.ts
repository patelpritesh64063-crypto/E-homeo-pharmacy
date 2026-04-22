import { Env } from '../env';

/**
 * Creates a Razorpay Payment Link for an order.
 * Uses Basic Auth: key_id:key_secret
 */
export const createPaymentLink = async (
  env: Env, 
  orderRef: string, 
  amountPaise: number, 
  customer: { name: string, email: string, phone?: string },
  description: string
) => {
  const auth = btoa(`${env.RAZORPAY_KEY}:${env.RAZORPAY_SECRET}`);
  
  const payload = {
    amount: amountPaise,
    currency: "INR",
    accept_partial: false,
    expire_by: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    reference_id: orderRef,
    description: description,
    customer: {
      name: customer.name,
      contact: customer.phone || "9999999999", // Default since phone is needed by Razorpay
      email: customer.email
    },
    notify: {
      sms: true,
      email: true
    },
    reminder_enable: true,
    // Callback is where user is redirected after payment
    callback_url: `${env.FRONTEND_URL.replace(/\/$/, '')}/track/${orderRef}`,
    callback_method: "get"
  };

  const res = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('[Razorpay] Link Creation Failed:', errorBody);
    throw new Error('Could not create payment link');
  }

  const data = await res.json() as any;
  return {
    id: data.id,
    short_url: data.short_url,
    status: data.status
  };
};

/**
 * Verifies Razorpay Webhook Signature using HMAC SHA256.
 * Webhook secret should be set in Razorpay Dashboard and passed here.
 */
export const verifyRazorpaySignature = async (
  bodyContent: string, 
  signature: string, 
  secret: string
): Promise<boolean> => {
  if (!signature || !secret) return false;
  
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
    encoder.encode(bodyContent)
  );
  
  // Convert signature bytes to hex string
  const hashArray = Array.from(new Uint8Array(signatureBytes));
  const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return expectedSignature === signature;
};
