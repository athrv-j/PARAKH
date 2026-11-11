import { VaultDb } from '../db/vaultDb.js';
import { BrandCaseLawService, PrecedentMatch } from '../precedent/caseLaw.js';

interface PrecedentBenchmarkCase {
  id: string;
  client_id: string;
  clause_id: string;
  channel: string;
  draft_snippet: string;
  expected_precedent_id: string | null; // null if should NOT match any active precedent
  expected_verdict: 'match' | 'false_candidate_rejected' | 'channel_mismatch' | 'expired_rejected';
  expected_quote?: string;
}

// 20 Labeled Agency Benchmark Test Cases
export const PRECEDENT_BENCHMARK_CASES: PrecedentBenchmarkCase[] = [
  // 1. VyaparSetu: Daily interest rate on Instagram (PREC-VYA-001A)
  {
    id: 'CASE-01',
    client_id: 'client_vyapar',
    clause_id: 'C-3.2',
    channel: 'instagram',
    draft_snippet: 'Get instant working capital loans with daily equivalent interest rate of only 0.03% daily on your invoices!',
    expected_precedent_id: 'PREC-VYA-001A',
    expected_verdict: 'match',
    expected_quote: '0.03% daily'
  },
  // 2. VyaparSetu: Statutory annual APR on Facebook (PREC-VYA-001B)
  {
    id: 'CASE-02',
    client_id: 'client_vyapar',
    clause_id: 'C-3.2',
    channel: 'facebook',
    draft_snippet: 'Statutory annual APR of 11.5% is clearly disclosed on all commercial loan agreements.',
    expected_precedent_id: 'PREC-VYA-001B',
    expected_verdict: 'match',
    expected_quote: '11.5%'
  },
  // 3. Mitti & Moon: 100% natural & chemical-free in customer quote (PREC-MIT-002A)
  {
    id: 'CASE-03',
    client_id: 'client_mitti',
    clause_id: 'C-2.1',
    channel: 'social',
    draft_snippet: 'Customer review: "This moisturizer is 100% natural and chemical-free, my skin loves it!"',
    expected_precedent_id: 'PREC-MIT-002A',
    expected_verdict: 'match',
    expected_quote: 'chemical-free'
  },
  // 4. Mitti & Moon: Chemical-free in founder email strictly denied (PREC-MIT-002B)
  {
    id: 'CASE-04',
    client_id: 'client_mitti',
    clause_id: 'C-2.1',
    channel: 'email',
    draft_snippet: 'In our founder story email, we explain why we are completely chemical-free from farm to face.',
    expected_precedent_id: 'PREC-MIT-002B',
    expected_verdict: 'match',
    expected_quote: 'chemical-free'
  },
  // 5. Kavach Health: Award logo citation for Best Diagnostic Lab (PREC-KAV-003A)
  {
    id: 'CASE-05',
    client_id: 'client_kavach',
    clause_id: 'C-3.3',
    channel: 'print_and_pr',
    draft_snippet: 'Proud to be recognized as the Best Diagnostic Lab in North India by Times Healthcare Award.',
    expected_precedent_id: 'PREC-KAV-003A',
    expected_verdict: 'match',
    expected_quote: 'award'
  },
  // 6. Kavach Health: India\'s Best Diagnostic without methodology (PREC-KAV-003B)
  {
    id: 'CASE-06',
    client_id: 'client_kavach',
    clause_id: 'C-3.3',
    channel: 'performance_ads',
    draft_snippet: 'We are officially India\'s Best Diagnostic Solution with 100% accuracy rates.',
    expected_precedent_id: 'PREC-KAV-003B',
    expected_verdict: 'match',
    expected_quote: 'methodology'
  },
  // 7. Kavach Health: Expired Diwali Flash Campaign exception (PREC-KAV-EXP-01) -> Must REJECT because expired!
  {
    id: 'CASE-07',
    client_id: 'client_kavach',
    clause_id: 'C-1.3',
    channel: 'social',
    draft_snippet: 'Flash sale for Diwali promotional campaign checkups with 50% flat discount.',
    expected_precedent_id: null,
    expected_verdict: 'expired_rejected'
  },
  // 8. Kavach Health: Monsoon shield emergency awareness headline (PREC-KAV-ACT-01)
  {
    id: 'CASE-08',
    client_id: 'client_kavach',
    clause_id: 'C-1.2',
    channel: 'social',
    draft_snippet: 'Urgent seasonal monsoon viral infection alert: preventive diagnostic blood tests now available.',
    expected_precedent_id: 'PREC-KAV-ACT-01',
    expected_verdict: 'match'
  },
  // 9. Kavach Health: Pocket-friendly checkup substitution (PREC-KAV-ACT-02)
  {
    id: 'CASE-09',
    client_id: 'client_kavach',
    clause_id: 'C-2.3',
    channel: 'youtube',
    draft_snippet: 'Watch our quick video on how to get a pocket-friendly checkup for your family this weekend.',
    expected_precedent_id: 'PREC-KAV-ACT-02',
    expected_verdict: 'match',
    expected_quote: 'pocket-friendly'
  },
  // 10. VyaparSetu: Emergency bridge funding in B2B email (PREC-VYA-ACT-01)
  {
    id: 'CASE-10',
    client_id: 'client_vyapar',
    clause_id: 'C-1.4',
    channel: 'email',
    draft_snippet: 'Unlock emergency bridge funding on your pending textile manufacturer invoices in under 24 hours.',
    expected_precedent_id: 'PREC-VYA-ACT-01',
    expected_verdict: 'match',
    expected_quote: 'bridge funding'
  },
  // 11. VyaparSetu: RBI lending partner disclaimer in LinkedIn carousel (PREC-VYA-ACT-02)
  {
    id: 'CASE-11',
    client_id: 'client_vyapar',
    clause_id: 'C-4.4',
    channel: 'linkedin',
    draft_snippet: 'Check slide 5 for complete details on RBI lending partner disclaimer and licensing numbers.',
    expected_precedent_id: 'PREC-VYA-ACT-02',
    expected_verdict: 'match',
    expected_quote: 'disclaimer'
  },
  // 12. VyaparSetu: Channel Mismatch Test (Instagram-only precedent queried on Print PR)
  {
    id: 'CASE-12',
    client_id: 'client_vyapar',
    clause_id: 'C-3.2',
    channel: 'print_and_pr',
    draft_snippet: 'Daily equivalent rate of 0.03% daily in national newspaper front-page advertisement.',
    expected_precedent_id: 'PREC-VYA-001A',
    expected_verdict: 'channel_mismatch'
  },
  // 13. False Match Trap: Generic random text with no operative exception overlap
  {
    id: 'CASE-13',
    client_id: 'client_vyapar',
    clause_id: 'C-3.2',
    channel: 'social',
    draft_snippet: 'Our team attended the annual fintech technology summit in Bangalore last Thursday.',
    expected_precedent_id: null,
    expected_verdict: 'false_candidate_rejected'
  },
  // 14. False Match Trap: Irrelevant clinical laboratory text with no clause match
  {
    id: 'CASE-14',
    client_id: 'client_kavach',
    clause_id: 'C-3.3',
    channel: 'social',
    draft_snippet: 'Drinking 8 glasses of pure water every morning helps maintain optimal cellular hydration.',
    expected_precedent_id: null,
    expected_verdict: 'false_candidate_rejected'
  },
  // 15. Cross-Client Isolation Trap: Vyapar precedent queried under Kavach Health
  {
    id: 'CASE-15',
    client_id: 'client_kavach',
    clause_id: 'C-3.2',
    channel: 'social',
    draft_snippet: 'Daily equivalent interest rate of 0.03% daily in healthcare diagnostics payment plan.',
    expected_precedent_id: null,
    expected_verdict: 'false_candidate_rejected'
  },
  // 16. Mitti & Moon: False match on non-testimonial social post claiming chemical-free
  {
    id: 'CASE-16',
    client_id: 'client_mitti',
    clause_id: 'C-2.1',
    channel: 'performance_ads',
    draft_snippet: 'Our clinical lab formula is certified chemical-free by synthetic biology standards.',
    expected_precedent_id: 'PREC-MIT-002B',
    expected_verdict: 'match',
    expected_quote: 'chemical-free'
  },
  // 17. Kavach: YouTube shorts voiceover query with pocket-friendly phrase
  {
    id: 'CASE-17',
    client_id: 'client_kavach',
    clause_id: 'C-2.3',
    channel: 'social',
    draft_snippet: 'Book this pocket-friendly health screening today.',
    expected_precedent_id: 'PREC-KAV-ACT-02',
    expected_verdict: 'match',
    expected_quote: 'pocket-friendly'
  },
  // 18. Vyapar: B2B invoice email query matching emergency funding
  {
    id: 'CASE-18',
    client_id: 'client_vyapar',
    clause_id: 'C-1.4',
    channel: 'email',
    draft_snippet: 'Urgent liquidity solutions: bridge funding for suppliers.',
    expected_precedent_id: 'PREC-VYA-ACT-01',
    expected_verdict: 'match',
    expected_quote: 'bridge funding'
  },
  // 19. Vyapar: LinkedIn banner disclaimer match
  {
    id: 'CASE-19',
    client_id: 'client_vyapar',
    clause_id: 'C-4.4',
    channel: 'social',
    draft_snippet: 'Regulatory notices: see our lending disclaimer in footer.',
    expected_precedent_id: 'PREC-VYA-ACT-02',
    expected_verdict: 'match',
    expected_quote: 'disclaimer'
  },
  // 20. Expired decision check with Diwali campaign snippet
  {
    id: 'CASE-20',
    client_id: 'client_kavach',
    clause_id: 'C-1.3',
    channel: 'social',
    draft_snippet: 'Diwali festive season awareness checkup booking.',
    expected_precedent_id: null,
    expected_verdict: 'expired_rejected'
  }
];

