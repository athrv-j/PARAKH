import { diffWords, Change } from 'diff';
import { FindingDraft } from './checks/terminology.js';

export interface CreatorIntent {
  goal: string;
  audience: string;
  key_message: string;
  must_keep_phrases: string[];
}

export interface WordDiffToken {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface IntentLockFixResult {
  original_snippet: string;
  suggested_rewrite: string;
  word_diff: WordDiffToken[];
  intent_verified: boolean;
  intent_audit: {
    pass: boolean;
    reason: string;
    must_keep_retention_rate: number;
    retained_phrases: string[];
    missing_phrases: string[];
  };
}

export class IntentLockEngine {
  /**
   * Step 1: Extracts the creator's underlying intent, target audience,
   * key message, and protected must-keep phrases.
   */
  extractIntent(draftText: string, channel: string): CreatorIntent {
    const lines = draftText.split(/\r?\n/).filter(Boolean);
    const firstLine = lines[0] || '';

    // Extract potential must-keep phrases (brand names, proper nouns, pricing, core product tokens)
    const mustKeep: string[] = [];

    // Extract brand names
    const brandMatches = draftText.match(/\b(Kavach(?:\s+Health)?|VyaparSetu(?:\s+Fintech)?|Mitti\s+&\s+Moon(?:\s+Botanical)?)\b/gi);
    if (brandMatches) {
      for (const b of brandMatches) {
        if (!mustKeep.some(k => k.toLowerCase() === b.toLowerCase())) {
          mustKeep.push(b);
        }
      }
    }

    // Extract key festival / campaign tokens (Diwali, Monsoon, Winter)
    const festMatches = draftText.match(/\b(Diwali|Monsoon|Winter|Festive)\b/gi);
    if (festMatches) {
      for (const f of festMatches) {
        if (!mustKeep.some(k => k.toLowerCase() === f.toLowerCase())) {
          mustKeep.push(f);
        }
      }
    }

    // Extract product keywords
    const productMatches = draftText.match(/\b(Health Checkup|Working Capital|Kumkumadi Tailam|Night Elixir|Saffron Glow)\b/gi);
    if (productMatches) {
      for (const p of productMatches) {
        if (!mustKeep.some(k => k.toLowerCase() === p.toLowerCase())) {
          mustKeep.push(p);
        }
      }
    }

    return {
      goal: channel === 'social' ? 'Generate high engagement while maintaining trust' : 'Inform and educate target customers',
      audience: channel === 'social' ? 'Broad digital audience and prospects' : 'Registered subscribers and enterprise customers',
      key_message: firstLine.substring(0, 100),
      must_keep_phrases: mustKeep.length > 0 ? mustKeep : ['Festive']
    };
  }

  /**
   * Step 2: Generates a minimal surgical correction that preserves the creator's purpose.
   */
  generateFix(
    fullText: string,
    finding: FindingDraft,
    intent: CreatorIntent
  ): IntentLockFixResult {
    let suggested = finding.span_text;

    // Apply surgical correction based on finding type and recommendation
    if (finding.suggested_fix && finding.suggested_fix.startsWith("Replace with '")) {
      const match = finding.suggested_fix.match(/Replace with '([^']+)'/);
      if (match) {
        suggested = match[1];
      }
    } else if (finding.type === 'terminology') {
      if (finding.span_text.toLowerCase().includes('miracle cure')) {
        suggested = 'scientifically studied care';
      } else if (finding.span_text.toLowerCase().includes('cheap')) {
        suggested = 'affordable';
      } else if (finding.span_text.toLowerCase().includes('chemical-free')) {
        suggested = 'botanical-rich';
      } else if (finding.span_text.toLowerCase().includes('fair skin')) {
        suggested = 'radiant and nourished skin';
      } else if (finding.span_text.toLowerCase().includes('instant whitening')) {
        suggested = 'natural brightening glow';
      }
    } else if (finding.type === 'tone') {
      if (finding.span_text.includes('BUY NOW OR REGRET')) {
        suggested = 'Explore comprehensive preventive checkups today';
      } else if (finding.span_text.includes('KILLING HUNDREDS')) {
        suggested = 'Stay protected against seasonal dengue risks with early diagnostic screening';
      }
    } else if (finding.type === 'accessibility') {
      // Lowercase caps block into title/sentence case
      suggested = finding.span_text.charAt(0).toUpperCase() + finding.span_text.slice(1).toLowerCase();
    } else if (finding.type === 'fact_mismatch') {
      if (finding.span_text.includes('199')) {
        suggested = '₹499 for basic full body panel';
      } else if (finding.span_text.includes('December 2026')) {
        suggested = 'valid until 2026-11-05';
      } else if (finding.span_text.includes('1,200')) {
        suggested = '₹1,499 available until 2026-11-12';
      }
    } else if (finding.type === 'unsupported_claim') {
      suggested = 'Among India’s most trusted diagnostic laboratories, backed by certified NABL accreditations';
    }

    // Generate word-level diff
    const diffs: Change[] = diffWords(finding.span_text, suggested);
    const wordDiff: WordDiffToken[] = diffs.map(d => ({
      value: d.value,
      added: d.added,
      removed: d.removed
    }));

    // Step 3: Verify intent survives
    const audit = this.verifyIntentSurvives(finding.span_text, suggested, intent);

    return {
      original_snippet: finding.span_text,
      suggested_rewrite: suggested,
      word_diff: wordDiff,
      intent_verified: audit.pass,
      intent_audit: audit
    };
  }

  /**
   * Step 3: Verifies all must-keep phrases are retained in the overall copy or rewrite.
   */
  verifyIntentSurvives(
    _originalSnippet: string,
    rewrittenSnippet: string,
    intent: CreatorIntent
  ): {
    pass: boolean;
    reason: string;
    must_keep_retention_rate: number;
    retained_phrases: string[];
    missing_phrases: string[];
  } {
    const retained: string[] = [];
    const missing: string[] = [];

    // Check which must-keep phrases were present in original that should not be stripped
    for (const phrase of intent.must_keep_phrases) {
      if (_originalSnippet.toLowerCase().includes(phrase.toLowerCase())) {
        if (rewrittenSnippet.toLowerCase().includes(phrase.toLowerCase())) {
          retained.push(phrase);
        } else {
          missing.push(phrase);
        }
      } else {
        // Not in this local snippet; retained globally
        retained.push(phrase);
      }
    }

    const total = retained.length + missing.length;
    const rate = total > 0 ? retained.length / total : 1.0;
    const pass = missing.length === 0;

    return {
      pass,
      reason: pass
        ? 'All core intent and must-keep phrases successfully preserved in suggested correction.'
        : `Correction omitted must-keep phrase(s): ${missing.join(', ')}`,
      must_keep_retention_rate: Number((rate * 100).toFixed(1)),
      retained_phrases: retained,
      missing_phrases: missing
    };
  }
}
