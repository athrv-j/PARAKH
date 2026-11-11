import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { springs } from '../motion';
import { RubberStamp, StampType } from '../components/RubberStamp.tsx';
import { WordDiffViewer } from '../components/WordDiffViewer.tsx';
import { PrecedentDrawer } from '../components/PrecedentDrawer.tsx';
import { GovernanceGyroscope } from '../components/GovernanceGyroscope.tsx';
import { emitToast } from '../components/ToastContainer.tsx';
import { ComplianceCertificateModal } from '../components/ComplianceCertificateModal.tsx';

export interface FindingUI {
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
  word_diff?: Array<{ value: string; added?: boolean; removed?: boolean }>;
  from_cache?: boolean;
  precedent?: {
    precedent: {
      id: string;
      clause_id: string;
      decision: string;
      reason: string;
      scope: string;
      expiry?: string | null;
      decided_by: string;
    };
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
  } | null;
  applicable_precedents?: any[];
  status: 'pending' | 'accepted' | 'dismissed' | 'exception_requested';
}

interface ReviewWorkspaceProps {
  clientId: string;
  clientName: string;
  draftId: string;
  title: string;
  channel: string;
  initialText: string;
  initialFindings: FindingUI[];
  aiStatus?: 'available' | 'unavailable' | 'cached';
  aiNotice?: string | null;
  fromCache?: boolean;
  onDraftApproved?: () => void;
  onNewReviewRequested?: () => void;
}

