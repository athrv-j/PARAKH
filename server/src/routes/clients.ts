import { Router, Request, Response } from 'express';
import multer from 'multer';
import { VaultDb } from '../db/vaultDb.js';
import { KnowledgeImporter } from '../services/importer.js';

const router = Router();
const vault = new VaultDb();
const importer = new KnowledgeImporter();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

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

// Get a client's knowledge base (clauses, facts, terms)
router.get('/:id/knowledge', (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    const clauses = vault.getClauses(clientId);
    const facts = vault.getFacts(clientId);
    const terms = vault.getTerms(clientId);

    res.json({
      client_id: clientId,
      summary: {
        clauses_count: clauses.length,
        facts_count: facts.length,
        terms_count: terms.length
      },
      clauses,
      facts,
      terms
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Import knowledge (POST /clients/:id/knowledge)
// Accepts either raw text via JSON body or file upload (docx/md/txt)
router.post('/:id/knowledge', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    let contentToParse = '';

    if (req.file) {
      const ext = req.file.originalname.split('.').pop()?.toLowerCase();
      const fileType = ext === 'docx' ? 'docx' : 'md';
      contentToParse = await importer.extractText(req.file.buffer, fileType);
    } else if (req.body.text) {
      contentToParse = req.body.text;
    } else {
      res.status(400).json({ error: 'Please provide either a document file upload or a "text" string in body.' });
      return;
    }

    const result = await importer.importIntoVault(clientId, contentToParse, vault);

    vault.logAudit(clientId, 'system_importer', 'import_knowledge', clientId, {
      ...result,
      source: req.file ? req.file.originalname : 'raw_text'
    });

    res.status(201).json({
      success: true,
      client_id: clientId,
      imported: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
