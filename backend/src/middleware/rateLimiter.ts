import { Context, Next } from 'hono';
import { Env } from '../env';

// Route specific limits (Requests per minute)
const LIMITS: Record<string, number> = {
  '/api/orders/place': 5,
  '/api/orders/verify-otp': 10,
  '/api/orders/resend-otp': 3,
  'DEFAULT': 60
};

export const rateLimiter = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  const path = new URL(c.req.url).pathname;

  // 1. Skip rate limiting for Admin routes if authenticated
  // We check for Authorization header as a proxy for admin intent
  const authHeader = c.req.header('Authorization');
  if (authHeader && path.includes('/admin')) {
    return await next();
  }

  // 2. Determine limit for this path
  const limit = LIMITS[path] || LIMITS['DEFAULT'];

  // 3. KV-based rate tracking (1 minute window)
  const windowKey = Math.floor(Date.now() / 60000).toString();
  const kvKey = `RL:${ip}:${path}:${windowKey}`;
  
  const currentCountStr = await c.env.STORE_KV.get(kvKey);
  const count = currentCountStr ? parseInt(currentCountStr, 10) : 0;

  if (count >= limit) {
    return c.json({ 
      error: 'Too many requests', 
      retry_after: '60 seconds',
      limit: limit
    }, 429);
  }

  // Increment and set TTL for 1 minute
  await c.env.STORE_KV.put(kvKey, (count + 1).toString(), { expirationTtl: 60 });

  // Add headers for transparency
  c.header('X-RateLimit-Limit', limit.toString());
  c.header('X-RateLimit-Remaining', (limit - count - 1).toString());

  await next();
};
