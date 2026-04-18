import { Hono } from 'hono';
import { Env, Variables } from '../env';

export const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

authRouter.post('/register', async (c) => {
  try {
    const { name, email, password } = await c.req.json();
    
    if (!name || !email || !password) {
      return c.json({ error: 'Name, email, and password are required' }, 400);
    }

    // Check if user exists
    const existing = await c.env.DB.prepare('SELECT id FROM customers WHERE email = ?').bind(email).first();
    if (existing) {
      return c.json({ error: 'Email already registered' }, 400);
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    
    await c.env.DB.prepare(
      'INSERT INTO customers (id, name, email, password_hash) VALUES (?, ?, ?, ?)'
    ).bind(id, name, email, passwordHash).run();

    // Create session
    const token = crypto.randomUUID();
    await c.env.STORE_KV.put(`CUST_SESSION:${token}`, JSON.stringify({ id, name, email }), { expirationTtl: 86400 * 7 }); // 7 days

    return c.json({ success: true, token, user: { id, name, email } }, 201);
  } catch (e: any) {
    console.error('Registration error:', e);
    return c.json({ error: 'Failed to register' }, 500);
  }
});

authRouter.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const passwordHash = await hashPassword(password);
    
    const user = await c.env.DB.prepare('SELECT id, name, email FROM customers WHERE email = ? AND password_hash = ?').bind(email, passwordHash).first();
    
    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Create session
    const token = crypto.randomUUID();
    await c.env.STORE_KV.put(`CUST_SESSION:${token}`, JSON.stringify(user), { expirationTtl: 86400 * 7 });

    return c.json({ success: true, token, user });
  } catch (e: any) {
    console.error('Login error:', e);
    return c.json({ error: 'Failed to login' }, 500);
  }
});