export interface PrecedentBenchmarkReport {
  total_cases: number;
  top1_matches_correct: number;
  false_matches_caught: number;
  channel_mismatches_flagged: number;
  expired_precedents_rejected: number;
  conflicts_detected: number;
  total_conflicting_pairs: number;
  top1_accuracy_pct: number;
  false_match_rate_pct: number;
  channel_filter_accuracy_pct: number;
  expiry_filter_accuracy_pct: number;
  conflict_detection_pct: number;
  status: 'PASSED' | 'FAILED';
}

export function runPrecedentBenchmark(vault: VaultDb): PrecedentBenchmarkReport {
  const caseLaw = new BrandCaseLawService(vault);

  let top1Correct = 0;
  let falseMatchesCaught = 0;
  let channelMismatchesFlagged = 0;
  let expiredRejected = 0;
  let totalEvaluated = PRECEDENT_BENCHMARK_CASES.length;

  for (const tc of PRECEDENT_BENCHMARK_CASES) {
    const matches = caseLaw.findApplicablePrecedents(tc.client_id, tc.clause_id, tc.draft_snippet, {
      channel: tc.channel,
      includeExpired: false
    });

    const top1: PrecedentMatch | undefined = matches[0];

    switch (tc.expected_verdict) {
      case 'match': {
        if (top1 && top1.precedent.id === tc.expected_precedent_id) {
          top1Correct++;
        }
        break;
      }
      case 'false_candidate_rejected': {
        // Should have zero matches or very low score
        if (!top1 || top1.similarity_score < 0.25 || !top1.is_quote_verified) {
          falseMatchesCaught++;
        }
        break;
      }
      case 'channel_mismatch': {
        // Either excluded, or flagged with channel_scope_matched = false
        const allMatches = caseLaw.findApplicablePrecedents(tc.client_id, tc.clause_id, tc.draft_snippet, {
          channel: tc.channel,
          includeExpired: true
        });
        const target = allMatches.find(m => m.precedent.id === tc.expected_precedent_id);
        if (target && !target.channel_scope_matched) {
          channelMismatchesFlagged++;
        }
        break;
      }
      case 'expired_rejected': {
        // By default without includeExpired, should not be in matches
        const hasExpired = matches.some(m => m.precedent.id === 'PREC-KAV-EXP-01');
        if (!hasExpired) {
          expiredRejected++;
        }
        break;
      }
    }
  }

  // Evaluate conflict detection across all 3 client vaults
  const conflictsKavach = caseLaw.detectConflictingPrecedents('client_kavach');
  const conflictsVyapar = caseLaw.detectConflictingPrecedents('client_vyapar');
  const conflictsMitti = caseLaw.detectConflictingPrecedents('client_mitti');
  const totalConflictsFound = conflictsKavach.length + conflictsVyapar.length + conflictsMitti.length;
  const expectedConflictsTotal = 3; // 3 conflicting pairs seeded in precedents.seed.json

  const matchCasesCount = PRECEDENT_BENCHMARK_CASES.filter(c => c.expected_verdict === 'match').length;
  const falseCasesCount = PRECEDENT_BENCHMARK_CASES.filter(c => c.expected_verdict === 'false_candidate_rejected').length;
  const channelCasesCount = PRECEDENT_BENCHMARK_CASES.filter(c => c.expected_verdict === 'channel_mismatch').length;
  const expiredCasesCount = PRECEDENT_BENCHMARK_CASES.filter(c => c.expected_verdict === 'expired_rejected').length;

  const top1Accuracy = Number(((top1Correct / matchCasesCount) * 100).toFixed(1));
  const falseMatchRate = Number((((falseCasesCount - falseMatchesCaught) / falseCasesCount) * 100).toFixed(1));
  const channelFilterAccuracy = Number(((channelMismatchesFlagged / channelCasesCount) * 100).toFixed(1));
  const expiryFilterAccuracy = Number(((expiredRejected / expiredCasesCount) * 100).toFixed(1));
  const conflictDetection = Number(((totalConflictsFound / expectedConflictsTotal) * 100).toFixed(1));

  const isPassed = top1Accuracy >= 85 && falseMatchRate <= 10 && conflictDetection === 100;

  return {
    total_cases: totalEvaluated,
    top1_matches_correct: top1Correct,
    false_matches_caught: falseMatchesCaught,
    channel_mismatches_flagged: channelMismatchesFlagged,
    expired_precedents_rejected: expiredRejected,
    conflicts_detected: totalConflictsFound,
    total_conflicting_pairs: expectedConflictsTotal,
    top1_accuracy_pct: top1Accuracy,
    false_match_rate_pct: falseMatchRate,
    channel_filter_accuracy_pct: channelFilterAccuracy,
    expiry_filter_accuracy_pct: expiryFilterAccuracy,
    conflict_detection_pct: conflictDetection,
    status: isPassed ? 'PASSED' : 'FAILED'
  };
}

