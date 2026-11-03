import { FindingDraft } from './terminology.js';
import { FactRecord } from '../../db/vaultDb.js';

interface ClaimPattern {
  name: string;
  regex: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
}

const CLAIM_PATTERNS: ClaimPattern[] = [
  {
    name: 'Superlative Superiority',
    regex: /\b(?:India['’]?s\s+(?:No\.?\s*1|best)|world['’]?s\s+best|unbeatable|unrivaled|better than all)\b/gi,
    severity: 'high',
    explanation: 'Comparative superiority claim detected. Statutory regulations and brand guidelines forbid unverified ranking claims.'
  },
  {
    name: 'Absolute Guarantee',
    regex: /\b(?:100%\s+guaranteed|100%\s+immune|foolproof|guaranteed\s+(?:approval|relief|cure|results)|zero\s+risk)\b/gi,
    severity: 'high',
    explanation: 'Absolute outcome claim detected. Consumer protection standards require qualified phrasing.'
  },
  {
    name: 'Clinical Hyperbole',
    regex: /\b(?:instant\s+(?:whitening|cure|relief)|miracle\s+(?:cure|remedy))\b/gi,
    severity: 'critical',
    explanation: 'Prohibited medical or cosmetic hyperbole. Outcome claims must adhere strictly to verified clinical data.'
  }
];

export function checkClaimPatterns(text: string, approvedFacts: FactRecord[]): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const allFactValues = approvedFacts.map(f => f.value.toLowerCase()).join(' ');

  for (const pattern of CLAIM_PATTERNS) {
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(text)) !== null) {
      const snippet = match[0];
      // Check if this claim snippet or assertion is backed by an approved fact
      const isBacked = allFactValues.includes(snippet.toLowerCase());

      if (!isBacked) {
        findings.push({
          id: `f_claim_${match.index}_${Date.now()}`,
          type: 'unsupported_claim',
          severity: pattern.severity,
          span_start: match.index,
          span_end: match.index + snippet.length,
          span_text: snippet,
          source_type: 'rule',
          source_id: 'C-3.3',
          source_text: 'Any statistical claim or comparative superiority must reference an active approved fact in the fact registry.',
          model_name: 'rule_engine',
          explanation: `${pattern.explanation} Snippet '${snippet}' has no matching supporting fact in the approved registry.`,
          suggested_fix: 'Remove absolute ranking or replace with substantiated claim supported by certified audit data.'
        });
      }
    }
  }

  return findings;
}
