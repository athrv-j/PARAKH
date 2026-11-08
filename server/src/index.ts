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

app.use(cors());
app.use(express.json());

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
