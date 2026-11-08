import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import { VaultDb } from '../db/vaultDb.js';
import { KnowledgeImporter, InvalidDocumentError, DecompressionBombError } from '../services/importer.js';
import { authenticateUser, requireClientVault, requireRole } from '../auth/authMiddleware.js';
import { heavyRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody, validateParams, CreateClientSchema, ClientIdParamSchema, ImportKnowledgeSchema } from '../validation/schemas.js';

const router = Router();
const vault = new VaultDb();
const importer = new KnowledgeImporter();

// Strict 5MB file upload limit
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.docx', '.md', '.txt'];
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/octet-stream',
      'text/plain',
      'text/markdown'
    ];

    if (!allowedExts.includes(ext) && !allowedMimes.includes(file.mimetype)) {
      return cb(new Error('InvalidFileType: Only .docx, .md, and .txt files are permitted.'));
    }
    cb(null, true);
  }
});

// Safe upload wrapper: catches multer file size / filter errors without crashing Express
function safeUploadMiddleware(req: Request, res: Response, next: any) {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          error: 'PayloadTooLarge',
          message: 'File upload exceeds the 5MB maximum size limit.'
        });
        return;
      }
      res.status(400).json({
        error: 'InvalidUpload',
        message: err.message || 'File upload failed validation.'
      });
      return;
    }
    next();
  });
}

// List clients (Filtered strictly by authenticated user's clientAccess)
router.get('/', authenticateUser, (req: Request, res: Response) => {
  try {
    const allClients = vault.listClients();
    const userAccess = req.user?.clientAccess || [];
    const isAgencyManager = req.user?.role === 'manager' && (userAccess.includes('*') || userAccess.length === 0);

    const authorizedClients = isAgencyManager
      ? allClients
      : allClients.filter(c => userAccess.includes(c.id));

    res.json({ clients: authorizedClients });
  } catch (error: any) {
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to retrieve clients list.' });
  }
});

// Create new client vault (Restricted to Manager role)
router.post('/', authenticateUser, requireRole(['manager']), validateBody(CreateClientSchema), (req: Request, res: Response) => {
  try {
    const { id, name } = req.body;
    vault.createClient({ id, name });

    // Grant creating manager access to this vault
    if (req.user && !req.user.clientAccess.includes(id)) {
      req.user.clientAccess.push(id);
    }

    res.status(201).json({ success: true, client: { id, name } });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'ConflictError', message: `Client vault '${req.body.id}' already exists.` });
      return;
    }
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to create client vault.' });
  }
});

// Get a client's knowledge base (Enforces strict client vault isolation)
router.get(
  '/:id/knowledge',
  authenticateUser,
  validateParams(ClientIdParamSchema),
  requireClientVault,
  (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
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
      console.error('Error in GET /:id/knowledge:', error);
      res.status(500).json({ error: 'DatabaseError', message: error.message || 'Failed to fetch knowledge base.' });
    }
  }
);

// Import knowledge (Restricted to Manager role with safe upload & bomb inspection)
router.post(
  '/:id/knowledge',
  heavyRateLimiter.middleware(),
  authenticateUser,
  validateParams(ClientIdParamSchema),
  requireRole(['manager']),
  requireClientVault,
  safeUploadMiddleware,
  validateBody(ImportKnowledgeSchema),
  async (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      let contentToParse = '';

      if (req.file) {
        // Sanitize filename against path traversal
        const cleanName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
        const ext = cleanName.split('.').pop()?.toLowerCase();
        const fileType = ext === 'docx' ? 'docx' : 'md';

        contentToParse = await importer.extractText(req.file.buffer, fileType);
      } else if (req.body?.text) {
        contentToParse = req.body.text;
      } else {
        res.status(400).json({
          error: 'BadRequest',
          message: 'Please provide either a valid .docx/.md file upload or a "text" string in body.'
        });
        return;
      }

      const result = await importer.importIntoVault(clientId, contentToParse, vault);

      vault.logAudit(clientId, req.user?.email || 'manager', 'import_knowledge', clientId, {
        ...result,
        source: req.file ? path.basename(req.file.originalname) : 'raw_text'
      });

      res.status(201).json({
        success: true,
        client_id: clientId,
        imported: result
      });
    } catch (error: any) {
      if (error instanceof InvalidDocumentError) {
        res.status(400).json({ error: 'InvalidDocumentError', message: error.message });
        return;
      }
      if (error instanceof DecompressionBombError) {
        res.status(413).json({ error: 'DecompressionBombError', message: error.message });
        return;
      }
      res.status(500).json({ error: 'ImportFailed', message: error.message || 'Failed to parse and import knowledge document.' });
    }
  }
);

export default router;
