import { Router } from 'express';
import clientsRouter from './clients.js';
import reviewRouter from './review.js';
import { getAboutAiManifest } from '../privacy/aboutAi.js';

const apiRouter = Router();

apiRouter.use('/clients', clientsRouter);
apiRouter.use('/review', reviewRouter);

// Transparency: About AI Endpoint
apiRouter.get('/about-ai', (_req, res) => {
  res.json(getAboutAiManifest());
});

// Base health endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'parakh-server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default apiRouter;
