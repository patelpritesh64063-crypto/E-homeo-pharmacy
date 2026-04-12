import { Env } from '../env';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (env: Env, payload: EmailPayload) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'E-Pharm Store <noreply@e-pharm-store.dev>', // Replace with verified domain
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    console.error('Failed to send email:', await res.text());
  }
};

export const templates = {
  otp: (otp: string, deliveryType: string) => `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>E-Pharm Store Verification</h2>
      <p>Your one-time password for the order is:</p>
      <h1 style="color: #6C5CE7; letter-spacing: 5px;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p style="margin-top: 20px; padding: 10px; background: #eee; border-radius: 5px;">
        <strong>Delivery Method:</strong> ${deliveryType.toUpperCase()}
      </p>
    </div>
  `,
  paymentLink: (link: string, amount: number, deliveryType: string) => `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Your Order is Accepted!</h2>
      <p>Please complete your payment of INR ${amount / 100} to confirm.</p>
      <a href="${link}" style="display:inline-block; padding:12px 24px; background:#6C5CE7; color:white; text-decoration:none; border-radius:5px; margin:20px 0;">Pay Now</a>
      <p>This link is valid for 1 hour.</p>
      <p style="margin-top: 20px; padding: 10px; background: #eee; border-radius: 5px;">
        <strong>Delivery Method:</strong> ${deliveryType.toUpperCase()}
      </p>
    </div>
  `,
  shipping: (trackingInfo: any, deliveryType: string) => `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Great news, your order is on the way!</h2>
      <p>Status: Shipped / Ready for Pickup</p>
      <pre>${JSON.stringify(trackingInfo, null, 2)}</pre>
      <p style="margin-top: 20px; padding: 10px; background: #eee; border-radius: 5px;">
        <strong>Delivery Method:</strong> ${deliveryType.toUpperCase()}
      </p>
    </div>
  `
};
