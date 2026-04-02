import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import authRoutes from './routes/auth';
import { verifyToken } from './routes/auth';
import playerRoutes from './routes/players';
import weekRoutes from './routes/weeks';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Auth middleware for admin routes
app.use('/api/players/*', async (c, next) => {
  const method = c.req.method;
  if (method === 'GET') return next(); // reads are public
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const token = auth.slice(7);
  if (!verifyToken(token, c.env.JWT_SECRET)) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  return next();
});

app.use('/api/weeks/*', async (c, next) => {
  const method = c.req.method;
  const path = c.req.path;
  // Public: GET requests and player registration (POST register)
  if (method === 'GET') return next();
  if (method === 'POST' && path.match(/\/register\//)) return next();
  // All other mutations require admin
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const token = auth.slice(7);
  if (!verifyToken(token, c.env.JWT_SECRET)) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  return next();
});

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/players', playerRoutes);
app.route('/api/weeks', weekRoutes);

// Static files are served by wrangler's [site] config
// For any non-API route, return the index.html (SPA fallback)
app.get('*', async (c) => {
  // This is handled by wrangler's site asset serving
  // If we reach here, the asset wasn't found - return 404
  return c.text('Not found', 404);
});

export default app;
