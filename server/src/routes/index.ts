import { Router } from 'express';
import clientsRouter from './clients.js';

const apiRouter = Router();

apiRouter.use('/clients', clientsRouter);

// Base health endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'parakh-server',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

export default apiRouter;
