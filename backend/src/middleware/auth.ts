import { Context, Next } from 'hono';
import { Env } from '../env';

/**
 * Middleware to protect admin routes.
 * Supports both Session Token (KV) and Master API Key.
 */
export const adminAuth = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  
  // 1. Check Master API Key (for external system access/automation)
  if (token === c.env.ADMIN_API_KEY) {
    return await next();
  }

  // 2. Check Session Token (for dashboard users)
  const sessionData = await c.env.STORE_KV.get(`SESSION:${token}`);
  if (!sessionData) {
    return c.json({ error: 'Session expired or invalid. Please login again.' }, 401);
  }

  // Parse and attach admin info to context if needed
  try {
    const admin = JSON.parse(sessionData);
    c.set('admin' as any, admin);
  } catch (e) {
    // Fallback if JSON is malformed
  }

  await next();
};
