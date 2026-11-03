import { VaultDb } from '../../db/vaultDb.js';
import { FindingDraft, checkTerminology } from './terminology.js';
import { checkClaimPatterns } from './claims.js';
import { checkFactMismatches } from './facts.js';
import { checkAccessibility, calculateContrastRatio, getRelativeLuminance } from './accessibility.js';

export * from './terminology.js';
export * from './claims.js';
export * from './facts.js';
export * from './accessibility.js';

export interface DeterministicCheckOptions {
  colorPair?: [string, string];
}

/**
 * Runs all deterministic compliance checks against a draft text.
 * Requires strict client isolation via VaultDb.
 */
export function runDeterministicChecks(
  clientId: string,
  text: string,
  vault: VaultDb,
  options?: DeterministicCheckOptions
): FindingDraft[] {
  const terms = vault.getTerms(clientId);
  const facts = vault.getFacts(clientId);

  const termFindings = checkTerminology(text, terms);
  const claimFindings = checkClaimPatterns(text, facts);
  const factFindings = checkFactMismatches(text, facts);
  const a11yFindings = checkAccessibility(text, options);

  // Return combined findings sorted by span_start
  const combined = [...termFindings, ...claimFindings, ...factFindings, ...a11yFindings];
  return combined.sort((a, b) => a.span_start - b.span_start);
}
