import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { VaultDb } from '../db/vaultDb.js';
import { createToken, authenticateUser } from '../auth/authMiddleware.js';
import { UserRole } from '../auth/roles.js';

const router = Router();
const vaultDb = new VaultDb();

// Cryptographic Password Hashing & Verification using Node.js built-in scrypt
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  try {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * POST /api/auth/register
 * Registers a new user account with hashed password and returns signed JWT session.
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'ValidationError', message: 'Valid email address is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'ValidationError', message: 'Password must be at least 6 characters long.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = vaultDb.getUserByEmail(cleanEmail);
    if (existing) {
      res.status(409).json({ error: 'ConflictError', message: 'An account with this email already exists.' });
      return;
    }

    const validRoles: UserRole[] = ['creator', 'manager', 'reviewer', 'client_viewer'];
    const assignedRole: UserRole = validRoles.includes(role) ? role : 'reviewer';
    const userName = (name && typeof name === 'string' && name.trim()) ? name.trim() : cleanEmail.split('@')[0];
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const defaultClients = ['client_kavach', 'client_vyapar', 'client_mitti'];

    const password_hash = hashPassword(password);

    vaultDb.createUser({
      id: userId,
      email: cleanEmail,
      password_hash,
      name: userName,
      role: assignedRole,
      client_access: JSON.stringify(defaultClients)
    });

    const token = createToken({
      id: userId,
      email: cleanEmail,
      name: userName,
      role: assignedRole,
      clientAccess: defaultClients
    });

    res.status(201).json({
      status: 'success',
      message: 'Account registered successfully.',
      user: {
        id: userId,
        email: cleanEmail,
        name: userName,
        role: assignedRole,
        clientAccess: defaultClients
      },
      token
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'InternalError', message: 'Failed to register account.' });
  }
});

/**
 * POST /api/auth/login
 * Validates credentials and returns signed JWT session.
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'ValidationError', message: 'Email and password are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = vaultDb.getUserByEmail(cleanEmail);

    if (!user || !user.password_hash) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
      return;
    }

    const isValid = verifyPassword(String(password), user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
      return;
    }

    let clientAccess: string[] = ['client_kavach', 'client_vyapar', 'client_mitti'];
    try {
      if (typeof user.client_access === 'string') {
        clientAccess = JSON.parse(user.client_access);
      }
    } catch {}

    const token = createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientAccess
    });

    res.json({
      status: 'success',
      message: 'Signed in successfully.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clientAccess
      },
      token
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'InternalError', message: 'Failed to sign in.' });
  }
});

/**
 * GET /api/auth/me
 * Retrieves profile of currently authenticated user.
 */
router.get('/me', authenticateUser, (req: Request, res: Response): void => {
  res.json({
    status: 'success',
    user: req.user
  });
});

export default router;
