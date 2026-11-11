import { VaultDb, PrecedentRecord } from '../db/vaultDb.js';

export interface PrecedentMatch {
  precedent: PrecedentRecord;
  similarity_score: number;
  precedent_applies: boolean;
  needs_human_confirmation: boolean;
  rationale: string;
  is_quote_verified: boolean;
  verified_quote?: string;
  channel_scope_matched: boolean;
  is_expired: boolean;
  has_conflict: boolean;
  conflict_details?: string;
}

export interface ConflictingPrecedentPair {
  clause_id: string;
  precedent_a: PrecedentRecord;
  precedent_b: PrecedentRecord;
  conflict_summary: string;
}

export interface LayeredRetrievalOptions {
  channel?: string;
  minSimilarity?: number;
  includeExpired?: boolean;
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

/**
 * Extracts verbatim key quotes or operative phrases from a precedent's reason.
 * E.g. phrases inside quotes: 'daily equivalent interest rate', '100% natural and chemical-free', 'voted Best Diagnostic Lab'
 */
export function extractPrecedentKeyPhrases(reason: string): string[] {
  const quotes: string[] = [];
  // 1. Quoted text '...' or "..."
  const quoteRegex = /['"]([^'"]{3,60})['"]/g;
  let match;
  while ((match = quoteRegex.exec(reason)) !== null) {
    if (match[1] && match[1].trim()) {
      quotes.push(match[1].trim());
    }
  }

  // 2. Common operative keywords/phrases
  const terms = [
    'chemical-free',
    'natural',
    'daily interest',
    'apr',
    'award',
    'methodology',
    'discount',
    'cure',
    'bridge funding',
    'disclaimer',
    '0.03%',
    '11.5%',
    'pocket-friendly',
    'emergency'
  ];
  for (const term of terms) {
    if (reason.toLowerCase().includes(term) && !quotes.some(q => q.toLowerCase().includes(term))) {
      quotes.push(term);
    }
  }

  return quotes;
}

/**
 * Verifies whether the draft text actually quotes or contains the operative exception from the precedent.
 */
export function verifyPrecedentQuote(draftSnippet: string, reason: string): { isVerified: boolean; quote?: string } {
  const candidateQuotes = extractPrecedentKeyPhrases(reason);
  const normalizedSnippet = draftSnippet.toLowerCase();

  for (const q of candidateQuotes) {
    if (normalizedSnippet.includes(q.toLowerCase())) {
      return { isVerified: true, quote: q };
    }
  }

  // Check word overlap for composite phrases
  for (const q of candidateQuotes) {
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matchedCount = words.filter(w => normalizedSnippet.includes(w)).length;
    if (words.length > 1 && matchedCount >= words.length * 0.75) {
      return { isVerified: true, quote: q };
    }
  }

  return { isVerified: false };
}

/**
 * Validates channel compatibility between a precedent's scope and the draft's distribution channel.
 */
export function isChannelCompatible(precedentScope: string, draftChannel?: string): boolean {
  if (!draftChannel) return true;
  const scope = precedentScope.toLowerCase().trim();
  const channel = draftChannel.toLowerCase().trim();

  if (scope === 'all' || scope === 'all_content' || scope === 'any') return true;

  // Exact match
  if (scope === channel || scope === `channel:${channel}`) return true;

  // Social channel family
  const socialChannels = ['social', 'instagram', 'facebook', 'youtube', 'linkedin', 'twitter', 'x'];
  const isDraftSocial = socialChannels.includes(channel);
  const isPrecedentSocial = socialChannels.some(s => scope.includes(s));

  if (isDraftSocial && isPrecedentSocial) return true;

  // Email channel family
  if (channel.includes('email') && scope.includes('email')) return true;

  // Print/PR family
  if ((channel.includes('print') || channel.includes('pr')) && (scope.includes('print') || scope.includes('pr'))) return true;

  return false;
}

export class BrandCaseLawService {
  private vault: VaultDb;

  constructor(vault: VaultDb) {
    this.vault = vault;
  }

