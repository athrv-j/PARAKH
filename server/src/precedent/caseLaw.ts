import { VaultDb, PrecedentRecord } from '../db/vaultDb.js';

export interface PrecedentMatch {
  precedent: PrecedentRecord;
  similarity_score: number;
  precedent_applies: boolean;
  needs_human_confirmation: boolean;
  rationale: string;
}

export interface ConflictingPrecedentPair {
  clause_id: string;
  precedent_a: PrecedentRecord;
  precedent_b: PrecedentRecord;
  conflict_summary: string;
}

/**
 * Computes a deterministic local pseudo-embedding vector for semantic similarity.
 * Runs 100% locally on CPU without external API calls to safeguard privacy.
 */
export function computeLocalEmbedding(text: string, dimensions = 64): number[] {
  const vector = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words = normalized.split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1;
  }

  // Normalize to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(v => Number((v / magnitude).toFixed(4)));
}

/**
 * Computes cosine similarity between two unit-normalized embedding vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, Number(dotProduct.toFixed(4))));
}

export class BrandCaseLawService {
  private vault: VaultDb;

  constructor(vault: VaultDb) {
    this.vault = vault;
  }

  /**
   * Retrieves applicable precedents for a clause and draft snippet,
   * filtering out expired decisions and ranking by cosine similarity.
   */
  findApplicablePrecedents(
    clientId: string,
    clauseId: string,
    draftSnippet: string,
    options?: { minSimilarity?: number }
  ): PrecedentMatch[] {
    const allPrecedents = this.vault.getPrecedents(clientId, clauseId);
    const now = new Date();
    const queryVec = computeLocalEmbedding(draftSnippet);
    const minSim = options?.minSimilarity ?? 0.15;

    const matches: PrecedentMatch[] = [];

    for (const prec of allPrecedents) {
      // 1. Expiry Check: Expired precedents never automatically apply
      if (prec.expiry) {
        const expiryDate = new Date(prec.expiry);
        if (expiryDate < now) {
          continue; // Expired, skip from active recommendations
        }
      }

      // 2. Similarity Ranking
      const precVec = prec.embedding ? JSON.parse(prec.embedding) : computeLocalEmbedding(prec.reason);
      const similarity = cosineSimilarity(queryVec, precVec);

      if (similarity >= minSim || allPrecedents.length <= 3) {
        matches.push({
          precedent: prec,
          similarity_score: similarity,
          precedent_applies: true,
          needs_human_confirmation: true, // Never auto-pass!
          rationale: `Matched precedent ${prec.id} decided by ${prec.decided_by}: "${prec.reason}".`
        });
      }
    }

    return matches.sort((a, b) => b.similarity_score - a.similarity_score);
  }

  /**
   * Detects conflicting precedents across the client's guideline clauses.
   * (e.g. Clause C-3.2 where one precedent accepted an exception and another dismissed it).
   */
  detectConflictingPrecedents(clientId: string): ConflictingPrecedentPair[] {
    const precedents = this.vault.getPrecedents(clientId);
    const byClause: Record<string, PrecedentRecord[]> = {};

    for (const p of precedents) {
      if (!byClause[p.clause_id]) {
        byClause[p.clause_id] = [];
      }
      byClause[p.clause_id].push(p);
    }

    const conflicts: ConflictingPrecedentPair[] = [];

    for (const [clauseId, list] of Object.entries(byClause)) {
      if (list.length < 2) continue;

      // Check for opposing decisions (e.g. exception/accepted vs dismissed)
      const allowedDecisions = list.filter(p => p.decision === 'accepted' || p.decision === 'exception');
      const rejectedDecisions = list.filter(p => p.decision === 'dismissed');

      if (allowedDecisions.length > 0 && rejectedDecisions.length > 0) {
        conflicts.push({
          clause_id: clauseId,
          precedent_a: allowedDecisions[0],
          precedent_b: rejectedDecisions[0],
          conflict_summary: `Contradictory rulings on Clause ${clauseId}: ${allowedDecisions[0].decided_by} permitted an exception ("${allowedDecisions[0].reason}"), whereas ${rejectedDecisions[0].decided_by} strictly dismissed it ("${rejectedDecisions[0].reason}").`
        });
      }
    }

    return conflicts;
  }
}
