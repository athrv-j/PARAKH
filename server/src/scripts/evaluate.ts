import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../db/index.js';
import { VaultDb } from '../db/vaultDb.js';
import { seedAgencyData } from './seedAgency.js';
import { runDeterministicChecks } from '../review/checks/index.js';
import { GroqReviewClient } from '../review/llm/client.js';
import { enforceCitationGate } from '../review/citation/citationGate.js';
import { BrandCaseLawService } from '../precedent/caseLaw.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EvaluationReport {
  timestamp: string;
  total_drafts_evaluated: number;
  clean_drafts_count: number;
  violation_drafts_count: number;
  metrics_by_issue_type: Record<string, {
    true_positives: number;
    false_positives: number;
    false_negatives: number;
    precision_percent: number;
    recall_percent: number;
  }>;
  overall_metrics: {
    precision_percent: number;
    recall_percent: number;
    f1_score: number;
  };
  citation_gate: {
    total_ai_findings_evaluated: number;
    verified_valid_citations: number;
    uncited_dropped_count: number;
    citation_validity_rate_percent: number;
    share_of_findings_dropped_percent: number;
  };
  case_law: {
    seeded_precedent_test_queries: number;
    top_1_accurate_matches: number;
    precedent_top_1_accuracy_percent: number;
  };
  performance: {
    median_review_time_ms: number;
    p95_review_time_ms: number;
  };
}

