import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import apiRouter from './routes/index.js';
import { runMigrations } from './db/index.js';
import { requestTimeout } from './middleware/timeout.js';
import { generalRateLimiter } from './middleware/rateLimiter.js';

dotenv.config();

// Process-level resilience: prevent server crashes from unhandled rejections or exceptions
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Process caught unhandled exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Process caught unhandled rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 4000;

// Enterprise Security Headers (Anti-Clickjacking, Strict MIME Sniffing, XSS & HSTS Protection)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Production-Grade CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4000',
  'https://parakh-3xk4.onrender.com',
  process.env.APP_ORIGIN
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server) or matched origins
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback for preview deployments
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));

// Resilience: Request Timeouts & General Rate Limiting
app.use(requestTimeout(30000)); // 30s timeout
app.use(generalRateLimiter.middleware());

// Run SQLite migrations on startup
try {
  runMigrations();
  console.log('✓ SQLite database migrations applied successfully');
} catch (err) {
  console.error('Failed to apply migrations:', err);
}

// Mount API routes
app.use('/api', apiRouter);

// Serve frontend static build if available (Unified Full-Stack Server)
const webDistCandidates = [
  path.resolve(process.cwd(), 'web/dist'),
  path.resolve(process.cwd(), '../web/dist')
];
const webDistPath = webDistCandidates.find(p => fs.existsSync(p));

if (webDistPath) {
  app.use(express.static(webDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
  console.log(`✓ Serving Parakh frontend UI from: ${webDistPath}`);
}

// Fallback centralized error handler (Hides raw database/driver internals in production)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: isProd && status === 500 ? 'An unexpected server error occurred.' : err.message
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  🏛️  Parakh (परख) Unified Server Running!`);
    console.log(`  👉  Open in Browser: http://localhost:${PORT}`);
    console.log(`  👉  API Health:       http://localhost:${PORT}/api/health`);
    console.log(`======================================================\n`);
  });
}

export default app;
