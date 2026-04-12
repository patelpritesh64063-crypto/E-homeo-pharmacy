import { Env } from '../env';

export const createPaymentLink = async (env: Env, orderRef: string, amountPaise: number, customer: { name: string, email: string, phone: string }) => {
  const auth = btoa(`${env.RAZORPAY_KEY}:${env.RAZORPAY_SECRET}`);
  
  const payload = {
    amount: amountPaise,
    currency: "INR",
    accept_partial: false,
    expire_by: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    reference_id: orderRef,
    description: `Payment for Order ${orderRef}`,
    customer: {
      name: customer.name,
      contact: customer.phone,
      email: customer.email
    },
    notify: {
      sms: true,
      email: true
    },
    reminder_enable: true,
    callback_url: "https://yourfrontend.com/track/" + orderRef,
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
    throw new Error('Failed to create Razorpay link: ' + errorBody);
  }

  const data = await res.json() as any;
  return data.short_url;
};

export const verifyRazorpaySignature = async (bodyContent: string, signature: string, secret: string) => {
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
  
  const hashArray = Array.from(new Uint8Array(signatureBytes));
  const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return expectedSignature === signature;
};