// ============================================================================
// ANIMATED COUNT-UP NUMBER COMPONENT
// Counts up smoothly from 0 on load or from previous value with cubic easing
// ============================================================================
export const CountUpNumber: React.FC<{
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  startFromZero?: boolean;
}> = ({ value, duration = 600, prefix = '', suffix = '', startFromZero = true }) => {
  const [displayValue, setDisplayValue] = useState(startFromZero ? 0 : value);
  const prevValueRef = useRef(startFromZero ? 0 : value);

  useEffect(() => {
    const start = prevValueRef.current;
    const end = value;
    if (start === end && displayValue === end) return;

    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // High-end editorial cubic-out easing
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        prevValueRef.current = end;
      }
    };

    const reqId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(reqId);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({
  clientName,
  draftId,
  title,
  channel,
  initialText,
  initialFindings,
  aiStatus,
  aiNotice,
  fromCache,
  onDraftApproved,
  onNewReviewRequested
}) => {
  const [draftContent, setDraftContent] = useState(initialText);
  const [findings, setFindings] = useState<FindingUI[]>(initialFindings);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(initialFindings[0]?.id || null);
  const [hoveredFindingId, setHoveredFindingId] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [swipedDirections, setSwipedDirections] = useState<Record<string, 'left' | 'right'>>({});

  // Stamp slam, 2px screen shake, and ink burst state
  const [isShaking, setIsShaking] = useState(false);
  const [showInkBurst, setShowInkBurst] = useState(false);
  const [stampState, setStampState] = useState<{ visible: boolean; type: StampType; animate: boolean }>({
    visible: false,
    type: 'APPROVED',
    animate: false
  });
  const prefersReducedMotion = useReducedMotion();

  // Precedent Drawer State
  const [isPrecedentDrawerOpen, setIsPrecedentDrawerOpen] = useState(false);
  const [drawerClauseId, setDrawerClauseId] = useState('C-1.1');
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // SVG Connector Coordinates
  const containerRef = useRef<HTMLDivElement>(null);
  const [connectorCoords, setConnectorCoords] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  // Initialize and auto-flip cards where a precedent applies
  useEffect(() => {
    setDraftContent(initialText);
    setFindings(initialFindings);
    if (initialFindings.length > 0) {
      setActiveFindingId(initialFindings[0].id);
    }

    // Auto-flip cards that have precedent rules after cards spring in
    const timer = setTimeout(() => {
      const flips: Record<string, boolean> = {};
      initialFindings.forEach(f => {
        if (f.source_type === 'precedent') {
          flips[f.id] = true;
        }
      });
      setFlippedCards(flips);
    }, 700);

    return () => clearTimeout(timer);
  }, [initialText, initialFindings]);

  // Recalculate SVG connector line between hovered/active finding card and text span
  const updateConnectorCoords = useCallback(() => {
    const targetId = hoveredFindingId || activeFindingId;
    if (!targetId || !containerRef.current) {
      setConnectorCoords(null);
      return;
    }

    const spanEl = document.getElementById(`span-finding-${targetId}`);
    const cardEl = document.getElementById(`card-finding-${targetId}`);

    if (spanEl && cardEl && containerRef.current) {
      const contRect = containerRef.current.getBoundingClientRect();
      const spanRect = spanEl.getBoundingClientRect();
      const cardRect = cardEl.getBoundingClientRect();

      setConnectorCoords({
        startX: spanRect.right - contRect.left,
        startY: spanRect.top + spanRect.height / 2 - contRect.top,
        endX: cardRect.left - contRect.left,
        endY: cardRect.top + 34 - contRect.top
      });
    } else {
      setConnectorCoords(null);
    }
  }, [hoveredFindingId, activeFindingId]);

  useEffect(() => {
    updateConnectorCoords();
    window.addEventListener('resize', updateConnectorCoords, { passive: true });
    window.addEventListener('scroll', updateConnectorCoords, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', updateConnectorCoords);
      window.removeEventListener('scroll', updateConnectorCoords, true);
    };
  }, [updateConnectorCoords, findings, draftContent]);

  // Keyboard shortcuts (A = Accept, D = Dismiss)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        return;
      }

      const active = findings.find(f => f.id === activeFindingId && f.status === 'pending');
      if (!active) return;

      if (e.key === 'a' || e.key === 'A') {
        handleAcceptFix(active.id);
      } else if (e.key === 'd' || e.key === 'D') {
        handleDismiss(active.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFindingId, findings, draftContent]);

  // Accept fix: swipes card to the left and applies suggested copy fix
  const handleAcceptFix = (findingId: string) => {
    setSwipedDirections(prev => ({ ...prev, [findingId]: 'left' }));
    const finding = findings.find(f => f.id === findingId);
    if (finding && finding.suggested_fix) {
      const updatedText = draftContent.replace(finding.span_text, finding.suggested_fix);
      setDraftContent(updatedText);
    }

    setTimeout(() => {
      setFindings(prev =>
        prev.map(f => (f.id === findingId ? { ...f, status: 'accepted' as const } : f))
      );
    }, 120);
  };

  // Dismiss issue: swipes card to the right
  const handleDismiss = (findingId: string) => {
    setSwipedDirections(prev => ({ ...prev, [findingId]: 'right' }));
    setTimeout(() => {
      setFindings(prev =>
        prev.map(f => (f.id === findingId ? { ...f, status: 'dismissed' as const } : f))
      );
    }, 120);
  };

  // 3D Flip on Y-axis to reveal precedent
  const handleToggleFlip = (findingId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFlippedCards(prev => ({ ...prev, [findingId]: !prev[findingId] }));
  };

  const handleOpenPrecedentModal = (finding: FindingUI) => {
    setDrawerClauseId(finding.source_id || 'C-1.1');
    setIsPrecedentDrawerOpen(true);
  };

  const handleSavePrecedent = (data: { reason: string; scope: string; expiry: string; decidedBy: string }) => {
    if (activeFindingId) {
      handleDismiss(activeFindingId);
    }
    setIsPrecedentDrawerOpen(false);
    emitToast({
      type: 'precedent',
      title: `BINDING PRECEDENT FILED // ${drawerClauseId}`,
      message: `Exception precedent filed for ${clientName}: "${data.reason}". Valid through ${data.expiry} across ${data.scope}.`
    });
  };

  // Approval triggers stamp slam, 2px screen shake, and ink burst
  const handleApproveDraft = () => {
    setStampState({ visible: true, type: 'APPROVED', animate: !prefersReducedMotion });

    // Impact timing: at 160ms, the stamp collides with the parchment,
    // triggering the 2px screen shake and outward ink burst (skipped for reduced motion)
    if (!prefersReducedMotion) {
      setTimeout(() => {
        setIsShaking(true);
        setShowInkBurst(true);
      }, 160);

      setTimeout(() => {
        setIsShaking(false);
      }, 520);

      setTimeout(() => {
        setShowInkBurst(false);
      }, 1400);
    }

    // Purposeful spring-in toast confirming approval
    setTimeout(() => {
      emitToast({
        type: 'approval',
        title: `DOCKET PRK-${draftId.replace('draft_', '').toUpperCase()} APPROVED`,
        message: `Draft copy "${title}" officially sealed with verified compliance docket for ${clientName}.`
      });
    }, 280);

    if (onDraftApproved) {
      setTimeout(onDraftApproved, 950);
    }
  };

  const pendingFindings = findings.filter(f => f.status === 'pending');
  const resolvedCount = findings.filter(f => f.status !== 'pending').length;
  const isAllResolved = pendingFindings.length === 0;

  // Compliance score percentage (e.g. 67% -> 78% -> 100%)
  const totalFindings = Math.max(1, findings.length);
  const complianceScore = Math.round(
    isAllResolved ? 100 : Math.min(99, 60 + Math.round((resolvedCount / totalFindings) * 39))
  );

  // Render copy text with staggered highlighter sweeps
  const renderHighlightedCopy = () => {
    if (pendingFindings.length === 0) {
      return <span>{draftContent}</span>;
    }

    type Segment = { text: string; finding?: FindingUI; index: number; findingIndex: number };
    const segments: Segment[] = [];
    const remaining = draftContent;
    let cursor = 0;

    // Find occurrences of pending findings in text
    const occurrences: { start: number; end: number; finding: FindingUI }[] = [];
    pendingFindings.forEach(f => {
      const idx = remaining.indexOf(f.span_text);
      if (idx !== -1) {
        occurrences.push({
          start: idx,
          end: idx + f.span_text.length,
          finding: f
        });
      }
    });

    // Sort by appearance in copy
    occurrences.sort((a, b) => a.start - b.start);

    occurrences.forEach((occ, fIdx) => {
      if (occ.start > cursor) {
        segments.push({
          text: remaining.substring(cursor, occ.start),
          index: cursor,
          findingIndex: -1
        });
      }
      segments.push({
        text: occ.finding.span_text,
        finding: occ.finding,
        index: occ.start,
        findingIndex: fIdx
      });
      cursor = occ.end;
    });

    if (cursor < remaining.length) {
      segments.push({
        text: remaining.substring(cursor),
        index: cursor,
        findingIndex: -1
      });
    }

    return (
      <>
        {segments.map((seg, sIdx) => {
          if (!seg.finding) {
            return <span key={`text-${sIdx}`}>{seg.text}</span>;
          }

          const f = seg.finding;
          const isTarget = hoveredFindingId === f.id || activeFindingId === f.id;
          const isPrecedentFinding = f.source_type === 'precedent';

          return (
            <span
              key={`span-${f.id}`}
              id={`span-finding-${f.id}`}
              style={{
                position: 'relative',
                display: 'inline-block',
                padding: '0 4px',
                margin: '0 2px',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#101114',
                zIndex: 1
              }}
              onClick={() => setActiveFindingId(f.id)}
              onMouseEnter={() => setHoveredFindingId(f.id)}
              onMouseLeave={() => setHoveredFindingId(null)}
              tabIndex={0}
              role="button"
              aria-label={`Flagged issue: ${f.span_text}`}
            >
              {/* STAGGERED HIGHLIGHTER SWEEP: Expands left-to-right across text */}
              <motion.span
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{
                  duration: 0.58,
                  delay: 0.18 + seg.findingIndex * 0.16,
                  ease: [0.19, 1, 0.22, 1]
                }}
                style={{
                  position: 'absolute',
                  inset: '-1px -2px -2px -2px',
                  transformOrigin: '0% 50%',
                  backgroundColor:
                    f.severity === 'critical'
                      ? 'rgba(215, 38, 61, 0.32)'
                      : isPrecedentFinding
                      ? 'rgba(255, 183, 3, 0.38)'
                      : 'rgba(255, 214, 10, 0.44)',
                  borderBottom: isTarget
                    ? '2.5px solid var(--color-stamp-red)'
                    : f.severity === 'critical'
                    ? '2px solid rgba(215, 38, 61, 0.85)'
                    : isPrecedentFinding
                    ? '2px solid rgba(255, 183, 3, 0.9)'
                    : '2px solid rgba(255, 214, 10, 0.85)',
                  borderRadius: '3px',
                  boxShadow: isTarget ? '0 0 12px rgba(255, 214, 10, 0.45)' : 'none',
                  zIndex: -1
                }}
              />
              {seg.text}
            </span>
          );
        })}
      </>
    );
  };

  return (
    <div
      className="review-workspace-container"
      style={{
        width: '100%',
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '1rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}
    >
      {/* TOP CONTROL BAR: Header, Status, and Live Count-Up Metrics */}
      <motion.div
        layout
        transition={{ layout: springs.soft }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--color-ink-card)',
          padding: '0.85rem 1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--color-docket-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <span
              style={{
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-steel)',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              DOCKET {draftId.replace('draft_', 'PRK-')} • {clientName}
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.35rem',
                color: 'var(--color-paper-light)',
                margin: '0.1rem 0 0 0'
              }}
            >
              {title}
            </h2>
          </div>

          <span
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--color-paper-light)',
              textTransform: 'uppercase'
            }}
          >
            📢 {channel}
          </span>

          {fromCache && (
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                backgroundColor: 'rgba(0, 180, 216, 0.15)',
                color: '#00b4d8',
                border: '1px solid rgba(0, 180, 216, 0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              ⚡ CACHED ANALYSIS
            </span>
          )}

          {/* Animated Status Pill with Count-Up Numbers */}
          <motion.span
            layout
            transition={{ layout: springs.soft }}
            style={{
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              backgroundColor: isAllResolved ? 'rgba(47, 191, 113, 0.15)' : 'rgba(215, 38, 61, 0.15)',
              color: isAllResolved ? 'var(--color-verified-green)' : 'var(--color-stamp-red)',
              border: `1px solid ${isAllResolved ? 'var(--color-verified-green)' : 'var(--color-stamp-red)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isAllResolved ? (
              <>✓ ALL ISSUES RESOLVED (<CountUpNumber value={resolvedCount} />)</>
            ) : (
              <>
                ⚠️ <CountUpNumber value={pendingFindings.length} /> PENDING ISSUES
                <span style={{ opacity: 0.65, fontSize: '0.7rem' }}>
                  • <CountUpNumber value={resolvedCount} /> RESOLVED
                </span>
              </>
            )}
          </motion.span>

          {/* Live Compliance Score Gauge with Count-Up Percentage */}
          <motion.div
            layout
            transition={{ layout: springs.soft }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)' }}>
              COMPLIANCE:
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: isAllResolved ? 'var(--color-verified-green)' : 'var(--color-highlighter)'
              }}
            >
              <CountUpNumber value={complianceScore} suffix="%" />
            </span>
          </motion.div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Quick Precedent Toggle for all applicable cards */}
          <button
            className="btn btn-outline"
            onClick={() => {
              const anyFlipped = Object.values(flippedCards).some(Boolean);
              if (anyFlipped) {
                setFlippedCards({});
              } else {
                const flips: Record<string, boolean> = {};
                findings.forEach(f => {
                  flips[f.id] = true;
                });
                setFlippedCards(flips);
              }
            }}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            title="Flip cards to view precedent rulings"
          >
            ⚖️ Flip Precedent Cards
          </button>

          {onNewReviewRequested && (
            <button
              className="btn btn-outline"
              onClick={onNewReviewRequested}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            >
              + Upload Another Copy
            </button>
          )}

          <button
            className="btn btn-outline"
            onClick={() => setShowCertificateModal(true)}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Inspect tamper-evident compliance audit certificate"
          >
            📜 Compliance Docket
          </button>

          <button
            className={`btn ${isAllResolved ? 'btn-success' : 'btn-primary'}`}
            onClick={handleApproveDraft}
            style={{ fontSize: '0.82rem', padding: '0.45rem 1.1rem', fontWeight: 700 }}
            aria-label="Stamp and approve copy"
          >
            🏛️ Stamp & Approve Copy
          </button>
        </div>
      </motion.div>

      {/* MAIN TWO-COLUMN SPLIT WITH ANIMATED SVG CONNECTOR OVERLAY */}
      <div
        ref={containerRef}
        className="review-workspace-grid"
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'minmax(400px, 1.2fr) minmax(360px, 1fr)',
          gap: '1.5rem',
          alignItems: 'start'
        }}
      >
        {/* ANIMATED SVG CONNECTOR: Draws dynamically from card to flagged span on hover */}
        <AnimatePresence>
          {connectorCoords && (
            <svg
              className="connector-svg"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 25,
                overflow: 'visible'
              }}
            >
              <defs>
                <linearGradient id="connectorGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D7263D" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#FFD60A" stopOpacity="1" />
                  <stop offset="100%" stopColor="#FFD60A" stopOpacity="0.85" />
                </linearGradient>
              </defs>

              {/* Glowing soft aura line */}
              <motion.path
                key={`glow-${hoveredFindingId || activeFindingId}`}
                d={`M ${connectorCoords.startX} ${connectorCoords.startY} C ${connectorCoords.startX + Math.max(50, (connectorCoords.endX - connectorCoords.startX) * 0.45)} ${connectorCoords.startY}, ${connectorCoords.endX - Math.max(50, (connectorCoords.endX - connectorCoords.startX) * 0.45)} ${connectorCoords.endY}, ${connectorCoords.endX} ${connectorCoords.endY}`}
                fill="none"
                stroke="rgba(255, 214, 10, 0.3)"
                strokeWidth="6"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />

              {/* Animated sharp laser connector path */}
              <motion.path
                key={`line-${hoveredFindingId || activeFindingId}`}
                d={`M ${connectorCoords.startX} ${connectorCoords.startY} C ${connectorCoords.startX + Math.max(50, (connectorCoords.endX - connectorCoords.startX) * 0.45)} ${connectorCoords.startY}, ${connectorCoords.endX - Math.max(50, (connectorCoords.endX - connectorCoords.startX) * 0.45)} ${connectorCoords.endY}, ${connectorCoords.endX} ${connectorCoords.endY}`}
                fill="none"
                stroke="url(#connectorGlow)"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Start anchor circle (on text span) */}
              <motion.circle
                cx={connectorCoords.startX}
                cy={connectorCoords.startY}
                r="5"
                fill="#D7263D"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.4, 1] }}
                transition={{ duration: 0.2 }}
              />
              <motion.circle
                cx={connectorCoords.startX}
                cy={connectorCoords.startY}
                r="9"
                fill="none"
                stroke="#D7263D"
                strokeWidth="1.5"
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* End anchor circle (on finding card) */}
              <motion.circle
                cx={connectorCoords.endX}
                cy={connectorCoords.endY}
                r="5.5"
                fill="#FFD60A"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.4, 1] }}
                transition={{ duration: 0.2, delay: 0.08 }}
              />
              <motion.circle
                cx={connectorCoords.endX}
                cy={connectorCoords.endY}
                r="10"
                fill="none"
                stroke="#FFD60A"
                strokeWidth="1.5"
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
              />
            </svg>
          )}
        </AnimatePresence>

        {/* LEFT COLUMN: THE EVALUATED COPY PAPER WITH 2px SCREEN SHAKE */}
        <motion.div
          layout
          animate={
            isShaking
              ? {
                  x: [0, -2, 2, -2, 2, -1, 1, 0],
                  y: [0, 2, -2, 1, -2, 1, -1, 0]
                }
              : { x: 0, y: 0 }
          }
          transition={{ duration: 0.35, ease: 'easeInOut', layout: springs.soft }}
          style={{
            backgroundColor: '#F7F3EB',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            border: '1px solid #D5CDBE',
            padding: '2rem',
            position: 'relative',
            minHeight: '460px',
            color: '#1A1C22',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden'
          }}
        >
          {/* SLAMMED RUBBER STAMP OVERLAY */}
          {stampState.visible && (
            <div style={{ position: 'absolute', top: '26px', right: '26px', zIndex: 20 }}>
              <RubberStamp type={stampState.type} animate={stampState.animate} />
            </div>
          )}

          {/* INK BURST: Particles & Expanding Shockwaves at Stamp Collision Center */}
          {showInkBurst && (
            <div
              style={{
                position: 'absolute',
                top: '56px',
                right: '115px',
                pointerEvents: 'none',
                zIndex: 35
              }}
            >
              {/* Expanding ink shockwave ring */}
              <motion.div
                initial={{ scale: 0.1, opacity: 0.95 }}
                animate={{ scale: [0.1, 1.8, 2.6], opacity: [0.95, 0.5, 0] }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  border: '3px solid var(--color-stamp-red)',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 16px rgba(215, 38, 61, 0.6)'
                }}
              />

              {/* Secondary dashed shockwave */}
              <motion.div
                initial={{ scale: 0.1, opacity: 0.8 }}
                animate={{ scale: [0.1, 1.3, 1.9], opacity: [0.8, 0.3, 0] }}
                transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
                style={{
                  position: 'absolute',
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  border: '1.5px dashed var(--color-stamp-red)',
                  transform: 'translate(-50%, -50%)'
                }}
              />

              {/* 24 outward ink droplets */}
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i / 24) * 2 * Math.PI + ((i % 3) * 0.15);
                const distance = 35 + (i % 6) * 12 + ((i * 13) % 20);
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                const size = 2.5 + (i % 4) * 1.8;

                return (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, scale: 0.5, opacity: 1 }}
                    animate={{
                      x,
                      y,
                      scale: [0.5, 1.5, size > 4 ? 1 : 0],
                      opacity: [1, 0.9, size > 4 ? 0.8 : 0]
                    }}
                    transition={{
                      duration: 0.65 + (i % 4) * 0.12,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    style={{
                      position: 'absolute',
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-stamp-red)',
                      boxShadow: '0 0 6px rgba(215, 38, 61, 0.7)',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                );
              })}
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: '#7A756B',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
                letterSpacing: '1px'
              }}
            >
              COPY PREVIEW // CITATION-GATED TEXT
            </div>

            <div
              style={{
                fontSize: '1.12rem',
                lineHeight: 1.85,
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'pre-wrap',
                color: '#1A1C22'
              }}
            >
              {renderHighlightedCopy()}
            </div>
          </div>

          <div
            style={{
              marginTop: '2.5rem',
              paddingTop: '1rem',
              borderTop: '1px dashed #D5CDBE',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.78rem',
              color: '#7A756B',
              fontFamily: 'var(--font-mono)'
            }}
          >
            <span>CHANNEL: {channel.toUpperCase()}</span>
            <span>GOVERNANCE: STRICT CITATION ENFORCED</span>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: FINDINGS DOCKET WITH GLIDING LAYOUT ANIMATIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <motion.div
            layout
            transition={{ layout: springs.soft }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                color: 'var(--color-steel)',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              COMPLIANCE AUDIT // <CountUpNumber value={pendingFindings.length} /> PENDING
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-highlighter)' }}>
              Swipe or Keys: <kbd style={{ padding: '1px 5px', background: 'var(--color-ink-card)', border: '1px solid var(--color-docket-border)', borderRadius: '3px' }}>A</kbd> Accept • <kbd style={{ padding: '1px 5px', background: 'var(--color-ink-card)', border: '1px solid var(--color-docket-border)', borderRadius: '3px' }}>D</kbd> Dismiss
            </span>
          </motion.div>

          {aiStatus === 'unavailable' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                backgroundColor: 'rgba(235, 168, 52, 0.12)',
                border: '1px solid rgba(235, 168, 52, 0.4)',
                color: 'var(--color-highlighter, #eba834)',
                padding: '0.65rem 1rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                lineHeight: 1.4
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <div>
                <strong>AI checks unavailable:</strong> {aiNotice || 'Displaying rule-based findings. Deterministic safety rules and fact mismatch protections remain active.'}
              </div>
            </motion.div>
          )}

          {/* AnimatePresence mode="popLayout" ensures list changes glide instead of jumping */}
          <AnimatePresence mode="popLayout">
            {pendingFindings.length === 0 ? (
              <motion.div
                layout
                key="all-compliant-gyro"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={springs.soft}
                style={{
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-ink-card)',
                  borderRadius: '8px',
                  border: '1px dashed var(--color-verified-green)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <GovernanceGyroscope status="verified" size={140} />
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-verified-green)',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    marginTop: '1rem',
                    letterSpacing: '1px'
                  }}
                >
                  ✓ 100% COMPLIANT COPY
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-steel)', maxWidth: '320px', marginTop: '0.5rem', lineHeight: 1.5 }}>
                  Zero guideline discrepancies, banned terminology, or pricing mismatches detected. Ready for publication.
                </p>
              </motion.div>
            ) : (
              pendingFindings.map((f, idx) => {
                const isActive = f.id === activeFindingId;
                const isHovered = f.id === hoveredFindingId;
                const isFlipped = !!flippedCards[f.id];
                const swipeDir = swipedDirections[f.id] || 'left';
                const hasPrecedent = Boolean(f.precedent || f.source_type === 'precedent' || f.source_id?.includes('PRC'));

                return (
                  <motion.div
                    layout
                    key={f.id}
                    id={`card-finding-${f.id}`}
                    // Finding cards spring in from the right
                    initial={{ opacity: 0, x: 100, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{
                      x: swipeDir === 'left' ? -480 : 480,
                      opacity: 0,
                      rotate: swipeDir === 'left' ? -10 : 10,
                      scale: 0.86,
                      transition: { duration: 0.35, ease: [0.32, 0, 0.67, 0] }
                    }}
                    transition={{
                      x: { type: 'spring', stiffness: 360, damping: 25, mass: 0.8, delay: idx * 0.08 },
                      scale: { type: 'spring', stiffness: 360, damping: 25, mass: 0.8, delay: idx * 0.08 },
                      opacity: { duration: 0.25, delay: idx * 0.08 },
                      layout: springs.soft
                    }}
                    // Interactive drag to swipe away
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.65}
                    onDragEnd={(_e, info) => {
                      if (info.offset.x < -95 || info.velocity.x < -320) {
                        handleAcceptFix(f.id);
                      } else if (info.offset.x > 95 || info.velocity.x > 320) {
                        handleDismiss(f.id);
                      }
                    }}
                    onMouseEnter={() => setHoveredFindingId(f.id)}
                    onMouseLeave={() => setHoveredFindingId(null)}
                    onClick={() => setActiveFindingId(f.id)}
                    style={{
                      perspective: '1200px',
                      cursor: 'grab'
                    }}
                  >
                    {/* 3D FLIPPABLE CONTAINER ON Y-AXIS */}
                    <motion.div
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        transformStyle: 'preserve-3d',
                        position: 'relative',
                        width: '100%',
                        borderRadius: '8px'
                      }}
                    >
                      {/* FRONT FACE: REGULAR FINDING CARD */}
                      <div
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          backgroundColor: 'var(--color-ink-card)',
                          border: `1px solid ${isActive || isHovered ? 'var(--color-highlighter)' : 'var(--color-docket-border)'}`,
                          borderLeft: `4px solid ${
                            f.severity === 'critical'
                              ? 'var(--color-stamp-red)'
                              : hasPrecedent
                              ? '#FFB703'
                              : 'var(--color-highlighter)'
                          }`,
                          borderRadius: '8px',
                          padding: '1.25rem',
                          boxShadow: isActive || isHovered ? '0 0 18px rgba(255, 214, 10, 0.22)' : 'none',
                          transition: 'border 0.2s ease, box-shadow 0.2s ease'
                        }}
                      >
                        {/* Finding Header with Pulsing Severity Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* SEVERITY BADGE: Pulses Once on Mount */}
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                              {/* Radiating halo ring that pulses once */}
                              <motion.span
                                initial={{ scale: 1, opacity: 0.85 }}
                                animate={{ scale: 2.2, opacity: 0 }}
                                transition={{
                                  duration: 0.65,
                                  delay: idx * 0.08 + 0.25,
                                  ease: 'easeOut'
                                }}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  borderRadius: '3px',
                                  backgroundColor:
                                    f.severity === 'critical'
                                      ? 'rgba(215, 38, 61, 0.7)'
                                      : 'rgba(255, 214, 10, 0.7)',
                                  pointerEvents: 'none',
                                  zIndex: 0
                                }}
                              />

                              {/* Core badge that bounces once */}
                              <motion.span
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: [1, 1.28, 0.95, 1], opacity: 1 }}
                                transition={{
                                  duration: 0.55,
                                  times: [0, 0.35, 0.7, 1],
                                  ease: 'easeOut',
                                  delay: idx * 0.08 + 0.15
                                }}
                                style={{
                                  position: 'relative',
                                  zIndex: 1,
                                  padding: '2px 8px',
                                  borderRadius: '3px',
                                  fontSize: '0.72rem',
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 700,
                                  backgroundColor:
                                    f.severity === 'critical'
                                      ? 'rgba(215, 38, 61, 0.25)'
                                      : 'rgba(255, 214, 10, 0.25)',
                                  color:
                                    f.severity === 'critical'
                                      ? '#FF6B6B'
                                      : 'var(--color-highlighter)',
                                  border: `1px solid ${
                                    f.severity === 'critical'
                                      ? 'rgba(215, 38, 61, 0.6)'
                                      : 'rgba(255, 214, 10, 0.6)'
                                  }`,
                                  textTransform: 'uppercase'
                                }}
                              >
                                {f.severity.toUpperCase()}
                              </motion.span>
                            </div>

                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '3px',
                                fontSize: '0.7rem',
                                fontFamily: 'var(--font-mono)',
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                color: 'var(--color-paper-light)',
                                textTransform: 'uppercase'
                              }}
                            >
                              {f.source_type.toUpperCase()} • {f.source_id || 'RULE'}
                            </span>
                          </div>

                          {/* Flip to Precedent Trigger on Y-axis */}
                          <button
                            onClick={(e) => handleToggleFlip(f.id, e)}
                            style={{
                              background: hasPrecedent ? 'rgba(255, 183, 3, 0.15)' : 'none',
                              border: `1px solid ${hasPrecedent ? '#FFB703' : 'rgba(255, 214, 10, 0.3)'}`,
                              borderRadius: '4px',
                              padding: '2px 8px',
                              color: hasPrecedent ? '#FFB703' : 'var(--color-highlighter)',
                              fontSize: '0.7rem',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: hasPrecedent ? 700 : 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: hasPrecedent ? '0 0 8px rgba(255, 183, 3, 0.3)' : 'none'
                            }}
                            title="Flip on Y-axis to view precedent exception"
                          >
                            ⚖️ Precedent {hasPrecedent ? 'Applies' : ''} ↻
                          </button>
                        </div>

                        {/* Layered Precedent Badges & Verified Quote */}
                        {f.precedent && (
                          <div style={{ margin: '0.35rem 0', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                            <span
                              style={{
                                backgroundColor: 'rgba(255, 183, 3, 0.15)',
                                border: '1px solid #FFB703',
                                color: '#FFB703',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700
                              }}
                            >
                              ⚖️ PRECEDENT: {f.precedent.precedent.id}
                            </span>
                            {f.precedent.is_quote_verified && (
                              <span
                                style={{
                                  backgroundColor: 'rgba(47, 191, 113, 0.15)',
                                  border: '1px solid var(--color-verified-green)',
                                  color: 'var(--color-verified-green)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.68rem',
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 600
                                }}
                              >
                                ✓ QUOTE VERIFIED: "{f.precedent.verified_quote}"
                              </span>
                            )}
                            {f.precedent.has_conflict && (
                              <span
                                style={{
                                  backgroundColor: 'rgba(215, 38, 61, 0.15)',
                                  border: '1px solid var(--color-stamp-red)',
                                  color: '#FF8A8A',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.68rem',
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 600
                                }}
                              >
                                ⚠️ CONTRADICTORY RULINGS EXIST
                              </span>
                            )}
                          </div>
                        )}

                        {/* Flagged text */}
                        <div style={{ fontSize: '0.88rem', color: 'var(--color-paper-light)', margin: '0.4rem 0' }}>
                          <strong>Flagged:</strong>{' '}
                          <span style={{ backgroundColor: 'rgba(215, 38, 61, 0.2)', color: '#FF8A8A', padding: '2px 6px', borderRadius: '3px' }}>
                            "{f.span_text}"
                          </span>
                        </div>

                        {/* Quoted Guideline Clause (Citation Gate) */}
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--color-steel)',
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '4px',
                            borderLeft: '2px solid var(--color-steel)',
                            margin: '0.5rem 0'
                          }}
                        >
                          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--color-steel-light)', marginBottom: '2px' }}>
                            Quoted Brand Clause (Citation Gate):
                          </div>
                          "{f.source_text}"
                        </div>

                        {/* Explanation */}
                        <p style={{ fontSize: '0.84rem', color: 'var(--color-paper-light)', margin: '0.5rem 0', lineHeight: 1.5 }}>
                          {f.explanation}
                        </p>

                        {/* Word-level Diff */}
                        {f.word_diff && f.word_diff.length > 0 && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-verified-green)', textTransform: 'uppercase', marginBottom: '3px' }}>
                              Intent-Lock Suggested Fix:
                            </div>
                            <WordDiffViewer tokens={f.word_diff} />
                          </div>
                        )}

                        {/* Action Buttons: Swipe Left (Accept) or Swipe Right (Dismiss) */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <button
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptFix(f.id);
                            }}
                          >
                            ✓ Accept Fix (Swipe Left)
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismiss(f.id);
                            }}
                          >
                            📁 Dismiss (Swipe Right)
                          </button>
                        </div>
                      </div>

                      {/* BACK FACE: PRECEDENT VIEW (FLIPPED 180° ON Y AXIS) */}
                      <div
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: '#1C1916',
                          border: '1px solid #FFB703',
                          borderLeft: '4px solid #FFB703',
                          borderRadius: '8px',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                          overflowY: 'auto'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#FFB703' }}>
                              ⚖️ BINDING BRAND PRECEDENT // {f.precedent?.precedent.id || f.source_id || 'PRC-091'}
                            </span>
                            <button
                              onClick={(e) => handleToggleFlip(f.id, e)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-steel)',
                                cursor: 'pointer',
                                fontSize: '0.8rem'
                              }}
                            >
                              ↺ Flip Back
                            </button>
                          </div>

                          {/* Precedent Citation Gate: Verified Quote */}
                          {f.precedent?.is_quote_verified && (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: 'rgba(47, 191, 113, 0.15)',
                                border: '1px solid var(--color-verified-green)',
                                color: 'var(--color-verified-green)',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                                margin: '0.3rem 0'
                              }}
                            >
                              <span>✓ VERIFIED CITATION MATCH:</span>
                              <strong style={{ color: '#FFFFFF' }}>"{f.precedent.verified_quote}"</strong>
                            </div>
                          )}

                          {/* Precedent Conflict Alert */}
                          {f.precedent?.has_conflict && (
                            <div
                              style={{
                                backgroundColor: 'rgba(215, 38, 61, 0.15)',
                                border: '1px solid var(--color-stamp-red)',
                                color: '#FF8A8A',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                fontSize: '0.74rem',
                                margin: '0.35rem 0',
                                lineHeight: 1.4
                              }}
                            >
                              ⚠️ <strong>Conflicting Case Law Warning:</strong> {f.precedent.conflict_details}
                            </div>
                          )}

                          <div style={{ fontSize: '0.85rem', color: 'var(--color-paper-light)', margin: '0.4rem 0', lineHeight: 1.5 }}>
                            <strong>Precedent Ruling:</strong> {f.precedent?.precedent.reason || `Approved during previous campaign cycle for ${clientName}.`}
                          </div>

                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--color-paper)',
                              backgroundColor: 'rgba(0, 0, 0, 0.4)',
                              padding: '0.6rem',
                              borderRadius: '4px',
                              borderLeft: '2px solid #FFB703',
                              margin: '0.5rem 0'
                            }}
                          >
                            "{f.source_text}"
                          </div>

                          <div style={{ fontSize: '0.72rem', color: 'var(--color-steel-light)', fontFamily: 'var(--font-mono)', lineHeight: 1.4 }}>
                            DECIDED BY: {f.precedent?.precedent.decided_by || 'VP Brand Governance'} • SCOPE: {f.precedent?.precedent.scope || 'All Channels'} • EXPIRES: {f.precedent?.precedent.expiry || 'Permanent'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <button
                            className="btn btn-warning"
                            style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem', fontWeight: 700 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismiss(f.id);
                            }}
                          >
                            ✓ Confirm & Apply Precedent (Human Sign-off)
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPrecedentModal(f);
                            }}
                          >
                            Edit Docket
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Precedent Filing Drawer */}
      <PrecedentDrawer
        isOpen={isPrecedentDrawerOpen}
        onClose={() => setIsPrecedentDrawerOpen(false)}
        clauseId={drawerClauseId}
        onSavePrecedent={handleSavePrecedent}
      />

      {/* Compliance Audit Certificate Modal */}
      <ComplianceCertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        draftId={draftId}
        draftTitle={title}
        clientName={clientName}
        channel={channel}
        draftText={draftContent}
        resolvedFindingsCount={resolvedCount}
        clausesCited={Array.from(new Set(findings.map(f => f.source_id).filter(Boolean) as string[]))}
        precedentsApplied={Array.from(new Set(findings.map(f => f.precedent?.precedent?.id).filter(Boolean) as string[]))}
      />

      {/* Responsive Breakpoint Styles for 360px, 768px, and 1280px */}
      <style>{`
        @media (max-width: 860px) {
          .review-workspace-container {
            padding: 0.85rem 0.85rem !important;
            gap: 1rem !important;
          }
          .review-workspace-grid {
            grid-template-columns: 1fr !important;
          }
          .connector-svg {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .review-workspace-container {
            padding: 0.5rem 0.5rem !important;
            gap: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
};
