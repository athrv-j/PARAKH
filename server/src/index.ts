import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/index.js';
import { runMigrations } from './db/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Run SQLite migrations on startup
try {
  runMigrations();
  console.log('✓ SQLite database migrations applied successfully');
} catch (err) {
  console.error('Failed to apply migrations:', err);
}

// Mount API routes
app.use('/api', apiRouter);

// Fallback error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'InternalServerError', message: err.message });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Parakh backend running on http://localhost:${PORT}`);
  });
}

export default app;
