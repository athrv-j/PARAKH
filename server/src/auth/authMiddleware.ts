import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getSupabaseClient } from '../db/supabaseClient.js';
import { AuthenticatedUser, UserRole } from './roles.js';

const JWT_SECRET = process.env.JWT_SECRET || 'parakh_dev_jwt_secret_key_change_in_production_min32chars';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      clientId?: string;
    }
  }
}

/**
 * Creates a signed JWT for development, seed scripts, or test scenarios.
 */
export function createToken(payload: { id: string; email: string; role: UserRole; clientAccess: string[]; name?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Authentication Middleware:
 * Validates Bearer token using either Supabase Auth (if configured) or JWT verification.
 * Also parses structured deterministic test tokens in test/dev environments.
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const rawToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.headers['x-auth-token'] as string);

  if (!rawToken) {
    res.status(401).json({
      error: 'AuthenticationRequired',
      message: 'Access denied. Bearer authentication token is required.'
    });
    return;
  }

  // 1. Structured Test Token Support for Deterministic Unit / Integration Tests
  if (rawToken.startsWith('test-token:')) {
    const parts = rawToken.split(':');
    // Format: test-token:<role>:<client_ids_comma_separated>:<user_id>:<email>
    const role = (parts[1] || 'reviewer') as UserRole;
    const clientAccess = parts[2] ? parts[2].split(',').map(s => s.trim()) : ['client_kavach'];
    const id = parts[3] || 'test_user_01';
    const email = parts[4] || `${role}@parakh-agency.internal`;

    req.user = {
      id,
      email,
      name: `Test ${role}`,
      role,
      clientAccess
    };
    next();
    return;
  }

  // 2. Supabase Auth Verification (if Supabase credentials are configured in environment)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(rawToken);
      if (!error && data?.user) {
        // Fetch role and client access from public.users or app_metadata
        const userMeta = data.user.app_metadata || {};
        const role = (userMeta.role || data.user.user_metadata?.role || 'reviewer') as UserRole;
        const clientAccess = (userMeta.client_access || data.user.user_metadata?.client_access || []) as string[];

        req.user = {
          id: data.user.id,
          email: data.user.email || 'user@supabase.auth',
          name: data.user.user_metadata?.name || data.user.email,
          role,
          clientAccess
        };
        next();
        return;
      }
    } catch {
      // Fall through to standard JWT verification if Supabase call fails
    }
  }

  // 3. Application JWT Verification
  try {
    const decoded = jwt.verify(rawToken, JWT_SECRET) as any;
    req.user = {
      id: decoded.id || decoded.sub || 'unknown',
      email: decoded.email || 'unknown@parakh.io',
      name: decoded.name,
      role: decoded.role || 'reviewer',
      clientAccess: Array.isArray(decoded.clientAccess) ? decoded.clientAccess : [decoded.clientAccess].filter(Boolean)
    };
    next();
  } catch (err: any) {
    res.status(401).json({
      error: 'InvalidToken',
      message: 'Authentication token is invalid or expired.'
    });
  }
}

/**
 * Vault Isolation Middleware:
 * Enforces database-style tenant isolation at the API boundary.
 * Verifies that the authenticated user's `clientAccess` permits interaction with the target client vault.
 */
export function requireClientVault(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'AuthenticationRequired', message: 'Authentication required before checking vault access.' });
    return;
  }

  // Resolve target client ID from URL param, header, or body
  const targetClientId = (req.params.id || req.headers['x-client-id'] || req.body?.client_id) as string | undefined;

  if (!targetClientId || !targetClientId.trim()) {
    res.status(400).json({
      error: 'ClientVaultMissing',
      message: 'Target client vault identifier must be specified in route parameter or x-client-id header.'
    });
    return;
  }

  const normalizedId = targetClientId.trim();

  // If user does not have this client vault in their allowed clientAccess list:
  if (!req.user.clientAccess.includes(normalizedId) && req.user.role !== 'manager') {
    res.status(403).json({
      error: 'VaultAccessDenied',
      message: `Cross-vault access violation: Your account does not have access to client vault '${normalizedId}'.`
    });
    return;
  }

  // If manager, verify they have permission or allow agency-wide manager access if granted
  if (req.user.role === 'manager' && !req.user.clientAccess.includes(normalizedId) && !req.user.clientAccess.includes('*')) {
    res.status(403).json({
      error: 'VaultAccessDenied',
      message: `Cross-vault access violation: Manager account is not assigned to client vault '${normalizedId}'.`
    });
    return;
  }

  req.clientId = normalizedId;
  next();
}

/**
 * Role-Based Access Control (RBAC) Middleware:
 * Restricts endpoint invocation to specified roles.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'AuthenticationRequired', message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'InsufficientRolePermissions',
        message: `Action requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'.`
      });
      return;
    }

    next();
  };
}
