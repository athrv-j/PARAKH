import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DocketLabel } from '../components/DocketLabel.tsx';
import { RubberStamp } from '../components/RubberStamp.tsx';
import { emitToast } from '../components/ToastContainer.tsx';
import { springs } from '../motion';

export interface AmbiguityClauseItem {
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
  isHealed?: boolean;
}

interface GuidelineDebuggerProps {
  clientId: string;
  clientName: string;
  onAcceptRewrite?: (clauseId: string, newText: string) => void;
}

// Initial demo clauses with rich historical precedents
const INITIAL_CLAUSES: AmbiguityClauseItem[] = [
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
];

// ============================================================================
// ANIMATED COUNT-UP NUMBER HOOK
// ============================================================================
function useCountUp(targetValue: number, duration: number = 750): number {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = targetValue;
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // High-end deceleration easing
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Number((start + (end - start) * ease).toFixed(1));
      setValue(current);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        prevRef.current = end;
      }
    };

    const reqId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(reqId);
  }, [targetValue, duration]);

  return value;
}

// ============================================================================
// WORD-BY-WORD ANIMATED REWRITE DIFF COMPONENT
// Unrolls the proposed rewrite word by word with intent-lock highlights
// ============================================================================
const WordByWordDiff: React.FC<{
  text: string;
  originalText: string;
  onComplete?: () => void;
}> = ({ text }) => {
  const words = text.split(' ');

  return (
    <div
      style={{
        fontSize: '0.96rem',
        lineHeight: 1.7,
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-paper-light)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px 6px'
      }}
    >
      {words.map((word, idx) => {
        // Highlight critical clarifying constraints
        const isKeyConstraint =
          word.includes('11.5%') ||
          word.includes('prominently') ||
          word.includes('ONLY') ||
          word.includes('secondary') ||
          word.includes('testimonial') ||
          word.includes('footnote') ||
          word.includes('clinical') ||
          word.includes('sign-off');

        return (
          <motion.span
            key={idx}
            initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: 0.32,
              delay: 0.15 + idx * 0.035,
              ease: [0.19, 1, 0.22, 1]
            }}
            style={{
              display: 'inline-block',
              color: isKeyConstraint ? 'var(--color-verified-green)' : 'var(--color-paper-light)',
              fontWeight: isKeyConstraint ? 700 : 500,
              backgroundColor: isKeyConstraint ? 'rgba(47, 191, 113, 0.14)' : 'transparent',
              padding: isKeyConstraint ? '0 4px' : '0',
              borderRadius: isKeyConstraint ? '3px' : '0',
              borderBottom: isKeyConstraint ? '1.5px solid var(--color-verified-green)' : 'none'
            }}
          >
            {word}
          </motion.span>
        );
      })}
    </div>
  );
};

