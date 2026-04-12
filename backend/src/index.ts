import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, Variables } from './env';
import { catalogRouter } from './routes/catalog';
import { ordersRouter } from './routes/orders';
import { adminRouter } from './routes/admin';
import { webhooksRouter } from './routes/webhooks';
import { rateLimiter } from './middleware/rateLimiter';
import { handleDailyStockCron } from './cron/dailyStock';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

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
app.route('/api/webhooks', webhooksRouter);

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
