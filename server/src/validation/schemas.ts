import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const ClientIdParamSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{2,64}$/, 'Client ID must be alphanumeric and between 2-64 characters')
});

export const CreateClientSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{2,64}$/, 'Client ID must be alphanumeric (hyphens/underscores allowed)'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters').trim()
});

export const ImportKnowledgeSchema = z.object({
  text: z.string().max(1000000, 'Text exceeds 1MB upload limit').optional()
});

export const CreateDraftSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters').trim(),
  channel: z.enum(['social', 'email', 'press_release', 'web']).default('social'),
  text: z.string().min(1, 'Draft text is required').max(100000, 'Draft text cannot exceed 100,000 characters'),
  author: z.string().max(100).optional()
});

export const AcceptRewriteSchema = z.object({
  clauseId: z.string().regex(/^C-\d+\.\d+$/i, 'Clause ID must follow format C-X.Y (e.g. C-1.1)'),
  newText: z.string().min(5, 'New clause text must be at least 5 characters').max(2000, 'New clause text cannot exceed 2000 characters').trim(),
  acceptedBy: z.string().max(100).optional()
});

export const FactRippleSchema = z.object({
  factId: z.string().min(1, 'Fact ID is required').max(64),
  value: z.string().max(500).optional(),
  valid_until: z.string().max(50).optional().nullable(),
  dryRun: z.boolean().optional().default(false)
});

export const ResolveFindingSchema = z.object({
  decision: z.enum(['accepted', 'dismissed', 'exception']),
  reason: z.string().max(1000).optional(),
  scope: z.enum(['this_campaign', 'all_content']).optional().default('this_campaign'),
  expiry: z.string().max(50).optional().nullable(),
  decidedBy: z.string().max(100).optional(),
  userRole: z.string().optional()
});

export const QuickCapturePrecedentSchema = z.object({
  clauseId: z.string().max(64).optional().default('GENERAL_CLAUSE'),
  reason: z.string().min(5, 'Precedent reason must be at least 5 characters').max(1000),
  scope: z.enum(['this_campaign', 'all_content']).optional().default('this_campaign'),
  expiry: z.string().max(50).optional().nullable(),
  decidedBy: z.string().max(100).optional()
});

export const TransitionStatusSchema = z.object({
  status: z.enum(['draft', 'in_review', 'changes_requested', 'approved']),
  role: z.string().optional(),
  actorName: z.string().optional()
});

/**
 * Express Middleware factory to validate req.body against a Zod schema.
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid request body payload',
        details: result.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message
        }))
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Express Middleware factory to validate req.params against a Zod schema.
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid route parameters',
        details: result.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message
        }))
      });
      return;
    }
    Object.assign(req.params, result.data);
    next();
  };
}