// ============================================================================
// CLAUSE STRIP ITEM COMPONENT (Fades in, red stain count-up, layout expansion, heal)
// ============================================================================
const ClauseStripItem: React.FC<{
  clause: AmbiguityClauseItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onAccept: (clauseId: string) => void;
  clientId: string;
}> = ({ clause, index, isSelected, onSelect, onAccept, clientId }) => {
  const animatedScore = useCountUp(clause.ambiguity_score, 800);
  const isHealed = !!clause.isHealed;

  // Red stain intensity is tied directly to the animated ambiguity score.
  // When healed, stain fades smoothly down to 0.
  const rawIntensity = Math.min(1, animatedScore / 60);
  const stainIntensity = isHealed ? 0 : rawIntensity;

  const [isShaking, setIsShaking] = useState(false);
  const [showStamp, setShowStamp] = useState(false);
  const [impactData, setImpactData] = useState<null | {
    total_drafts_checked: number;
    drafts_with_findings_before: number;
    drafts_with_findings_after: number;
    findings_resolved: number;
    net_improvement: number;
    affected_drafts: Array<{ draft_id: string; draft_title: string; findings_before: number; findings_after: number; delta: number }>;
  }>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayError, setReplayError] = useState('');

  const handlePreviewImpact = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!clause.proposed_rewrite) return;
    setReplayLoading(true);
    setReplayError('');
    try {
      const token = localStorage.getItem('parakh_auth_token');
      const res = await fetch(`/api/review/clients/${clientId}/debugger/replay-impact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ clauseId: clause.clause_id, proposedText: clause.proposed_rewrite })
      });
      const data = await res.json();
      if (data.success && data.impact) {
        setImpactData(data.impact);
      } else {
        setReplayError('Could not load impact data.');
      }
    } catch {
      setReplayError('Network error loading impact preview.');
    } finally {
      setReplayLoading(false);
    }
  };

  const handleAcceptClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStamp(true);
    setIsShaking(true);

    setTimeout(() => {
      setIsShaking(false);
    }, 380);

    setTimeout(() => {
      onAccept(clause.clause_id);
    }, 450);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <motion.div
      layout
      transition={{ layout: springs.soft, opacity: { duration: 0.45, delay: index * 0.1 }, y: { duration: 0.45, delay: index * 0.1 } }}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        x: isShaking ? [0, -2, 2, -2, 1, 0] : 0
      }}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-expanded={isSelected}
      aria-label={`Clause ${clause.clause_id}, Ambiguity score ${clause.ambiguity_score}. Press Enter to toggle details.`}
      style={{
        position: 'relative',
        borderRadius: '8px',
        padding: '1.25rem',
        cursor: 'pointer',
        overflow: 'hidden',
        outline: 'none',
        backgroundColor: isHealed
          ? 'rgba(47, 191, 113, 0.07)'
          : isSelected
          ? 'var(--color-ink-card)'
          : '#16181F',
        border: `2px solid ${
          isHealed
            ? 'var(--color-verified-green)'
            : isSelected
            ? 'var(--color-stamp-red)'
            : 'var(--color-docket-border)'
        }`,
        boxShadow: isHealed
          ? '0 0 24px rgba(47, 191, 113, 0.3)'
          : isSelected
          ? '0 8px 25px rgba(215, 38, 61, 0.28)'
          : 'var(--shadow-card)',
        transition: 'border-color 0.4s ease, box-shadow 0.4s ease, background-color 0.4s ease'
      }}
    >
      {/* AUTHENTIC WORN PAPER RED STAIN WATERMARK: Bleeds in as score counts up, fades out when healed */}
      <motion.div
        animate={{
          opacity: stainIntensity,
          scale: 0.8 + stainIntensity * 0.4
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: '-25px',
          right: '-25px',
          width: '130px',
          height: '130px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-stamp-red)',
          filter: 'blur(28px)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* SECONDARY IRREGULAR INK SPLATTER BLEED */}
      <motion.div
        animate={{
          opacity: stainIntensity * 0.5,
          scale: 0.7 + stainIntensity * 0.5
        }}
        transition={{ duration: 0.85, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          bottom: '-15px',
          left: '25%',
          width: '80px',
          height: '60px',
          borderRadius: '60% 40% 70% 30% / 40% 60% 30% 70%',
          backgroundColor: 'var(--color-stamp-red)',
          filter: 'blur(20px)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* RATIFIED RUBBER STAMP SLAM OVERLAY */}
      {showStamp && (
        <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 30 }}>
          <RubberStamp type="RATIFIED" animate={true} />
        </div>
      )}

      {/* HEADER: Clause ID, Category, and Live Counting Ambiguity Score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isHealed ? 'var(--color-verified-green)' : 'var(--color-highlighter)', fontSize: '0.88rem' }}>
            CLAUSE {clause.clause_id} (v{clause.version})
          </span>
          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase' }}>
            • {clause.category}
          </span>
        </div>

        {/* AMBIGUITY SCORE PILL: Counts up on entrance, decreases when healed */}
        <motion.span
          animate={{
            scale: isHealed ? [1, 1.15, 1] : 1
          }}
          transition={springs.soft}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.76rem',
            padding: '3px 10px',
            borderRadius: '4px',
            backgroundColor: isHealed
              ? 'rgba(47, 191, 113, 0.18)'
              : clause.ambiguity_score > 40
              ? 'rgba(215, 38, 61, 0.2)'
              : 'rgba(255, 214, 10, 0.2)',
            color: isHealed
              ? 'var(--color-verified-green)'
              : clause.ambiguity_score > 40
              ? '#FF7A7A'
              : 'var(--color-highlighter)',
            border: `1px solid ${
              isHealed
                ? 'var(--color-verified-green)'
                : clause.ambiguity_score > 40
                ? 'rgba(215, 38, 61, 0.6)'
                : 'rgba(255, 214, 10, 0.6)'
            }`,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          {isHealed ? '✓ HEALED' : `AMBIGUITY: ${animatedScore}`}
        </motion.span>
      </div>

      {/* CURRENT CLAUSE TEXT */}
      <p
        style={{
          fontSize: '0.92rem',
          color: 'var(--color-paper-light)',
          lineHeight: 1.55,
          margin: '0.6rem 0',
          position: 'relative',
          zIndex: 2,
          fontFamily: 'var(--font-sans)'
        }}
      >
        {clause.current_text}
      </p>

      {/* METRIC CHIPS: Flags, Dismissals, Override Rate */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.76rem',
          color: 'var(--color-steel)',
          marginTop: '0.75rem',
          position: 'relative',
          zIndex: 2,
          fontFamily: 'var(--font-mono)'
        }}
      >
        <span>Flags: <strong style={{ color: 'var(--color-paper-light)' }}>{clause.flags_count}</strong></span>
        <span>Dismissals: <strong style={{ color: 'var(--color-paper-light)' }}>{clause.dismissals_count}</strong></span>
        <span>Override: <strong style={{ color: isHealed ? 'var(--color-verified-green)' : '#FFD60A' }}>{(clause.override_rate * 100).toFixed(0)}%</strong></span>
        {clause.conflicts_count > 0 && !isHealed && (
          <span style={{ color: 'var(--color-stamp-red)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
            ⚠️ 1 Conflict Pair
          </span>
        )}
      </div>

      {/* EXPANDED ACCORDION REGION WITH LAYOUT ANIMATION (Reveals Precedent Evidence & Proposed Rewrite) */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              layout: springs.soft,
              opacity: { duration: 0.35 },
              height: { duration: 0.4, ease: [0.19, 1, 0.22, 1] }
            }}
            style={{
              overflow: 'hidden',
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px dashed var(--color-docket-border)',
              position: 'relative',
              zIndex: 2
            }}
          >
            {/* CONTRADICTORY PRECEDENTS ALERT BANNER */}
            {clause.conflicts_count > 0 && !isHealed && (
              <div
                style={{
                  backgroundColor: 'rgba(215, 38, 61, 0.1)',
                  border: '1px solid var(--color-stamp-red)',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{ color: 'var(--color-stamp-red)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  ⚠️ Contradictory Brand Decisions Recorded:
                </div>
                <div style={{ color: 'var(--color-paper-light)', lineHeight: 1.45 }}>
                  Reviewers have reached opposing interpretations on this rule across live campaigns. A disambiguated rewrite resolves this conflict permanently.
                </div>
              </div>
            )}

            {/* HISTORICAL OVERRIDE EVIDENCE */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: 'var(--color-highlighter)',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                  letterSpacing: '1px'
                }}
              >
                Historical Precedent Evidence ({clause.evidence_examples.length} citations):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {clause.evidence_examples.map((ev, evIdx) => (
                  <motion.div
                    key={evIdx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + evIdx * 0.08 }}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid var(--color-docket-border)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '5px',
                      fontSize: '0.82rem',
                      lineHeight: 1.5,
                      fontStyle: 'italic',
                      color: 'var(--color-paper-light)'
                    }}
                  >
                    {ev}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* PROPOSED REWRITE: UNROLLS WORD BY WORD */}
            {clause.proposed_rewrite && !isHealed && (
              <div
                style={{
                  backgroundColor: 'rgba(47, 191, 113, 0.08)',
                  border: '1.5px solid var(--color-verified-green)',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-verified-green)', textTransform: 'uppercase' }}>
                    PROPOSED CLARIFICATION (VERSION {clause.version + 1}):
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-steel)' }}>Synthesized from precedent evidence</span>
                </div>

                {/* WORD BY WORD ANIMATED REWRITE DIFF */}
                <WordByWordDiff
                  text={clause.proposed_rewrite}
                  originalText={clause.current_text}
                />
              </div>
            )}

            {/* ACCEPT REWRITE BUTTON */}
            {isHealed ? (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(47, 191, 113, 0.15)',
                  border: '1px solid var(--color-verified-green)',
                  color: 'var(--color-verified-green)',
                  fontWeight: 700,
                  borderRadius: '5px',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                ✓ RATIFIED & DEPLOYED // Active Version {clause.version} in Brand Vault
              </div>
            ) : (
              <>
                {/* IMPACT REPLAY PANEL */}
                {clause.proposed_rewrite && (
                  <div style={{ marginBottom: '1rem' }}>
                    {!impactData ? (
                      <button
                        className="btn"
                        style={{
                          width: '100%',
                          padding: '0.6rem 1rem',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(255, 214, 10, 0.08)',
                          border: '1px dashed var(--color-highlighter)',
                          color: 'var(--color-highlighter)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          marginBottom: '0.75rem'
                        }}
                        onClick={handlePreviewImpact}
                        disabled={replayLoading}
                        aria-label="Preview impact of this rewrite on stored drafts"
                      >
                        {replayLoading ? '⏳ Running impact analysis...' : '🔬 Preview Impact on Stored Drafts (Before Accepting)'}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid var(--color-docket-border)',
                          borderRadius: '6px',
                          padding: '1rem',
                          marginBottom: '0.75rem'
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-highlighter)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '1px' }}>
                          📊 IMPACT REPLAY — {impactData.total_drafts_checked} Draft{impactData.total_drafts_checked !== 1 ? 's' : ''} Analysed
                        </div>

                        {/* Summary Row */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '120px', backgroundColor: 'rgba(215, 38, 61, 0.1)', border: '1px solid rgba(215,38,61,0.4)', borderRadius: '5px', padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-steel)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Findings Before</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FF7A7A', fontFamily: 'var(--font-mono)' }}>{impactData.drafts_with_findings_before}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-steel)' }}>drafts flagged</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', fontSize: '1.2rem', color: 'var(--color-steel)' }}>→</div>
                          <div style={{ flex: 1, minWidth: '120px', backgroundColor: 'rgba(47, 191, 113, 0.1)', border: '1px solid rgba(47,191,113,0.4)', borderRadius: '5px', padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-steel)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Findings After</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-verified-green)', fontFamily: 'var(--font-mono)' }}>{impactData.drafts_with_findings_after}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-steel)' }}>drafts flagged</div>
                          </div>
                          <div style={{ flex: 1, minWidth: '120px', backgroundColor: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.4)', borderRadius: '5px', padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-steel)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Net Resolved</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-highlighter)', fontFamily: 'var(--font-mono)' }}>+{impactData.findings_resolved}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-steel)' }}>findings cleared</div>
                          </div>
                        </div>

                        {/* Per-draft table */}
                        {impactData.affected_drafts.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Affected Drafts:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {impactData.affected_drafts.map(d => (
                                <div key={d.draft_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '4px 6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                  <span style={{ color: 'var(--color-paper-light)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.draft_title}</span>
                                  <span style={{ fontFamily: 'var(--font-mono)', color: d.delta < 0 ? 'var(--color-verified-green)' : d.delta > 0 ? '#FF7A7A' : 'var(--color-steel)', fontWeight: 600, marginLeft: '8px', flexShrink: 0 }}>
                                    {d.findings_before}→{d.findings_after} {d.delta < 0 ? `(${d.delta})` : d.delta > 0 ? `(+${d.delta})` : '(no change)'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                    {replayError && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-stamp-red)', marginBottom: '0.5rem' }}>{replayError}</div>
                    )}
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onClick={handleAcceptClick}
                  aria-label={`Accept rewrite as version ${clause.version + 1}`}
                >
                  🏛️ Accept Rewrite as Version {clause.version + 1} (Ratify Rule)
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// MAIN GUIDELINE DEBUGGER VIEW
// ============================================================================
export const GuidelineDebuggerView: React.FC<GuidelineDebuggerProps> = ({
  clientId,
  clientName,
  onAcceptRewrite
}) => {
  const [clauses, setClauses] = useState<AmbiguityClauseItem[]>(INITIAL_CLAUSES);
  const [selectedClauseId, setSelectedClauseId] = useState<string>('C-3.2');

  // Synchronize with backend API if available
  useEffect(() => {
    fetch(`/api/review/clients/${clientId}/debugger`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.reports && data.reports.length > 0) {
          const apiClauses: AmbiguityClauseItem[] = data.reports.map((r: any) => ({
            clause_id: r.clause_id,
            category: r.category || 'general',
            current_text: r.current_text,
            version: r.version || 1,
            flags_count: r.flags_count || 10,
            dismissals_count: r.dismissals_count || 3,
            exceptions_count: r.exceptions_count || 2,
            conflicts_count: r.conflicts_count || 0,
            ambiguity_score: r.ambiguity_score || 35,
            override_rate: r.override_rate || 0.4,
            evidence_examples: r.evidence_examples || [],
            proposed_rewrite: r.proposed_rewrite
          }));
          setClauses(apiClauses);
        }
      })
      .catch(() => {});
  }, [clientId]);

  const handleAccept = (clauseId: string) => {
    const clause = clauses.find(c => c.clause_id === clauseId);
    if (!clause || !clause.proposed_rewrite) return;

    // Send accept request to backend API
    fetch(`/api/review/clients/${clientId}/debugger/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clauseId: clause.clause_id,
        newText: clause.proposed_rewrite,
        acceptedBy: 'Brand Governance Lead'
      })
    }).catch(() => {});

    // Update local state: stain fades out, score decreases, clause is marked healed
    setClauses(prev =>
      prev.map(c =>
        c.clause_id === clauseId
          ? {
              ...c,
              current_text: c.proposed_rewrite!,
              version: c.version + 1,
              ambiguity_score: Number((c.ambiguity_score * 0.15).toFixed(1)),
              conflicts_count: 0,
              isHealed: true
            }
          : c
      )
    );

    // Purposeful spring-in toast confirming rule ratification
    emitToast({
      type: 'ratified',
      title: `RULE RATIFIED // CLAUSE ${clause.clause_id}`,
      message: `Disambiguated clarification v${clause.version + 1} permanently deployed to ${clientName}'s brand vault.`
    });

    if (onAcceptRewrite) {
      onAcceptRewrite(clause.clause_id, clause.proposed_rewrite);
    }
  };

  const selectedClause = clauses.find(c => c.clause_id === selectedClauseId) || clauses[0];
  const healedCount = clauses.filter(c => c.isHealed).length;
  const totalClauses = clauses.length;

  return (
    <div
      className="debugger-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '1rem 2rem'
      }}
    >
      {/* TOP HEADER WITH DOCKET LABEL AND HEALED COUNTER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <DocketLabel docketId="GUIDELINE-DEBUGGER" clientName={clientName} category="governance_insights" />
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.85rem',
              marginTop: '0.2rem',
              color: 'var(--color-paper-light)'
            }}
          >
            Guideline Debugger & Ambiguity Wall
          </h1>
          <p style={{ color: 'var(--color-steel)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Scores clause ambiguity from reviewer overrides, recurring dismissals, and contradictory precedents. Expand a clause to inspect historical evidence and ratify disambiguated rewrites.
          </p>
        </div>

        {/* HEALTH METRICS PILL */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'var(--color-ink-card)',
            padding: '0.6rem 1.1rem',
            borderRadius: '6px',
            border: '1px solid var(--color-docket-border)'
          }}
        >
          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase' }}>
            RULE HEALTH:
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: healedCount === totalClauses ? 'var(--color-verified-green)' : 'var(--color-highlighter)'
            }}
          >
            {healedCount} / {totalClauses} CLAUSES HEALED
          </span>
        </div>
      </div>

      {/* TWO-COLUMN WALL OF AMBIGUOUS CLAUSES WITH MASTER DOSSIER */}
      <div
        className="debugger-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(360px, 1.15fr) minmax(360px, 1fr)',
          gap: '1.75rem',
          alignItems: 'start'
        }}
      >
        {/* LEFT COLUMN: THE AMBIGUITY WALL (EXPANDABLE CLAUSE STRIPS) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--color-steel)',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              RANKED AMBIGUITY INDEX // SELECT TO EXPAND
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-steel)' }}>
              Keyboard: <kbd style={{ padding: '1px 5px', background: 'var(--color-ink-card)', border: '1px solid var(--color-docket-border)', borderRadius: '3px' }}>Tab</kbd> + <kbd style={{ padding: '1px 5px', background: 'var(--color-ink-card)', border: '1px solid var(--color-docket-border)', borderRadius: '3px' }}>Enter</kbd>
            </span>
          </div>

          {/* LIST OF CLAUSE STRIPS WITH SMOOTH GLIDING LAYOUT ANIMATIONS */}
          {clauses.map((clause, idx) => (
            <ClauseStripItem
              key={clause.clause_id}
              clause={clause}
              index={idx}
              isSelected={clause.clause_id === selectedClauseId}
              onSelect={() => setSelectedClauseId(clause.clause_id)}
              onAccept={handleAccept}
              clientId={clientId}
            />
          ))}
        </div>

        {/* RIGHT COLUMN: EVIDENCE DOSSIER & REAL-TIME PREVIEW OF SELECTED CLAUSE */}
        <motion.div
          layout
          transition={{ layout: springs.soft }}
          className="paper-sheet"
          style={{
            padding: '2rem',
            minHeight: '520px',
            color: 'var(--color-ink)',
            position: 'sticky',
            top: '20px'
          }}
        >
          <div style={{ borderBottom: '1px solid #D5CDBE', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#7A756B', textTransform: 'uppercase', letterSpacing: '1px' }}>
              DEBUGGER EVIDENCE DOSSIER // CLAUSE {selectedClause.clause_id}
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', marginTop: '0.25rem', color: '#101114' }}>
              Governance Clarification Synthesis
            </h2>
          </div>

          {/* ACTIVE RULE STATE */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#7A756B', textTransform: 'uppercase', marginBottom: '4px' }}>
              Active Brand Rule (Version {selectedClause.version}):
            </div>
            <div
              style={{
                fontSize: '0.94rem',
                lineHeight: 1.6,
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                padding: '0.75rem 1rem',
                borderRadius: '5px',
                borderLeft: `3px solid ${selectedClause.isHealed ? 'var(--color-verified-green)' : 'var(--color-stamp-red)'}`,
                color: '#101114'
              }}
            >
              "{selectedClause.current_text}"
            </div>
          </div>

          {/* HISTORICAL CITATIONS BREAKDOWN */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#7A756B', textTransform: 'uppercase', marginBottom: '4px' }}>
              Audit Signals Recorded:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.03)', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#101114' }}>
                  {selectedClause.flags_count}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#7A756B' }}>FLAGS</div>
              </div>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.03)', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#101114' }}>
                  {selectedClause.dismissals_count}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#7A756B' }}>DISMISSALS</div>
              </div>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.03)', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: selectedClause.isHealed ? 'var(--color-verified-green)' : '#D7263D' }}>
                  {(selectedClause.override_rate * 100).toFixed(0)}%
                </div>
                <div style={{ fontSize: '0.65rem', color: '#7A756B' }}>OVERRIDE RATE</div>
              </div>
            </div>
          </div>

          {/* HISTORICAL EVIDENCE EXAMPLES */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#7A756B', textTransform: 'uppercase', marginBottom: '6px' }}>
              Recorded Case Precedents:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedClause.evidence_examples.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    fontStyle: 'italic',
                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '4px',
                    border: '1px solid #D5CDBE',
                    color: '#2B2F38'
                  }}
                >
                  {ev}
                </div>
              ))}
            </div>
          </div>

          {/* ACTION STATUS IN DOSSIER */}
          {selectedClause.isHealed ? (
            <div
              style={{
                padding: '0.85rem',
                backgroundColor: 'rgba(47, 191, 113, 0.15)',
                border: '1.5px solid var(--color-verified-green)',
                borderRadius: '6px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--color-verified-green)'
              }}
            >
              ✓ AMENDMENT RATIFIED // Active Version {selectedClause.version} Deployed to Client Vault
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.88rem', fontWeight: 700 }}
              onClick={() => handleAccept(selectedClause.clause_id)}
            >
              🏛️ Ratify Version {selectedClause.version + 1} Rewrite
            </button>
          )}
        </motion.div>
      </div>

      {/* Responsive Breakpoint Styles for 360px, 768px, and 1280px */}
      <style>{`
        @media (max-width: 860px) {
          .debugger-container {
            padding: 0.85rem 0.85rem !important;
            gap: 1.25rem !important;
          }
          .debugger-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
        }
        @media (max-width: 480px) {
          .debugger-container {
            padding: 0.5rem 0.5rem !important;
            gap: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
};
