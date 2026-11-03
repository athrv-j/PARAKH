import React, { useState } from 'react';
import { DocketLabel } from '../components/DocketLabel.tsx';

interface AmbiguityClauseItem {
  clause_id: string;
  category: string;
  current_text: string;
  version: number;
  flags_count: number;
  dismissals_count: number;
  exceptions_count: number;
  conflicts_count: number;
  ambiguity_score: number;
  override_rate: number;
  evidence_examples: string[];
  proposed_rewrite?: string;
}

interface GuidelineDebuggerProps {
  clientId: string;
  clientName: string;
  onAcceptRewrite?: (clauseId: string, newText: string) => void;
}

export const GuidelineDebuggerView: React.FC<GuidelineDebuggerProps> = ({
  clientName,
  onAcceptRewrite
}) => {
  const [clauses, setClauses] = useState<AmbiguityClauseItem[]>([
    {
      clause_id: 'C-3.2',
      category: 'claims',
      current_text: 'Price figures, discounts and loan interest rates must exactly match the approved promotional fact sheet with valid expiry dates.',
      version: 1,
      flags_count: 14,
      dismissals_count: 5,
      exceptions_count: 4,
      conflicts_count: 1,
      ambiguity_score: 59.5,
      override_rate: 0.64,
      evidence_examples: [
        '[Rohit Verma, Brand Lead (accepted)]: "Allowed showing daily equivalent interest rate (0.03% daily) instead of annual APR in Instagram reel thumbnail for simplicity."',
        '[Sneha Kapur, Head of Legal (dismissed)]: "Rejected daily interest rate in Facebook ad because compliance officer insisted statutory annual APR (11.5%) must always be prominently displayed."'
      ],
      proposed_rewrite: 'Display statutory annual percentage rate (11.5% APR floor) prominently on all digital ad creatives; daily equivalent interest rates (e.g. 0.03% daily) are permitted ONLY as secondary explanatory captions.'
    },
    {
      clause_id: 'C-2.1',
      category: 'terminology',
      current_text: 'Never use unapproved claims like miracle cure or chemical-free without scientific qualification.',
      version: 1,
      flags_count: 11,
      dismissals_count: 3,
      exceptions_count: 3,
      conflicts_count: 1,
      ambiguity_score: 45.5,
      override_rate: 0.55,
      evidence_examples: [
        '[Priya Nambiar, Social Media Director (exception)]: "Allowed phrase 100% natural and chemical-free in customer quote testimonial graphic as it was a direct user quote."',
        '[Aarav Mehta, Brand Governance Manager (dismissed)]: "Strictly denied chemical-free claim in founder story email, citing scientific accuracy guidelines."'
      ],
      proposed_rewrite: 'The phrase chemical-free is strictly prohibited in brand claims, but permitted within direct verbatim customer testimonial quotes provided a clarifying footnote defines cold-pressed botanical extracts.'
    },
    {
      clause_id: 'C-1.2',
      category: 'tone',
      current_text: "Avoid aggressive sales hyperbole such as 'BUY NOW OR REGRET' or excessive exclamation marks. Maximum one exclamation mark per copy.",
      version: 1,
      flags_count: 8,
      dismissals_count: 2,
      exceptions_count: 1,
      conflicts_count: 0,
      ambiguity_score: 22.0,
      override_rate: 0.27,
      evidence_examples: [
        '[Dr. Anita Roy, CMO (exception)]: "Urgent seasonal awareness campaign requires emphatic headline to alert patients."'
      ],
      proposed_rewrite: 'Avoid aggressive sales hyperbole; single exclamation point allowed for urgent clinical awareness campaigns with Medical Officer sign-off.'
    }
  ]);

  const [selectedClauseId, setSelectedClauseId] = useState<string>('C-3.2');
  const [acceptedClauseId, setAcceptedClauseId] = useState<string | null>(null);

  const selectedClause = clauses.find(c => c.clause_id === selectedClauseId) || clauses[0];

  const handleAccept = () => {
    if (!selectedClause.proposed_rewrite) return;

    setClauses(prev =>
      prev.map(c =>
        c.clause_id === selectedClause.clause_id
          ? {
              ...c,
              current_text: c.proposed_rewrite!,
              version: c.version + 1,
              ambiguity_score: Number((c.ambiguity_score * 0.2).toFixed(1)),
              conflicts_count: 0
            }
          : c
      )
    );

    setAcceptedClauseId(selectedClause.clause_id);
    if (onAcceptRewrite) {
      onAcceptRewrite(selectedClause.clause_id, selectedClause.proposed_rewrite);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '1.5rem'
      }}
    >
      <div>
        <DocketLabel docketId="GUIDELINE-DEBUGGER" clientName={clientName} category="governance_insights" />
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginTop: '0.25rem', color: 'var(--color-paper-light)' }}>
          Guideline Debugger & Ambiguity Wall
        </h1>
        <p style={{ color: 'var(--color-steel)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Scores clause ambiguity from override rates, recurring dismissals, and conflicting Brand Case Law precedents. Proposes clearer rules synthesized from real evidence.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 1fr) minmax(440px, 1.4fr)',
          gap: '2rem',
          alignItems: 'start'
        }}
      >
        {/* LEFT: WORN-PAPER WALL OF AMBIGUOUS CLAUSES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <span className="docket-label">RANKED AMBIGUITY INDEX</span>

          {clauses.map(clause => {
            const isSelected = clause.clause_id === selectedClauseId;
            // Calculate wear level (opacity and stain intensity)
            const wearIntensity = Math.min(1, clause.ambiguity_score / 60);

            return (
              <div
                key={clause.clause_id}
                onClick={() => setSelectedClauseId(clause.clause_id)}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--color-ink-card)' : '#16181D',
                  border: `2px solid ${
                    isSelected ? 'var(--color-stamp-red)' : 'var(--color-docket-border)'
                  }`,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 6px 20px rgba(215, 38, 61, 0.25)' : 'none'
                }}
              >
                {/* Worn paper red-stain watermark */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    backgroundColor: `rgba(215, 38, 61, ${wearIntensity * 0.15})`,
                    filter: 'blur(20px)',
                    pointerEvents: 'none'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-highlighter)', fontSize: '0.85rem' }}>
                    CLAUSE {clause.clause_id} (v{clause.version})
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      backgroundColor: clause.ambiguity_score > 40 ? 'var(--color-stamp-red-bg)' : 'rgba(255, 214, 10, 0.15)',
                      color: clause.ambiguity_score > 40 ? '#FF8A8A' : 'var(--color-highlighter)',
                      fontWeight: 700
                    }}
                  >
                    AMBIGUITY: {clause.ambiguity_score}
                  </span>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--color-paper-light)', lineHeight: 1.5, margin: '0.5rem 0' }}>
                  {clause.current_text}
                </p>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-steel)', marginTop: '0.75rem' }}>
                  <span>Flags: <strong>{clause.flags_count}</strong></span>
                  <span>Dismissals: <strong>{clause.dismissals_count}</strong></span>
                  <span>Override Rate: <strong>{(clause.override_rate * 100).toFixed(0)}%</strong></span>
                  {clause.conflicts_count > 0 && (
                    <span style={{ color: 'var(--color-stamp-red)', fontWeight: 700 }}>
                      ⚠️ 1 Conflict Pair
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: EVIDENCE DOSSIER & REWRITE PROPOSAL */}
        <div
          className="paper-sheet"
          style={{
            padding: '2rem',
            minHeight: '520px',
            color: 'var(--color-ink)'
          }}
        >
          <div style={{ borderBottom: '1px solid #d8d2c6', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <span className="docket-label" style={{ color: '#6A6F7B' }}>
              DEBUGGER EVIDENCE DOSSIER // CLAUSE {selectedClause.clause_id}
            </span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginTop: '0.25rem' }}>
              Guideline Clarification Analysis
            </h2>
          </div>

          {/* Conflict Alert Banner if conflicts exist */}
          {selectedClause.conflicts_count > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(215, 38, 61, 0.08)',
                border: '1px solid var(--color-stamp-red)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.85rem'
              }}
            >
              <strong style={{ color: 'var(--color-stamp-red)' }}>⚠️ Contradictory Case Law Precedents Detected:</strong>
              <p style={{ marginTop: '0.25rem', color: '#333' }}>
                Reviewers have reached conflicting decisions on this clause across campaigns. A clear rewrite is required to eliminate ambiguity.
              </p>
            </div>
          )}

          {/* Concrete Overridden Evidence List */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#5A5F6E', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Historical Override Evidence ({selectedClause.evidence_examples.length} precedents):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {selectedClause.evidence_examples.map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    border: '1px solid #dcd6ca',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '4px',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                    fontStyle: 'italic'
                  }}
                >
                  {ev}
                </div>
              ))}
            </div>
          </div>

          {/* AI Proposed Rewrite */}
          {selectedClause.proposed_rewrite && (
            <div
              style={{
                backgroundColor: 'rgba(47, 191, 113, 0.08)',
                border: '1.5px solid var(--color-verified-green)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-verified-green)', textTransform: 'uppercase' }}>
                  PROPOSED CLEARER REWRITE (VERSION {selectedClause.version + 1}):
                </span>
                <span style={{ fontSize: '0.72rem', color: '#5A5F6E' }}>Synthesized from precedent evidence</span>
              </div>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.6, color: 'var(--color-ink)' }}>
                "{selectedClause.proposed_rewrite}"
              </p>
            </div>
          )}

          {acceptedClauseId === selectedClause.clause_id ? (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--color-verified-bg)',
                color: 'var(--color-verified-green)',
                fontWeight: 700,
                borderRadius: '4px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)'
              }}
            >
              ✓ Rewrite Accepted! Active Version {selectedClause.version} Deployed to Client Vault.
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
              onClick={handleAccept}
            >
              🏛️ Accept Rewrite as Version {selectedClause.version + 1}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
