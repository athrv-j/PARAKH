import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../src/db/index.js';
import { VaultDb } from '../src/db/vaultDb.js';
import { seedAgencyData } from '../src/scripts/seedAgency.js';
import { runDeterministicChecks, calculateContrastRatio } from '../src/review/checks/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Phase 4: Deterministic Checks Engine (Precision & Recall)', () => {
  let db: DatabaseSync;
  let vault: VaultDb;
  let groundTruth: Array<{
    draft_id: string;
    client_id: string;
    channel: string;
    expected_issues: Array<{
      type: string;
      clause_or_fact_id: string;
      snippet: string;
      explanation: string;
    }>;
  }>;

  beforeAll(() => {
    db = new DatabaseSync(':memory:');
    runMigrations(db);
    vault = new VaultDb(db);

    // Seed agency data into test memory db
    const seed = seedAgencyData(db);
    groundTruth = seed.groundTruth;

    // Load ground truth from script output file if available
    const gtFilePath = path.resolve(__dirname, '../src/scripts/ground_truth.json');
    if (fs.existsSync(gtFilePath)) {
      groundTruth = JSON.parse(fs.readFileSync(gtFilePath, 'utf-8'));
    }
  });

  it('correctly calculates WCAG 2.1 contrast ratios mathematically', () => {
    // Pure black (#000000) on pure white (#FFFFFF) => 21:1
    const maxContrast = calculateContrastRatio('#000000', '#FFFFFF');
    expect(maxContrast).toBeGreaterThanOrEqual(21);

    // White (#FFFFFF) on Teal (#0E4D48) => High contrast > 7:1
    const brandContrast = calculateContrastRatio('#FFFFFF', '#0E4D48');
    expect(brandContrast).toBeGreaterThan(7.0);

    // Light grey (#D0D0D0) on white (#FFFFFF) => Fails (< 4.5:1)
    const lowContrast = calculateContrastRatio('#D0D0D0', '#FFFFFF');
    expect(lowContrast).toBeLessThan(4.5);
  });

  it('runs deterministic checks against 40 ground truth drafts and measures precision & recall', () => {
    // Metrics per check category: terminology, claims, facts, accessibility
    const metrics: Record<string, { tp: number; fp: number; fn: number }> = {
      terminology: { tp: 0, fp: 0, fn: 0 },
      claims: { tp: 0, fp: 0, fn: 0 },
      fact_mismatch: { tp: 0, fp: 0, fn: 0 },
      accessibility: { tp: 0, fp: 0, fn: 0 }
    };

    // Read drafts from db
    const drafts = db.prepare('SELECT d.id, d.client_id, v.text_content FROM drafts d JOIN draft_versions v ON d.id = v.draft_id').all() as any[];

    for (const draft of drafts) {
      const gtEntry = groundTruth.find(gt => gt.draft_id === draft.id);
      if (!gtEntry) continue;

      const detected = runDeterministicChecks(draft.client_id, draft.text_content, vault);

      // Map expected issues that fall under deterministic scope
      const expectedDeterministic = gtEntry.expected_issues.filter(
        i => ['terminology', 'unsupported_claim', 'claims', 'fact_mismatch', 'accessibility'].includes(i.type)
      );

      // Tally for each expected issue
      for (const exp of expectedDeterministic) {
        const catKey = exp.type === 'unsupported_claim' ? 'claims' : exp.type;
        const matched = detected.some(
          d => (d.type === exp.type || (exp.type === 'claims' && d.type === 'unsupported_claim')) &&
               (draft.text_content.substring(d.span_start, d.span_end).toLowerCase().includes(exp.snippet.toLowerCase()) ||
                exp.snippet.toLowerCase().includes(d.span_text.toLowerCase()))
        );

        if (metrics[catKey]) {
          if (matched) {
            metrics[catKey].tp++;
          } else {
            metrics[catKey].fn++;
          }
        }
      }

      // Tally false positives
      for (const det of detected) {
        const catKey = det.type === 'unsupported_claim' ? 'claims' : det.type;
        const wasExpected = expectedDeterministic.some(
          e => (e.type === det.type || (det.type === 'unsupported_claim' && e.type === 'claims'))
        );
        if (metrics[catKey] && !wasExpected) {
          metrics[catKey].fp++;
        }
      }
    }

    // Print evaluation report table
    console.log('\n================ DETERMINISTIC CHECKS EVALUATION REPORT ================');
    console.log('| Check Type         | TP   | FP  | FN  | Precision  | Recall     |');
    console.log('|--------------------|------|-----|-----|------------|------------|');

    let totalTp = 0;
    let totalFp = 0;
    let totalFn = 0;

    for (const [cat, m] of Object.entries(metrics)) {
      totalTp += m.tp;
      totalFp += m.fp;
      totalFn += m.fn;
      const precision = m.tp + m.fp > 0 ? ((m.tp / (m.tp + m.fp)) * 100).toFixed(1) + '%' : '100%';
      const recall = m.tp + m.fn > 0 ? ((m.tp / (m.tp + m.fn)) * 100).toFixed(1) + '%' : '100%';
      console.log(`| ${cat.padEnd(18)} | ${String(m.tp).padEnd(4)} | ${String(m.fp).padEnd(3)} | ${String(m.fn).padEnd(3)} | ${precision.padEnd(10)} | ${recall.padEnd(10)} |`);
    }

    const overallPrecision = totalTp + totalFp > 0 ? ((totalTp / (totalTp + totalFp)) * 100).toFixed(1) + '%' : '100%';
    const overallRecall = totalTp + totalFn > 0 ? ((totalTp / (totalTp + totalFn)) * 100).toFixed(1) + '%' : '100%';
    console.log('|--------------------|------|-----|-----|------------|------------|');
    console.log(`| OVERALL            | ${String(totalTp).padEnd(4)} | ${String(totalFp).padEnd(3)} | ${String(totalFn).padEnd(3)} | ${overallPrecision.padEnd(10)} | ${overallRecall.padEnd(10)} |`);
    console.log('========================================================================\n');

    expect(totalTp).toBeGreaterThan(0);
  });
});
