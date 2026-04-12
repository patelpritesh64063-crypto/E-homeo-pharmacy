import { Context, Next } from 'hono';
import { Env } from '../env';

export const adminAuth = async (c: Context<{ Bindings: Env }>, next: Next) => {
  // Can be authorized via KV Session mapping or direct API Key
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Fast path for API KEY (system-to-system)
  if (token === c.env.ADMIN_API_KEY) {
    return next();
  }

  // Handle Session Token (KV-based login)
  const sessionData = await c.env.STORE_KV.get(`SESSION:${token}`);
  if (!sessionData) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }

  // Proceed
  // We can attach admin details to context if needed: c.set('admin', JSON.parse(sessionData))
  await next();
};
