import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { springs } from '../motion';
import { RubberStamp, StampType } from '../components/RubberStamp.tsx';
import { WordDiffViewer } from '../components/WordDiffViewer.tsx';
import { PrecedentDrawer } from '../components/PrecedentDrawer.tsx';
import { GovernanceGyroscope } from '../components/GovernanceGyroscope.tsx';

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
  onDraftApproved?: () => void;
  onNewReviewRequested?: () => void;
}

// Animated Count-Up Number Component
const CountUpNumber: React.FC<{ value: number }> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;
    const duration = 500;
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * ease);
      setDisplayValue(current);
      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };
    const reqId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(reqId);
  }, [value]);

  return <span>{displayValue}</span>;
};

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({
  clientName,
  draftId,
  title,
  channel,
  initialText,
  initialFindings,
  onDraftApproved,
  onNewReviewRequested
}) => {
  const [draftContent, setDraftContent] = useState(initialText);
  const [findings, setFindings] = useState<FindingUI[]>(initialFindings);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(initialFindings[0]?.id || null);
  const [hoveredFindingId, setHoveredFindingId] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [swipedDirections, setSwipedDirections] = useState<Record<string, 'left' | 'right'>>({});
  
  // Stamp slam, 2px screen shake, and ink burst
  const [isShaking, setIsShaking] = useState(false);
  const [showInkBurst, setShowInkBurst] = useState(false);
  const [stampState, setStampState] = useState<{ visible: boolean; type: StampType; animate: boolean }>({
    visible: false,
    type: 'APPROVED',
    animate: false
  });

  // Precedent Drawer State
  const [isPrecedentDrawerOpen, setIsPrecedentDrawerOpen] = useState(false);
  const [drawerClauseId, setDrawerClauseId] = useState('C-1.1');

  // SVG Connector Coordinates
  const containerRef = useRef<HTMLDivElement>(null);
  const [connectorCoords, setConnectorCoords] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  // Sync findings when initial findings change
  useEffect(() => {
    setDraftContent(initialText);
    setFindings(initialFindings);
    if (initialFindings.length > 0) {
      setActiveFindingId(initialFindings[0].id);
    }
    // Auto-flip cards that have a precedent source
    const initialFlips: Record<string, boolean> = {};
    initialFindings.forEach(f => {
      if (f.source_type === 'precedent') {
        initialFlips[f.id] = true;
      }
    });
    setFlippedCards(initialFlips);
  }, [initialText, initialFindings]);

  // Recalculate SVG connector line between hovered/active finding card and text span
  useEffect(() => {
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
  }, [hoveredFindingId, activeFindingId, findings, draftContent]);

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
    }, 100);
  };

  const handleDismiss = (findingId: string) => {
    setSwipedDirections(prev => ({ ...prev, [findingId]: 'right' }));
    setTimeout(() => {
      setFindings(prev =>
        prev.map(f => (f.id === findingId ? { ...f, status: 'dismissed' as const } : f))
      );
    }, 100);
  };

  const handleToggleFlip = (findingId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFlippedCards(prev => ({ ...prev, [findingId]: !prev[findingId] }));
  };

  const handleOpenPrecedentModal = (finding: FindingUI) => {
    setDrawerClauseId(finding.source_id || 'C-1.1');
    setIsPrecedentDrawerOpen(true);
  };

  const handleSavePrecedent = (_data: { reason: string; scope: string; expiry: string; decidedBy: string }) => {
    if (activeFindingId) {
      handleDismiss(activeFindingId);
    }
    setIsPrecedentDrawerOpen(false);
  };

  const handleApproveDraft = () => {
    setStampState({ visible: true, type: 'APPROVED', animate: true });
    setIsShaking(true);
    setShowInkBurst(true);

    setTimeout(() => {
      setIsShaking(false);
    }, 450);

    setTimeout(() => {
      setShowInkBurst(false);
    }, 1200);

    if (onDraftApproved) onDraftApproved();
  };

  const pendingFindings = findings.filter(f => f.status === 'pending');
  const resolvedCount = findings.filter(f => f.status !== 'pending').length;
  const isAllResolved = pendingFindings.length === 0;

  // Render copy text with staggered highlighted spans
  const renderHighlightedCopy = () => {
    if (pendingFindings.length === 0) {
      return <span>{draftContent}</span>;
    }

    // Match findings inside draft text
    type Segment = { text: string; finding?: FindingUI; index: number };
    const segments: Segment[] = [];
    let remaining = draftContent;
    let cursor = 0;

    // Find first occurrence of each pending finding
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

    // Sort by start index
    occurrences.sort((a, b) => a.start - b.start);

    occurrences.forEach((occ) => {
      if (occ.start > cursor) {
        segments.push({
          text: remaining.substring(cursor, occ.start),
          index: cursor
        });
      }
      segments.push({
        text: occ.finding.span_text,
        finding: occ.finding,
        index: occ.start
      });
      cursor = occ.end;
    });

    if (cursor < remaining.length) {
      segments.push({
        text: remaining.substring(cursor),
        index: cursor
      });
    }

    return (
      <>
        {segments.map((seg, sIdx) => {
          if (!seg.finding) {
            return <span key={sIdx}>{seg.text}</span>;
          }

          const f = seg.finding;
          const isTarget = hoveredFindingId === f.id || activeFindingId === f.id;

          return (
            <motion.mark
              key={f.id}
              id={`span-finding-${f.id}`}
              initial={{ backgroundSize: '0% 100%' }}
              animate={{ backgroundSize: '100% 100%' }}
              transition={{
                duration: 0.6,
                delay: 0.12 + sIdx * 0.1,
                ease: [0.16, 1, 0.3, 1]
              }}
              style={{
                display: 'inline',
                backgroundImage:
                  f.severity === 'critical'
                    ? 'linear-gradient(rgba(215, 38, 61, 0.3), rgba(215, 38, 61, 0.3))'
                    : 'linear-gradient(rgba(255, 214, 10, 0.38), rgba(255, 214, 10, 0.38))',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'left center',
                backgroundColor: 'transparent',
                color: '#101114',
                fontWeight: 600,
                borderRadius: '3px',
                padding: '2px 4px',
                cursor: 'pointer',
                borderBottom: isTarget
                  ? '2.5px solid var(--color-stamp-red)'
                  : '1.5px dashed rgba(215, 38, 61, 0.6)',
                transition: 'border 0.15s ease'
              }}
              onClick={() => setActiveFindingId(f.id)}
              onMouseEnter={() => setHoveredFindingId(f.id)}
              onMouseLeave={() => setHoveredFindingId(null)}
              tabIndex={0}
              role="button"
              aria-label={`Flagged issue: ${f.span_text}`}
            >
              {seg.text}
            </motion.mark>
          );
        })}
      </>
    );
  };

  return (
    <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '1rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* TOP CONTROL BAR: Header, Status, Live Counters */}
      <div
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
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              DOCKET {draftId.replace('draft_', 'PRK-')} • {clientName}
            </span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-paper-light)', margin: '0.1rem 0 0 0' }}>
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

          {/* Animated Status Pill with Count-Up Numbers */}
          <span
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
                <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>
                  • <CountUpNumber value={resolvedCount} /> RESOLVED
                </span>
              </>
            )}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
            className={`btn ${isAllResolved ? 'btn-success' : 'btn-primary'}`}
            onClick={handleApproveDraft}
            style={{ fontSize: '0.82rem', padding: '0.45rem 1.1rem', fontWeight: 700 }}
            aria-label="Stamp and approve copy"
          >
            🏛️ Stamp & Approve Copy
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN SPLIT WITH CONNECTOR OVERLAY */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'minmax(400px, 1.2fr) minmax(360px, 1fr)',
          gap: '1.5rem',
          alignItems: 'start'
        }}
      >
        {/* ANIMATED SVG CONNECTOR BETWEEN CARD AND TEXT SPAN */}
        {connectorCoords && (
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 15
            }}
          >
            <defs>
              <linearGradient id="connectorGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D7263D" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#FFD60A" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <motion.path
              d={`M ${connectorCoords.startX} ${connectorCoords.startY} C ${connectorCoords.startX + 60} ${connectorCoords.startY}, ${connectorCoords.endX - 60} ${connectorCoords.endY}, ${connectorCoords.endX} ${connectorCoords.endY}`}
              fill="none"
              stroke="url(#connectorGlow)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <motion.circle
              cx={connectorCoords.startX}
              cy={connectorCoords.startY}
              r="4.5"
              fill="#D7263D"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.4, 1] }}
              transition={{ duration: 0.2 }}
            />
            <motion.circle
              cx={connectorCoords.endX}
              cy={connectorCoords.endY}
              r="5"
              fill="#FFD60A"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.4, 1] }}
              transition={{ duration: 0.2, delay: 0.08 }}
            />
          </svg>
        )}

        {/* LEFT COLUMN: THE EVALUATED COPY */}
        <motion.div
          animate={
            isShaking
              ? {
                  x: [-2, 2, -2, 2, -1, 1, 0],
                  y: [-2, 2, -1, 1, -1, 1, 0]
                }
              : { x: 0, y: 0 }
          }
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          style={{
            backgroundColor: '#F7F3EB',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            border: '1px solid #D5CDBE',
            padding: '2rem',
            position: 'relative',
            minHeight: '440px',
            color: '#1A1C22',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden'
          }}
        >
          {/* Slammed Stamp Overlay */}
          {stampState.visible && (
            <div style={{ position: 'absolute', top: '30px', right: '30px', zIndex: 20 }}>
              <RubberStamp type={stampState.type} animate={stampState.animate} />
            </div>
          )}

          {/* Ink Burst Particles */}
          {showInkBurst && (
            <div style={{ position: 'absolute', top: '65px', right: '95px', pointerEvents: 'none', zIndex: 25 }}>
              {Array.from({ length: 18 }).map((_, i) => {
                const angle = (i / 18) * 2 * Math.PI;
                const distance = 35 + (i % 3) * 25;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                const size = 3 + (i % 4) * 2.5;

                return (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    animate={{
                      x,
                      y,
                      scale: [1, 1.5, 0],
                      opacity: [1, 0.8, 0]
                    }}
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-stamp-red)',
                      boxShadow: '0 0 6px var(--color-stamp-red)'
                    }}
                  />
                );
              })}
            </div>
          )}

          <div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#7A756B', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '1px' }}>
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

        {/* RIGHT COLUMN: FINDINGS DOCKET & INTENT-LOCK FIXES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-steel)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              COMPLIANCE AUDIT // <CountUpNumber value={pendingFindings.length} /> PENDING
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-highlighter)' }}>
              Keyboard: <kbd style={{ padding: '1px 5px', background: 'var(--color-ink-card)', border: '1px solid var(--color-docket-border)', borderRadius: '3px' }}>A</kbd> Accept • <kbd style={{ padding: '1px 5px', background: 'var(--color-ink-card)', border: '1px solid var(--color-docket-border)', borderRadius: '3px' }}>D</kbd> Dismiss
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {pendingFindings.length === 0 ? (
              <motion.div
                layout
                key="all-compliant-gyro"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
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
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-verified-green)', fontSize: '0.92rem', fontWeight: 700, marginTop: '1rem', letterSpacing: '1px' }}>
                  ✓ 100% COMPLIANT COPY
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-steel)', maxWidth: '320px', marginTop: '0.5rem', lineHeight: 1.5 }}>
                  Zero guideline discrepancies, banned terminology, or pricing mismatches detected.
                </p>
              </motion.div>
            ) : (
              pendingFindings.map((f, idx) => {
                const isActive = f.id === activeFindingId;
                const isHovered = f.id === hoveredFindingId;
                const isFlipped = !!flippedCards[f.id];
                const swipeDir = swipedDirections[f.id] || 'left';

                return (
                  <motion.div
                    layout
                    key={f.id}
                    id={`card-finding-${f.id}`}
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{
                      x: swipeDir === 'left' ? -380 : 380,
                      opacity: 0,
                      rotate: swipeDir === 'left' ? -6 : 6,
                      scale: 0.88,
                      transition: { duration: 0.35, ease: 'easeOut' }
                    }}
                    transition={{
                      ...springs.soft,
                      delay: idx * 0.05
                    }}
                    onMouseEnter={() => setHoveredFindingId(f.id)}
                    onMouseLeave={() => setHoveredFindingId(null)}
                    onClick={() => setActiveFindingId(f.id)}
                    style={{
                      perspective: '1200px',
                      cursor: 'pointer'
                    }}
                  >
                    {/* 3D FLIPPABLE CONTAINER */}
                    <motion.div
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
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
                          backgroundColor: 'var(--color-ink-card)',
                          border: `1px solid ${isActive || isHovered ? 'var(--color-highlighter)' : 'var(--color-docket-border)'}`,
                          borderLeft: `4px solid ${
                            f.severity === 'critical'
                              ? 'var(--color-stamp-red)'
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
                            {/* Severity Badge (Pulses Once on Mount) */}
                            <motion.span
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: [1, 1.25, 1], opacity: 1 }}
                              transition={{ duration: 0.5, times: [0, 0.4, 1], ease: 'easeOut', delay: idx * 0.06 + 0.1 }}
                              style={{
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
                                textTransform: 'uppercase'
                              }}
                            >
                              {f.severity.toUpperCase()}
                            </motion.span>

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

                          {/* Flip to Precedent Trigger */}
                          <button
                            onClick={(e) => handleToggleFlip(f.id, e)}
                            style={{
                              background: 'none',
                              border: '1px solid rgba(255, 214, 10, 0.3)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              color: 'var(--color-highlighter)',
                              fontSize: '0.7rem',
                              fontFamily: 'var(--font-mono)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Flip to view binding precedent"
                          >
                            ⚖️ Precedent
                          </button>
                        </div>

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
                          transform: 'rotateY(180deg)',
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: '#1E1B18',
                          border: '1px solid var(--color-highlighter)',
                          borderLeft: '4px solid var(--color-highlighter)',
                          borderRadius: '8px',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-highlighter)' }}>
                              ⚖️ BINDING BRAND PRECEDENT // {f.source_id || 'PRC-442'}
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
                              ✕ Flip Back
                            </button>
                          </div>

                          <div style={{ fontSize: '0.85rem', color: 'var(--color-paper-light)', margin: '0.4rem 0', lineHeight: 1.5 }}>
                            <strong>Precedent Exception:</strong> Approved during Q3 Festive Blitz for {clientName}.
                          </div>

                          <div style={{ fontSize: '0.78rem', color: 'var(--color-steel)', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '4px', margin: '0.5rem 0' }}>
                            "Permitted colloquial claim '{f.span_text}' when accompanied by standard diagnostic disclaimer."
                          </div>

                          <div style={{ fontSize: '0.72rem', color: 'var(--color-steel-light)', fontFamily: 'var(--font-mono)' }}>
                            DECIDED BY: VP Brand Governance • SCOPE: Social & Email
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
                            ✓ Apply Precedent & Dismiss Issue
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
    </div>
  );
};
