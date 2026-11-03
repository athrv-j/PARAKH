import { TermRecord } from '../../db/vaultDb.js';

export interface FindingDraft {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  span_start: number;
  span_end: number;
  span_text: string;
  source_type: 'rule' | 'ai' | 'precedent';
  source_id?: string;
  source_text: string;
  model_name?: string;
  explanation: string;
  suggested_fix?: string;
}

/**
 * Checks draft text against client's banned and preferred terminology
 * using strict word boundaries and case-insensitivity.
 */
export function checkTerminology(text: string, terms: TermRecord[]): FindingDraft[] {
  const findings: FindingDraft[] = [];

  for (const termRecord of terms) {
    if (termRecord.type === 'banned') {
      // Escape regex special chars
      const escaped = termRecord.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');

      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        findings.push({
          id: `f_term_${match.index}_${Date.now()}`,
          type: 'terminology',
          severity: 'high',
          span_start: match.index,
          span_end: match.index + match[0].length,
          span_text: match[0],
          source_type: 'rule',
          source_id: termRecord.id,
          source_text: termRecord.term,
          model_name: 'rule_engine',
          explanation: `Banned terminology '${termRecord.term}' detected. Company guidelines prohibit this phrasing.`,
          suggested_fix: termRecord.replacement ? `Replace with '${termRecord.replacement}'` : undefined
        });
      }
    }
  }

  return findings;
}
