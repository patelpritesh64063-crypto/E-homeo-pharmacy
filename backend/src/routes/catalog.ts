import { Hono } from 'hono';
import { Env } from '../env';

export const catalogRouter = new Hono<{ Bindings: Env }>();

catalogRouter.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM products WHERE active_flag = 1'
  ).all();
  
  return c.json(results);
});

catalogRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const product = await c.env.DB.prepare(
    'SELECT * FROM products WHERE id = ?'
  ).bind(id).first();
  
  if (!product) return c.json({ error: 'Not found' }, 404);
  
  const { results: related } = await c.env.DB.prepare(
    'SELECT * FROM products WHERE category = ? AND id != ? LIMIT 4'
  ).bind(product.category, id).all();
  
  return c.json({ product, related });
});
