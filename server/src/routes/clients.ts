import { Router, Request, Response } from 'express';
import { VaultDb } from '../db/vaultDb.js';

const router = Router();
const vault = new VaultDb();

// List all clients in agency
router.get('/', (_req: Request, res: Response) => {
  try {
    const clients = vault.listClients();
    res.json({ clients });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new client vault
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, name } = req.body;
    if (!id || !name) {
      res.status(400).json({ error: 'Client id and name are required' });
      return;
    }
    vault.createClient({ id, name });
    res.status(201).json({ success: true, client: { id, name } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
