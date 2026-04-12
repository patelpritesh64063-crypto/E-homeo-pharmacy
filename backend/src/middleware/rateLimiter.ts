import { Context, Next } from 'hono';
import { Env } from '../env';

export const rateLimiter = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  const path = new URL(c.req.url).pathname;
  
  // Rate limit window 1 minute, max 100 requests per IP per route
  const kvKey = `RL:${ip}:${path}`;
  const currentCountStr = await c.env.STORE_KV.get(kvKey);
  let count = currentCountStr ? parseInt(currentCountStr, 10) : 0;
  
  if (count > 100) {
    return c.json({ error: 'Too many requests' }, 429);
  }
  
  await c.env.STORE_KV.put(kvKey, (count + 1).toString(), { expirationTtl: 60 });
  await next();
};
