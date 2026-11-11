import { describe, it, expect, beforeAll } from 'vitest';
import { VaultDb } from '../src/db/vaultDb.js';
import { runPrecedentBenchmark } from '../src/scripts/evaluatePrecedents.js';

describe('Round 3 Flagship: Layered Precedent Engine Accuracy Benchmark', () => {
  let vault: VaultDb;

  beforeAll(() => {
    vault = new VaultDb();
  });

  it('evaluates layered precedent retrieval across 20 labeled agency cases', () => {
    const report = runPrecedentBenchmark(vault);

    // 1. Top-1 Match Accuracy must meet or exceed target (>= 85%)
    expect(report.top1_accuracy_pct).toBeGreaterThanOrEqual(85.0);

    // 2. False-Match Rate must remain below target (<= 10%)
    expect(report.false_match_rate_pct).toBeLessThanOrEqual(10.0);

    // 3. Channel Scope Filter must catch 100% of channel-mismatched decisions
    expect(report.channel_filter_accuracy_pct).toBe(100.0);

    // 4. Expired Decision Filter must suppress 100% of expired exceptions
    expect(report.expiry_filter_accuracy_pct).toBe(100.0);

    // 5. Conflict Detection must discover 100% of conflicting precedent pairs
    expect(report.conflict_detection_pct).toBe(100.0);

    // Overall verdict
    expect(report.status).toBe('PASSED');
  });
});