  /**
   * Layered Precedent Retrieval Pipeline:
   * Layer 1: Filter by client, clause, channel scope, and expiration status
   * Layer 2: Rank by semantic cosine similarity
   * Layer 3: Verify candidate matches by quoting the precedent (Citation Gate for Precedents)
   * Layer 4: Detect contradictory / conflicting rulings and enforce human confirmation
   */
  findApplicablePrecedents(
    clientId: string,
    clauseId: string,
    draftSnippet: string,
    options?: LayeredRetrievalOptions
  ): PrecedentMatch[] {
    const allPrecedents = this.vault.getPrecedents(clientId, clauseId);
    const now = new Date();
    const queryVec = computeLocalEmbedding(draftSnippet);
    const minSim = options?.minSimilarity ?? 0.15;
    const includeExpired = options?.includeExpired ?? false;
    const channel = options?.channel;

    // Detect all conflicts for this client to annotate matches
    const allConflicts = this.detectConflictingPrecedents(clientId);
    const clauseConflict = allConflicts.find(c => c.clause_id === clauseId);

    const matches: PrecedentMatch[] = [];

    for (const prec of allPrecedents) {
      // ----------------------------------------------------
      // Layer 1: Expiry & Channel Scope Check
      // ----------------------------------------------------
      let isExpired = false;
      if (prec.expiry) {
        const expiryDate = new Date(prec.expiry);
        if (expiryDate < now) {
          isExpired = true;
          if (!includeExpired) {
            // Expired precedents do not recommend active exceptions
            continue;
          }
        }
      }

      const channelMatched = isChannelCompatible(prec.scope, channel);

      // ----------------------------------------------------
      // Layer 2: Semantic Similarity
      // ----------------------------------------------------
      const precVec = prec.embedding ? JSON.parse(prec.embedding) : computeLocalEmbedding(prec.reason);
      let similarity = cosineSimilarity(queryVec, precVec);

      // ----------------------------------------------------
      // Layer 3: Quote Verification (Precedent Citation Gate)
      // ----------------------------------------------------
      const quoteCheck = verifyPrecedentQuote(draftSnippet, prec.reason);

      if (quoteCheck.isVerified) {
        similarity = Math.min(1.0, similarity + 0.25);
      } else if (!channelMatched) {
        similarity = Math.max(0, similarity - 0.2);
      }

      // Filter out low-confidence false matches
      if (similarity < minSim && !quoteCheck.isVerified && allPrecedents.length > 2) {
        continue;
      }

      // ----------------------------------------------------
      // Layer 4: Conflict Tagging & Synthesis
      // ----------------------------------------------------
      const hasConflict = Boolean(clauseConflict);
      let conflictSummary: string | undefined;
      if (hasConflict && clauseConflict) {
        conflictSummary = clauseConflict.conflict_summary;
      }

      let rationale = `Matched precedent ${prec.id} decided by ${prec.decided_by}: "${prec.reason}".`;
      if (quoteCheck.isVerified) {
        rationale += ` [Verified Quote: "${quoteCheck.quote}"]`;
      }
      if (!channelMatched && channel) {
        rationale += ` [Scope Warning: Approved for ${prec.scope}, but draft is on ${channel}]`;
      }
      if (isExpired) {
        rationale += ` [EXPIRED PRECEDENT: Expired on ${prec.expiry}]`;
      }

      const precedentApplies = !isExpired && (prec.decision === 'accepted' || prec.decision === 'exception');

      matches.push({
        precedent: prec,
        similarity_score: Number(similarity.toFixed(3)),
        precedent_applies: precedentApplies,
        needs_human_confirmation: true, // Always enforce human agency!
        rationale,
        is_quote_verified: quoteCheck.isVerified,
        verified_quote: quoteCheck.quote,
        channel_scope_matched: channelMatched,
        is_expired: isExpired,
        has_conflict: hasConflict,
        conflict_details: conflictSummary
      });
    }

    // Sort by verified quote first, then descending similarity score
    return matches.sort((a, b) => {
      if (a.is_quote_verified && !b.is_quote_verified) return -1;
      if (!a.is_quote_verified && b.is_quote_verified) return 1;
      return b.similarity_score - a.similarity_score;
    });
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
