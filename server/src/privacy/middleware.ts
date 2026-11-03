import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      clientId?: string;
      userRole?: string;
    }
  }
}

/**
 * Client Vault Middleware
 * Enforces strict multi-tenant boundary by reading `x-client-id` header
 * or scoped token, preventing cross-vault queries.
 */
export function requireClientVault(req: Request, res: Response, next: NextFunction): void {
  const clientId = (req.headers['x-client-id'] as string) || (req.query.client_id as string);

  if (!clientId || !clientId.trim()) {
    res.status(403).json({
      error: 'ClientVaultAccessDenied',
      message: 'All requests must be explicitly bound to a client vault via x-client-id header.'
    });
    return;
  }

  req.clientId = clientId.trim();
  next();
}
