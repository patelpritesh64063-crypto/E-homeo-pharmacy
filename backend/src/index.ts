import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './env';
import { catalogRouter } from './routes/catalog';
import { ordersRouter } from './routes/orders';
import { adminRouter } from './routes/admin';
import { webhooksRouter } from './routes/webhooks';
import { rateLimiter } from './middleware/rateLimiter';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());
app.use('/api/public/*', rateLimiter);
app.use('/api/orders/*', rateLimiter);

app.get('/', (c) => c.text('E-Pharm API is running'));

// Register sub-routers
app.route('/api/public/catalog', catalogRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/admin', adminRouter);
app.route('/api/webhooks', webhooksRouter);

export default app;
