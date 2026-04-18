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
      from: 'E-Pharm Store <onboarding@resend.dev>',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Failed to send email:', err);
    throw new Error(`Email delivery failed: ${err}`);
  }
};

const styles = `
  <style>
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 40px 20px; text-align: center; color: white; }
    .content { padding: 40px; line-height: 1.6; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; background: #f1f5f9; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-top: 8px; }
    .badge-delivery { background: #dcfce7; color: #166534; }
    .badge-pickup { background: #fef9c3; color: #854d0e; }
    .otp-code { font-size: 48px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; margin: 24px 0; text-align: center; }
    .button { display: inline-block; padding: 14px 28px; background: #4f46e5; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .note { padding: 16px; background: #f8fafc; border-left: 4px solid #cbd5e1; border-radius: 4px; font-style: italic; margin-top: 20px; }
    .item-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 12px 0; }
    .total-row { display: flex; justify-content: space-between; padding-top: 20px; font-weight: 800; font-size: 18px; color: #1e293b; }
  </style>
`;

const layout = (title: string, content: string) => `
  <!DOCTYPE html>
  <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">${title}</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">E-Pharm Homeopathy Store</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} E-Pharm Store. All rights reserved.<br>
          Modern Homeopathy for a Better Tomorrow.
        </div>
      </div>
    </body>
  </html>
`;

export const templates = {
  otp: (otp: string, deliveryType: string, isLogin: boolean = false) => layout(
    isLogin ? 'Admin Login Verification' : 'Verify Your Order',
    `
      <p>Hello,</p>
      <p>Use the following 6-digit code to ${isLogin ? 'access your admin dashboard' : 'verify your order at E-Pharm Store'}.</p>
      <div class="otp-code">${otp}</div>
      <p>This code is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
      ${!isLogin ? `<div class="badge badge-${deliveryType === 'delivery' ? 'delivery' : 'pickup'}">${deliveryType.toUpperCase()}</div>` : ''}
    `
  ),

  paymentLink: (link: string, amount: number, deliveryType: string, notes?: string) => layout(
    'Order Accepted',
    `
      <p>Great news! Your order has been accepted. Please complete the payment to confirm your purchase.</p>
      <div style="text-align: center;">
        <h2 style="margin-bottom: 0;">INR ${amount / 100}</h2>
        <a href="${link}" class="button">Pay Securely via Razorpay</a>
      </div>
      <p style="font-size: 14px; color: #64748b; text-align: center;">This link will expire in 1 hour.</p>
      <div class="badge badge-${deliveryType === 'delivery' ? 'delivery' : 'pickup'}">${deliveryType.toUpperCase()}</div>
      ${notes ? `<div class="note"><strong>Delivery Notes:</strong> ${notes}</div>` : ''}
    `
  ),

  confirmation: (orderRef: string, items: any[], total: number, deliveryType: string) => layout(
    'Payment Confirmed',
    `
      <p>Thank you for your payment! Your order <strong>${orderRef}</strong> is now confirmed and being prepared.</p>
      <div style="margin: 30px 0;">
        ${items.map(item => `
          <div class="item-row">
            <span>${item.name} × ${item.quantity}</span>
            <span>₹${item.price}</span>
          </div>
        `).join('')}
        <div class="total-row">
          <span>Total Paid</span>
          <span>₹${total}</span>
        </div>
      </div>
      <div class="badge badge-${deliveryType === 'delivery' ? 'delivery' : 'pickup'}">${deliveryType.toUpperCase()}</div>
      <p>We will notify you once your order is ${deliveryType === 'delivery' ? 'shipped' : 'ready for pickup'}.</p>
    `
  ),

  shipping: (deliveryType: string, trackingUrl?: string, notes?: string) => layout(
    deliveryType === 'delivery' ? 'Your Order is Shipped' : 'Ready for Pickup',
    `
      <p>Exciting news! Your order is ${deliveryType === 'delivery' ? 'on its way to you' : 'ready for pickup at our store'}.</p>
      ${trackingUrl ? `
        <div style="text-align: center;">
          <a href="${trackingUrl}" class="button">Track Your Package</a>
        </div>
      ` : ''}
      <div class="badge badge-${deliveryType === 'delivery' ? 'delivery' : 'pickup'}">${deliveryType.toUpperCase()}</div>
      ${notes ? `<div class="note"><strong>Delivery Notes:</strong> ${notes}</div>` : ''}
      <p>Thank you for choosing E-Pharm Store!</p>
    `
  ),

  rejection: (reason: string) => layout(
    'Order Update',
    `
      <p>We regret to inform you that your order could not be processed at this time.</p>
      <div class="note" style="border-left-color: #ef4444; color: #ef4444;">
        <strong>Reason for cancellation:</strong><br>${reason}
      </div>
      <p>Any payments made will be refunded within 5-7 business days. If you have any questions, please contact our support.</p>
    `
  ),

  delivered: (orderRef: string) => layout(
    'Order Delivered',
    `
      <p>Your order <strong>${orderRef}</strong> has been marked as delivered. We hope you are satisfied with your purchase!</p>
      <p>If you have any feedback or concerns, please let us know.</p>
      <div style="text-align: center; margin-top: 40px;">
        <p style="font-weight: 600;">How was your experience?</p>
        <span style="font-size: 32px;">⭐⭐⭐⭐⭐</span>
      </div>
    `
  )
};
