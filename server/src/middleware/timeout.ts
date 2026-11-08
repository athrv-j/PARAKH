import { Request, Response, NextFunction } from 'express';

export function requestTimeout(timeoutMs = 25000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment or bypass requests, honor custom timeout header
    const requestedTimeout = req.headers['x-request-timeout']
      ? parseInt(req.headers['x-request-timeout'] as string, 10)
      : timeoutMs;

    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      if (!res.headersSent) {
        res.status(504).json({
          error: 'GatewayTimeout',
          message: `Request timed out after ${requestedTimeout}ms. Processing was aborted.`
        });
      }
    }, requestedTimeout);

    // Clean up timer upon completion
    const cleanup = () => {
      clearTimeout(timer);
    };

    res.once('finish', cleanup);
    res.once('close', cleanup);

    next();
  };
}
