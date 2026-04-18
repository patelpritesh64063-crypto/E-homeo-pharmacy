import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, Variables } from './env';
import { catalogRouter } from './routes/catalog';
import { ordersRouter } from './routes/orders';
import { adminRouter } from './routes/admin';
import { webhookRouter } from './routes/webhooks';
import { authRouter } from './routes/auth';
import { rateLimiter } from './middleware/rateLimiter';
import { handleDailyStockCron } from './cron/dailyStock';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Global Error Handling ─────────────────────────────────────

app.onError((err, c) => {
  console.error(`[Global Error] ${err.message}`, err);
  return c.json({ 
    success: false, 
    error: err.message || 'Internal Server Error',
    type: err.name
  }, 500);
});

app.notFound((c) => c.json({ error: 'Route not found' }, 404));

// ─── Middleware ──────────────────────────────────────────────────

app.use('*', cors());

// Rate limit all non-webhook and non-admin routes
// (Admin routes have built-in skip logic in rateLimiter)
app.use('/api/public/*', rateLimiter);
app.use('/api/orders/*', rateLimiter);

// ─── Base Routes ─────────────────────────────────────────────────

app.get('/', (c) => c.text('E-Pharm API - Indian Homeopathy Store v1.0'));
app.get('/health', (c) => c.json({ status: 'healthy', time: new Date().toISOString() }));

// ─── Module Routers ──────────────────────────────────────────────

app.route('/api/public/catalog', catalogRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/admin', adminRouter);
app.route('/api/webhooks', webhookRouter);
app.route('/api/auth', authRouter);

// ─── Worker Export ───────────────────────────────────────────────

export default {
  fetch: app.fetch,
  
  /**
   * Cloudflare Cron Trigger
   * Runs daily to analyze stock, sales and generate AI insights.
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('[Cron] Starting daily stock analysis...');
    ctx.waitUntil(handleDailyStockCron(env));
  },
};