export function printBenchmarkReport(report: PrecedentBenchmarkReport): void {
  console.log('\n================ PRECEDENT ENGINE EVALUATION REPORT ================');
  console.log('| Metric                   | Target   | Measured | Status  |');
  console.log('|--------------------------|----------|----------|---------|');
  console.log(`| Top-1 Match Accuracy     | >= 85.0% | ${report.top1_accuracy_pct.toFixed(1)}%    | ${report.top1_accuracy_pct >= 85 ? 'PASSED' : 'FAILED'}  |`);
  console.log(`| False-Match Rate         | <= 10.0% | ${report.false_match_rate_pct.toFixed(1)}%     | ${report.false_match_rate_pct <= 10 ? 'PASSED' : 'FAILED'}  |`);
  console.log(`| Channel Scope Filter     | 100.0%   | ${report.channel_filter_accuracy_pct.toFixed(1)}%   | ${report.channel_filter_accuracy_pct >= 99 ? 'PASSED' : 'FAILED'}  |`);
  console.log(`| Expired Decision Filter  | 100.0%   | ${report.expiry_filter_accuracy_pct.toFixed(1)}%   | ${report.expiry_filter_accuracy_pct >= 99 ? 'PASSED' : 'FAILED'}  |`);
  console.log(`| Conflict Detection       | 100.0%   | ${report.conflict_detection_pct.toFixed(1)}%   | ${report.conflict_detection_pct >= 99 ? 'PASSED' : 'FAILED'}  |`);
  console.log('====================================================================');
  console.log(`OVERALL PRECEDENT ENGINE BENCHMARK: ${report.status} (${report.total_cases} labeled test cases evaluated)\n`);
}

// Standalone execution support
if (process.argv[1]?.endsWith('evaluatePrecedents.ts') || process.argv[1]?.endsWith('evaluatePrecedents.js')) {
  const vault = new VaultDb();
  const report = runPrecedentBenchmark(vault);
  printBenchmarkReport(report);
}
