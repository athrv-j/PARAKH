import { FindingDraft } from './terminology.js';
import { FactRecord } from '../../db/vaultDb.js';

export function checkFactMismatches(text: string, facts: FactRecord[]): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const now = new Date();

  // 1. Check Rupee Price Mismatches (e.g. ₹499, ₹1,499, etc.)
  const priceRegex = /₹\s*([0-9,]+)/g;
  let priceMatch: RegExpExecArray | null;

  // Collect all known approved price numbers from facts
  const approvedPrices = new Set<string>();
  for (const fact of facts) {
    const matches = fact.value.match(/₹\s*([0-9,]+)/g);
    if (matches) {
      for (const m of matches) {
        approvedPrices.add(m.replace(/\s+/g, ''));
      }
    }
  }

  while ((priceMatch = priceRegex.exec(text)) !== null) {
    const rawPrice = priceMatch[0].replace(/\s+/g, '');
    if (approvedPrices.size > 0 && !approvedPrices.has(rawPrice)) {
      // Unapproved or mismatched price cited
      const contextStart = Math.max(0, priceMatch.index - 20);
      const contextEnd = Math.min(text.length, priceMatch.index + priceMatch[0].length + 20);
      const snippet = text.substring(contextStart, contextEnd);

      findings.push({
        id: `f_price_${priceMatch.index}_${Date.now()}`,
        type: 'fact_mismatch',
        severity: 'critical',
        span_start: priceMatch.index,
        span_end: priceMatch.index + priceMatch[0].length,
        span_text: priceMatch[0],
        source_type: 'rule',
        source_id: 'FACT_REGISTRY_PRICE',
        source_text: `Approved pricing: ${Array.from(approvedPrices).join(', ')}`,
        model_name: 'rule_engine',
        explanation: `Price '${rawPrice}' does not match any approved fact in client's fact sheet (expected one of: ${Array.from(approvedPrices).join(', ')}).`,
        suggested_fix: `Verify correct pricing from client fact sheet.`
      });
    }
  }

  // 2. Check Expired or Expiring Fact Citations
  for (const fact of facts) {
    if (fact.valid_until) {
      const expiryDate = new Date(fact.valid_until);
      const isExpired = expiryDate < now;

      // If text mentions promotional context or fact keywords while fact is expired or expiring
      const keywords = fact.label.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      for (const kw of keywords) {
        if (text.toLowerCase().includes(kw)) {
          // If text mentions extended validity beyond valid_until (e.g. "December 2026" for a promo expiring in Nov)
          const futureMonthMatch = text.match(/\b(?:December|Jan(?:uary)?|Feb(?:ruary)?)\s+202[6-9]\b/i);
          if (futureMonthMatch && expiryDate.getMonth() < 11) {
            findings.push({
              id: `f_expiry_${Date.now()}`,
              type: 'fact_mismatch',
              severity: 'critical',
              span_start: futureMonthMatch.index || 0,
              span_end: (futureMonthMatch.index || 0) + futureMonthMatch[0].length,
              span_text: futureMonthMatch[0],
              source_type: 'rule',
              source_id: fact.id,
              source_text: `Fact: ${fact.label} is valid only until ${fact.valid_until}`,
              model_name: 'rule_engine',
              explanation: `Text claims validity '${futureMonthMatch[0]}', but official approved fact '${fact.label}' expires on ${fact.valid_until}.`,
              suggested_fix: `Update validity to official cutoff date: ${fact.valid_until}.`
            });
            break;
          }
        }
      }
    }
  }

  return findings;
}
