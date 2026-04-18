import { Hono } from 'hono';
import { Env, Variables } from '../env';
import { sendEmail } from '../services/email';

export const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Helpers ─────────────────────────────────────────────────────

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function createSession(env: Env, user: { id: string; name: string; email: string; phone?: string }) {
  const token = crypto.randomUUID();
  await env.STORE_KV.put(`CUST_SESSION:${token}`, JSON.stringify(user), { expirationTtl: 86400 * 30 }); // 30 days
  return token;
}

async function sendSmsOtp(env: Env, phone: string, otp: string): Promise<boolean> {
  if (!env.FAST2SMS_API_KEY) {
    console.warn('[SMS] FAST2SMS_API_KEY not set');
    return false;
  }
  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: phone.replace(/^\+91/, '').replace(/\D/g, '')
      })
    });
    const data = await res.json() as any;
    return data.return === true;
  } catch (e) {
    console.error('[SMS] Fast2SMS error:', e);
    return false;
  }
}

// ─── Routes ──────────────────────────────────────────────────────

/**
 * 1. SEND OTP (Email or Phone)
 */
authRouter.post('/otp/send', async (c) => {
  try {
    const { email, phone } = await c.req.json();
    
    if (!email && !phone) return c.json({ error: 'Email or phone is required' }, 400);

    const otp = generateOTP();
    const key = email ? `CUST_OTP:email:${email}` : `CUST_OTP:phone:${phone}`;
    await c.env.STORE_KV.put(key, otp, { expirationTtl: 600 }); // 10 min

    if (email) {
      await sendEmail(c.env, {
        to: email,
        subject: 'Your E-Homeo Login OTP',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0f172a;color:#f8fafc;border-radius:16px;">
            <h2 style="color:#7C6FE9;margin-bottom:8px;">E-Homeo Pharmacy</h2>
            <p style="color:#94a3b8;">Your one-time login code:</p>
            <div style="font-size:40px;font-weight:800;letter-spacing:12px;text-align:center;color:#34D399;padding:24px 0;">${otp}</div>
            <p style="color:#94a3b8;font-size:0.85rem;">Valid for 10 minutes. Do not share with anyone.</p>
          </div>`
      });
      return c.json({ success: true, method: 'email' });
    } else {
      const sent = await sendSmsOtp(c.env, phone, otp);
      if (sent) return c.json({ success: true, method: 'sms' });
      else return c.json({ error: 'Failed to send SMS. Please use email login instead.' }, 500);
    }
  } catch (err: any) {
    console.error('[OTP Send Error]', err);
    return c.json({ error: err.message || 'Failed to send OTP' }, 500);
  }
});

/**
 * 2. VERIFY OTP (Email or Phone) → Create Session
 */
authRouter.post('/otp/verify', async (c) => {
  try {
    const { email, phone, otp } = await c.req.json();

    if (!otp || (!email && !phone)) return c.json({ error: 'OTP and email or phone required' }, 400);

    const key = email ? `CUST_OTP:email:${email}` : `CUST_OTP:phone:${phone}`;
    const storedOtp = await c.env.STORE_KV.get(key);

    if (!storedOtp) return c.json({ error: 'OTP expired. Please request a new one.' }, 400);
    if (storedOtp !== otp.trim()) return c.json({ error: 'Invalid OTP code' }, 400);

    await c.env.STORE_KV.delete(key);

    // Upsert customer
    const contactKey = email || phone;
    let user = await c.env.DB.prepare(
      email ? 'SELECT id, name, email, phone FROM customers WHERE email = ?' 
             : 'SELECT id, name, email, phone FROM customers WHERE phone = ?'
    ).bind(contactKey).first() as any;

    if (!user) {
      const id = crypto.randomUUID();
      const name = email ? email.split('@')[0] : `User_${phone?.slice(-4)}`;
      await c.env.DB.prepare(
        'INSERT INTO customers (id, name, email, phone) VALUES (?, ?, ?, ?)'
      ).bind(id, name, email || null, phone || null).run();
      user = { id, name, email: email || null, phone: phone || null };
    }

    const token = await createSession(c.env, user);
    return c.json({ success: true, token, user });
  } catch (err: any) {
    console.error('[OTP Verify Error]', err);
    return c.json({ error: err.message || 'Verification failed' }, 500);
  }
});

/**
 * 3. GOOGLE SIGN-IN — Verify Google ID Token
 */
authRouter.post('/google', async (c) => {
  try {
    const { credential } = await c.req.json();
    if (!credential) return c.json({ error: 'Google credential required' }, 400);

    // Verify with Google
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await verifyRes.json() as any;

    if (!verifyRes.ok || !payload.email || !payload.email_verified) {
      return c.json({ error: 'Invalid Google token' }, 401);
    }

    // Check client ID matches (security)
    if (c.env.GOOGLE_CLIENT_ID && payload.aud !== c.env.GOOGLE_CLIENT_ID) {
      return c.json({ error: 'Token audience mismatch' }, 401);
    }

    const { email, name, picture } = payload;

    // Upsert customer
    let user = await c.env.DB.prepare('SELECT id, name, email FROM customers WHERE email = ?').bind(email).first() as any;
    if (!user) {
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO customers (id, name, email, avatar_url) VALUES (?, ?, ?, ?)'
      ).bind(id, name || email.split('@')[0], email, picture || null).run();
      user = { id, name: name || email.split('@')[0], email };
    }

    const token = await createSession(c.env, user);
    return c.json({ success: true, token, user });
  } catch (err: any) {
    console.error('[Google Auth Error]', err);
    return c.json({ error: 'Google sign-in failed' }, 500);
  }
});

/**
 * 4. GET CURRENT USER from token
 */
authRouter.get('/me', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth) return c.json({ error: 'No token' }, 401);
  const token = auth.replace('Bearer ', '');
  const user = await c.env.STORE_KV.get(`CUST_SESSION:${token}`);
  if (!user) return c.json({ error: 'Invalid or expired session' }, 401);
  return c.json({ user: JSON.parse(user) });
});

/**
 * 5. MY ORDERS — fetch all orders for logged-in customer
 */
authRouter.get('/my-orders', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth) return c.json({ error: 'Not authenticated' }, 401);
  const token = auth.replace('Bearer ', '');
  const userStr = await c.env.STORE_KV.get(`CUST_SESSION:${token}`);
  if (!userStr) return c.json({ error: 'Session expired' }, 401);
  const user = JSON.parse(userStr);

  // Get orders by email
  const { results: orders } = await c.env.DB.prepare(`
    SELECT o.*, 
      (SELECT json_group_array(json_object('name', p.name, 'qty', oi.quantity, 'price', oi.price_at_time, 'emoji', p.emoji))
       FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_ref = o.order_ref
      ) as items_json
    FROM orders o
    WHERE json_extract(o.customer_info, '$.email') = ?
    ORDER BY o.created_at DESC
    LIMIT 50
  `).bind(user.email).all();

  return c.json({ orders });
});

/**
 * 6. LOGOUT
 */
authRouter.post('/logout', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth) {
    const token = auth.replace('Bearer ', '');
    await c.env.STORE_KV.delete(`CUST_SESSION:${token}`);
  }
  return c.json({ success: true });
});