export async function runFullEvaluation(): Promise<EvaluationReport> {
  const db = new DatabaseSync(':memory:');
  runMigrations(db);
  const vault = new VaultDb(db);
  const groqClient = new GroqReviewClient();
  const caseLaw = new BrandCaseLawService(vault);

  // Seed agency data
  const seed = seedAgencyData(db);
  const groundTruth = seed.groundTruth;

  const latencies: number[] = [];
  let totalAiEvaluated = 0;
  let totalAiVerified = 0;
  let totalAiDropped = 0;

  const issueStats: Record<string, { tp: number; fp: number; fn: number }> = {
    terminology: { tp: 0, fp: 0, fn: 0 },
    claims: { tp: 0, fp: 0, fn: 0 },
    fact_mismatch: { tp: 0, fp: 0, fn: 0 },
    accessibility: { tp: 0, fp: 0, fn: 0 },
    tone: { tp: 0, fp: 0, fn: 0 }
  };

  const drafts = db
    .prepare('SELECT d.id, d.client_id, d.channel, v.text_content FROM drafts d JOIN draft_versions v ON d.id = v.draft_id')
    .all() as Array<{ id: string; client_id: string; channel: string; text_content: string }>;

  for (const draft of drafts) {
    const startTime = performance.now();

    // 1. Run Deterministic Checks
    const deterministicFindings = runDeterministicChecks(draft.client_id, draft.text_content, vault);

    // 2. Run LLM Checks
    const clauses = vault.getClauses(draft.client_id, true);
    const facts = vault.getFacts(draft.client_id);
    const rawAiFindings = await groqClient.checkToneAndMessaging(draft.text_content, clauses, facts);
    totalAiEvaluated += rawAiFindings.length;

    // 3. Enforce Citation Gate
    const gateResult = enforceCitationGate(draft.client_id, draft.text_content, rawAiFindings, clauses, facts, vault);
    totalAiVerified += gateResult.verifiedFindings.length;
    totalAiDropped += gateResult.droppedFindings.length;

    // Combined Pipeline Findings
    const allFindings = [...deterministicFindings, ...gateResult.verifiedFindings];

    const endTime = performance.now();
    latencies.push(endTime - startTime);

    // Compare with Ground Truth
    const gt = groundTruth.find(g => g.draft_id === draft.id);
    const expected = gt ? gt.expected_issues : [];

    for (const exp of expected) {
      const catKey = exp.type === 'unsupported_claim' ? 'claims' : exp.type;
      const matched = allFindings.some(
        f => (f.type === exp.type || (exp.type === 'claims' && f.type === 'unsupported_claim') || (exp.type === 'tone' && f.type === 'tone')) &&
             (draft.text_content.substring(f.span_start, f.span_end).toLowerCase().includes(exp.snippet.toLowerCase()) ||
              exp.snippet.toLowerCase().includes(f.span_text.toLowerCase()))
      );

      if (issueStats[catKey]) {
        if (matched) {
          issueStats[catKey].tp++;
        } else {
          issueStats[catKey].fn++;
        }
      }
    }

    for (const f of allFindings) {
      const catKey = f.type === 'unsupported_claim' ? 'claims' : f.type;
      const wasExpected = expected.some(
        e => (e.type === f.type || (f.type === 'unsupported_claim' && e.type === 'claims'))
      );
      if (issueStats[catKey] && !wasExpected) {
        issueStats[catKey].fp++;
      }
    }
  }

  // Precedent Top-1 Accuracy on Seeded Decisions
  const precedentQueries = [
    { client: 'client_vyapar', clause: 'C-3.2', snippet: 'Daily interest rate 0.03% equivalent', expected_id: 'PREC-VYA-001A' },
    { client: 'client_mitti', clause: 'C-2.1', snippet: 'Customer testimonial chemical-free natural formulation', expected_id: 'PREC-MIT-002A' },
    { client: 'client_kavach', clause: 'C-3.3', snippet: 'Times Healthcare Award Best Diagnostic Lab North India', expected_id: 'PREC-KAV-003A' }
  ];

  let top1Accurate = 0;
  for (const q of precedentQueries) {
    const matches = caseLaw.findApplicablePrecedents(q.client, q.clause, q.snippet);
    if (matches.length > 0 && matches[0].precedent.id === q.expected_id) {
      top1Accurate++;
    }
  }

  // Compute Latency percentiles
  latencies.sort((a, b) => a - b);
  const medianLatency = latencies[Math.floor(latencies.length / 2)] || 0;
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;

  // Compute Precision and Recall
  let totalTp = 0;
  let totalFp = 0;
  let totalFn = 0;
  const metricsByIssueType: EvaluationReport['metrics_by_issue_type'] = {};

  for (const [key, stat] of Object.entries(issueStats)) {
    totalTp += stat.tp;
    totalFp += stat.fp;
    totalFn += stat.fn;
    const prec = stat.tp + stat.fp > 0 ? (stat.tp / (stat.tp + stat.fp)) * 100 : 100;
    const rec = stat.tp + stat.fn > 0 ? (stat.tp / (stat.tp + stat.fn)) * 100 : 100;
    metricsByIssueType[key] = {
      true_positives: stat.tp,
      false_positives: stat.fp,
      false_negatives: stat.fn,
      precision_percent: Number(prec.toFixed(1)),
      recall_percent: Number(rec.toFixed(1))
    };
  }

  const overallPrec = totalTp + totalFp > 0 ? (totalTp / (totalTp + totalFp)) * 100 : 100;
  const overallRec = totalTp + totalFn > 0 ? (totalTp / (totalTp + totalFn)) * 100 : 100;
  const f1 = overallPrec + overallRec > 0 ? (2 * (overallPrec * overallRec)) / (overallPrec + overallRec) : 0;

  const totalGateFindings = totalAiVerified + totalAiDropped;
  const validityRate = totalGateFindings > 0 ? (totalAiVerified / totalGateFindings) * 100 : 100;
  const droppedShare = totalGateFindings > 0 ? (totalAiDropped / totalGateFindings) * 100 : 0;

  const report: EvaluationReport = {
    timestamp: new Date().toISOString(),
    total_drafts_evaluated: drafts.length,
    clean_drafts_count: 10,
    violation_drafts_count: 40,
    metrics_by_issue_type: metricsByIssueType,
    overall_metrics: {
      precision_percent: Number(overallPrec.toFixed(1)),
      recall_percent: Number(overallRec.toFixed(1)),
      f1_score: Number((f1 / 100).toFixed(3))
    },
    citation_gate: {
      total_ai_findings_evaluated: totalGateFindings,
      verified_valid_citations: totalAiVerified,
      uncited_dropped_count: totalAiDropped,
      citation_validity_rate_percent: Number(validityRate.toFixed(1)),
      share_of_findings_dropped_percent: Number(droppedShare.toFixed(1))
    },
    case_law: {
      seeded_precedent_test_queries: precedentQueries.length,
      top_1_accurate_matches: top1Accurate,
      precedent_top_1_accuracy_percent: Number(((top1Accurate / precedentQueries.length) * 100).toFixed(1))
    },
    performance: {
      median_review_time_ms: Number(medianLatency.toFixed(2)),
      p95_review_time_ms: Number(p95Latency.toFixed(2))
    }
  };

  // Write eval-report.json
  const reportPath = path.resolve(__dirname, '../../eval-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  // Write EVAL_SUMMARY.md
  const mdSummary = `# Parakh Automated Evaluation Report
> Generated on: ${report.timestamp}  
> Total Drafts Evaluated: **${report.total_drafts_evaluated}** (${report.violation_drafts_count} violation drafts, ${report.clean_drafts_count} clean controls)

## 📊 Reliability & Precision / Recall per Issue Type

| Issue Type | TP | FP | FN | Precision | Recall |
| :--- | :--- | :--- | :--- | :--- | :--- |
${Object.entries(report.metrics_by_issue_type)
  .map(([cat, m]) => `| **${cat}** | ${m.true_positives} | ${m.false_positives} | ${m.false_negatives} | **${m.precision_percent}%** | **${m.recall_percent}%** |`)
  .join('\n')}
| **OVERALL** | **${totalTp}** | **${totalFp}** | **${totalFn}** | **${report.overall_metrics.precision_percent}%** | **${report.overall_metrics.recall_percent}%** |

* **Overall F1 Score:** ${report.overall_metrics.f1_score}

---

## 🛡️ Citation Gate Verification
* Total AI Findings Evaluated: **${report.citation_gate.total_ai_findings_evaluated}**
* Verified Citations Passed: **${report.citation_gate.verified_valid_citations}** (${report.citation_gate.citation_validity_rate_percent}%)
* Uncited / Hallucinated Findings Dropped: **${report.citation_gate.uncited_dropped_count}** (${report.citation_gate.share_of_findings_dropped_percent}%)

---

## 🏛️ Brand Case Law Accuracy
* Seeded Precedent Test Queries: **${report.case_law.seeded_precedent_test_queries}**
* Top-1 Accurate Precedent Matches: **${report.case_law.top_1_accurate_matches}**
* **Top-1 Accuracy:** **${report.case_law.precedent_top_1_accuracy_percent}%**

---

## ⚡ Performance & Review Latency
* **Median Review Time:** ${report.performance.median_review_time_ms} ms
* **95th Percentile Latency:** ${report.performance.p95_review_time_ms} ms
`;

  const mdPath = path.resolve(__dirname, '../../EVAL_SUMMARY.md');
  fs.writeFileSync(mdPath, mdSummary, 'utf-8');

  return report;
}

// CLI direct execution
if (process.argv[1]?.endsWith('evaluate.ts') || process.argv[1]?.endsWith('evaluate.js')) {
  console.log('Running Parakh Automated Evaluation Harness...');
  runFullEvaluation().then(report => {
    console.log(`✓ Evaluated ${report.total_drafts_evaluated} drafts`);
    console.log(`✓ Overall Precision: ${report.overall_metrics.precision_percent}%`);
    console.log(`✓ Overall Recall: ${report.overall_metrics.recall_percent}%`);
    console.log(`✓ Precedent Top-1 Accuracy: ${report.case_law.precedent_top_1_accuracy_percent}%`);
    console.log(`✓ Median Review Latency: ${report.performance.median_review_time_ms} ms`);
    console.log(`✓ Saved eval-report.json and EVAL_SUMMARY.md`);
  });
}
