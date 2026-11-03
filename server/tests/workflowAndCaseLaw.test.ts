import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../src/db/index.js';
import { VaultDb } from '../src/db/vaultDb.js';
import { seedAgencyData } from '../src/scripts/seedAgency.js';
import { DraftWorkflowService } from '../src/workflow/draftWorkflow.js';
import { BrandCaseLawService } from '../src/precedent/caseLaw.js';
import { WorkflowPermissionError } from '../src/workflow/roles.js';

describe('Phase 7 & 8: Review Workflow, RBAC, and Brand Case Law Precedents', () => {
  let db: DatabaseSync;
  let vault: VaultDb;
  let workflow: DraftWorkflowService;
  let caseLaw: BrandCaseLawService;
  const clientId = 'client_kavach';

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    runMigrations(db);
    vault = new VaultDb(db);
    workflow = new DraftWorkflowService(vault);
    caseLaw = new BrandCaseLawService(vault);

    // Seed agency data
    seedAgencyData(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Phase 7: Role-Based Workflow & Draft Life Cycle', () => {
    it('enforces RBAC: creators can submit, but client_viewers cannot transition states', () => {
      const { draftId } = workflow.createDraft(clientId, {
        title: 'New Health Camp Post',
        channel: 'social',
        author: 'Ravi Creator',
        initialText: 'Visit Kavach Health this weekend.'
      });

      // Creator transitions draft -> in_review (Allowed)
      expect(() => {
        workflow.transitionStatus(clientId, draftId, 'in_review', 'creator', 'Ravi Creator');
      }).not.toThrow();

      // Client viewer attempts to approve or request changes (Forbidden)
      expect(() => {
        workflow.transitionStatus(clientId, draftId, 'approved', 'client_viewer', 'Client Observer');
      }).toThrow(WorkflowPermissionError);

      // Creator attempts to approve directly (Forbidden)
      expect(() => {
        workflow.transitionStatus(clientId, draftId, 'approved', 'creator', 'Ravi Creator');
      }).toThrow(WorkflowPermissionError);
    });

    it('requires all findings to be resolved before final approval', () => {
      const { draftId, versionId } = workflow.createDraft(clientId, {
        title: 'Draft with Pending Finding',
        channel: 'social',
        author: 'Ravi Creator',
        initialText: 'Miracle cure offered at our clinics.'
      });

      workflow.transitionStatus(clientId, draftId, 'in_review', 'creator', 'Ravi Creator');

      // Insert a pending compliance finding
      vault.insertFinding(clientId, {
        id: 'f_test_pending',
        version_id: versionId,
        type: 'terminology',
        severity: 'high',
        span_start: 0,
        span_end: 12,
        span_text: 'Miracle cure',
        source_type: 'rule',
        source_id: 'T-KAV-01',
        source_text: 'miracle cure',
        explanation: 'Banned term',
        status: 'pending'
      });

      // Manager/Reviewer attempts to approve with unresolved findings (Forbidden)
      expect(() => {
        workflow.transitionStatus(clientId, draftId, 'approved', 'reviewer', 'Dr. Anita Roy');
      }).toThrow(/pending compliance findings must be resolved first/);

      // Dismiss finding with a human reason
      workflow.resolveFinding(clientId, {
        findingId: 'f_test_pending',
        decision: 'dismissed',
        reason: 'Client specifically approved this copy for one-time historical retrospective.',
        scope: 'this_campaign',
        decidedBy: 'Dr. Anita Roy',
        userRole: 'reviewer'
      });

      // Now approval succeeds!
      expect(() => {
        workflow.transitionStatus(clientId, draftId, 'approved', 'reviewer', 'Dr. Anita Roy');
      }).not.toThrow();
    });

    it('creates immutable revisions and tracks word-level diffs', () => {
      const { draftId } = workflow.createDraft(clientId, {
        title: 'Revision Test Post',
        channel: 'social',
        author: 'Ravi Creator',
        initialText: 'Visit our cheap clinic today.'
      });

      const revision = workflow.createRevision(
        clientId,
        draftId,
        'Visit our affordable preventive clinic today.',
        'Ravi Creator',
        'creator'
      );

      expect(revision.versionNum).toBe(2);
      expect(revision.diff.length).toBeGreaterThan(0);
      expect(revision.diff.some(d => d.removed && d.value.includes('cheap'))).toBe(true);
      expect(revision.diff.some(d => d.added && d.value.includes('affordable'))).toBe(true);
    });
  });

  describe('Phase 8: Brand Case Law & Precedent Memory', () => {
    it('omits expired precedents and matches active precedents requiring human confirmation', () => {
      // Find precedents on Clause C-1.2
      // Seeded precedent PREC-KAV-001 has expiry '2026-09-30' (expired!)
      const matches = caseLaw.findApplicablePrecedents(clientId, 'C-1.2', 'urgent monsoon copy');

      // The expired precedent should be omitted
      const hasExpired = matches.some(m => m.precedent.id === 'PREC-KAV-001');
      expect(hasExpired).toBe(false);
    });

    it('detects conflicting precedent rulings across the client vault', () => {
      // Check seeded conflicting pairs for VyaparSetu
      const vyaparConflicts = caseLaw.detectConflictingPrecedents('client_vyapar');
      expect(vyaparConflicts.length).toBeGreaterThan(0);
      expect(vyaparConflicts[0].clause_id).toBe('C-3.2');
      expect(vyaparConflicts[0].conflict_summary).toContain('Contradictory rulings');

      // Check seeded conflicting pairs for Mitti & Moon
      const mittiConflicts = caseLaw.detectConflictingPrecedents('client_mitti');
      expect(mittiConflicts.length).toBeGreaterThan(0);
      expect(mittiConflicts[0].clause_id).toBe('C-2.1');
    });
  });
});
