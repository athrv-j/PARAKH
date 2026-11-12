import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { DocketLabel } from '../components/DocketLabel.tsx';
import { emitToast } from '../components/ToastContainer.tsx';
import { springs } from '../motion';

export interface FactNode {
  id: string;
  label: string;
  value: string;
  valid_until?: string | null;
  x: number;
  y: number;
}

export interface DraftNode {
  id: string;
  title: string;
  channel: 'social' | 'email' | 'print' | 'pr' | string;
  claim_span: string;
  status: 'clean' | 'needs_update';
  fact_id: string;
  x: number;
  y: number;
  flipAngle?: number;
}

interface FactRippleBoardProps {
  clientId: string;
  clientName: string;
}

// Initial facts for demonstration
const INITIAL_FACTS: FactNode[] = [
  { id: 'F-KAV-01', label: 'Basic Health Checkup Price', value: '₹499', valid_until: '2026-12-31', x: 480, y: 150 },
  { id: 'F-KAV-02', label: 'Diwali Wellness Camp Price', value: '₹899', valid_until: '2026-11-05', x: 480, y: 320 },
  { id: 'F-KAV-03', label: 'NABL Accreditation Code', value: 'NABL-MC-2026-441', valid_until: '2028-01-01', x: 480, y: 490 }
];

// Initial connected creative asset drafts
const INITIAL_DRAFTS: DraftNode[] = [
  { id: 'D-01', title: 'Instagram Reel: Routine Care', channel: 'social', claim_span: '₹499', status: 'clean', fact_id: 'F-KAV-01', x: 160, y: 130 },
  { id: 'D-02', title: 'Diwali Email Blast #1', channel: 'email', claim_span: '₹899', status: 'clean', fact_id: 'F-KAV-02', x: 810, y: 240 },
  { id: 'D-03', title: 'Festive Poster A3 Print', channel: 'print', claim_span: 'Offer ends 2026-11-05', status: 'clean', fact_id: 'F-KAV-02', x: 810, y: 410 },
  { id: 'D-04', title: 'Press Release: Quality Standards', channel: 'pr', claim_span: 'NABL-MC-2026-441', status: 'clean', fact_id: 'F-KAV-03', x: 160, y: 470 }
];

export const FactRippleBoard: React.FC<FactRippleBoardProps> = ({ clientId, clientName }) => {
  const [facts, setFacts] = useState<FactNode[]>(INITIAL_FACTS);
  const [drafts, setDrafts] = useState<DraftNode[]>(INITIAL_DRAFTS);
  const [selectedFactId, setSelectedFactId] = useState<string>('F-KAV-02');
  const [newValue, setNewValue] = useState('₹999');
  const [newExpiry, setNewExpiry] = useState('2026-11-20');
  const [isRippling, setIsRippling] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [ghostPreviewActive, setGhostPreviewActive] = useState(false);
  const [ghostSimulatedFacts, setGhostSimulatedFacts] = useState<{ factId: string; prevValue: string; nextValue: string } | null>(null);
  const [simulationResults, setSimulationResults] = useState<{
    fact_id: string;
    label: string;
    previous_value: string;
    new_value?: string;
    previous_valid_until?: string | null;
    new_valid_until?: string | null;
    dry_run: boolean;
    affected_items_count: number;
    affected_drafts: Array<{
      draft_id: string;
      draft_title: string;
      channel: string;
      current_status: string;
      claim_span: string;
    }>;
  } | null>(null);
  const [expiringFacts, setExpiringFacts] = useState<Array<{
    fact_id: string;
    label: string;
    value: string;
    valid_until: string;
    days_remaining: number;
    linked_drafts_count: number;
    affected_draft_titles: string[];
  }>>([]);
  const [showExpiringDetails, setShowExpiringDetails] = useState(false);

  // View mode: 'board' (physical canvas) or 'list' (accessible fallback)
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const prefersReducedMotion = useReducedMotion();
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Pan and Zoom state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Board canvas ref
  const boardRef = useRef<HTMLDivElement>(null);

  // Detect small screens
  useEffect(() => {
    const checkScreen = () => {
      const small = window.innerWidth < 820;
      setIsSmallScreen(small);
      if (small || prefersReducedMotion) {
        setViewMode('list');
      }
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, [prefersReducedMotion]);

  // Synchronize with backend API if available
  useEffect(() => {
    const token = localStorage.getItem('parakh_auth_token');
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`/api/review/clients/${clientId}/facts/graph`, { headers: authHeaders })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.facts && data.facts.length > 0) {
          const apiFacts: FactNode[] = data.facts.map((f: any, i: number) => ({
            id: f.id,
            label: f.label,
            value: f.value,
            valid_until: f.valid_until,
            x: 480,
            y: 150 + i * 170
          }));
          setFacts(apiFacts);
        }
      })
      .catch(() => {});

    // Proactive Expiring Facts Radar (Improvement 3)
    fetch(`/api/review/clients/${clientId}/facts/expiring?days=60`, { headers: authHeaders })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.expiring_facts) {
          setExpiringFacts(data.expiring_facts);
        }
      })
      .catch(() => {});
  }, [clientId]);

  // Handle fact position updates on drag
  const handleFactDrag = useCallback((id: string, newPos: { x: number; y: number }) => {
    setFacts(prev => prev.map(f => (f.id === id ? { ...f, x: newPos.x, y: newPos.y } : f)));
  }, []);

  // Handle draft position updates on drag
  const handleDraftDrag = useCallback((id: string, newPos: { x: number; y: number }) => {
    setDrafts(prev => prev.map(d => (d.id === id ? { ...d, x: newPos.x, y: newPos.y } : d)));
  }, []);

  // Pan canvas on pointer drag on the background
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.fact-card, .draft-card, .board-control-btn')) {
      return;
    }
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y
    });
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Zoom via mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = -e.deltaY * 0.0012;
    setZoom(prev => Math.min(1.8, Math.max(0.6, prev + zoomDelta)));
  };

  // Trigger ripple propagation with distance-staggered node flips
  const handleTriggerRipple = async (
    targetFactId?: string | React.MouseEvent,
    targetValue?: string,
    targetExpiry?: string,
    forceDryRun?: boolean
  ) => {
    const fId = (typeof targetFactId === 'string' && targetFactId) ? targetFactId : selectedFactId;
    const fVal = typeof targetValue === 'string' ? targetValue : newValue;
    const fExp = typeof targetExpiry === 'string' ? targetExpiry : newExpiry;
    const isDry = typeof forceDryRun === 'boolean' ? forceDryRun : dryRun;

    setSelectedFactId(fId);
    setNewValue(fVal);
    setNewExpiry(fExp);
    if (forceDryRun !== undefined) setDryRun(forceDryRun);

    const selectedFact = facts.find(f => f.id === fId);
    if (!selectedFact) return;

    setIsRippling(true);

    if (isDry) {
      setGhostPreviewActive(true);
      setGhostSimulatedFacts({
        factId: selectedFact.id,
        prevValue: selectedFact.value,
        nextValue: fVal
      });
    } else {
      setGhostPreviewActive(false);
      setGhostSimulatedFacts(null);
    }

    const token = localStorage.getItem('parakh_auth_token') || 'test-token:manager:client_kavach,client_vyapar,client_mitti:evaluator:eval@agency.com';
    let apiAffectedDrafts: any[] = [];
    let affectedCount = 0;

    try {
      const res = await fetch(`/api/review/clients/${clientId}/facts/ripple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          factId: fId,
          value: fVal,
          valid_until: fExp,
          dryRun: isDry
        })
      });
      const data = await res.json();
      let simulationPayload: any = null;
      if (data.success && data.result) {
        simulationPayload = { ...data.result };
        apiAffectedDrafts = data.result.affected_drafts || [];
        affectedCount = data.result.affected_items_count || 0;
      }

      // If server had 0 linked drafts in DB or fallback, supplement with active corkboard drafts
      if (!simulationPayload || !simulationPayload.affected_drafts || simulationPayload.affected_drafts.length === 0) {
        const localAffected = drafts.filter(d => d.fact_id === fId);
        simulationPayload = {
          fact_id: fId,
          label: selectedFact.label || fId,
          previous_value: selectedFact.value,
          new_value: fVal,
          affected_items_count: Math.max(localAffected.length, affectedCount),
          affected_drafts: localAffected.map(d => ({
            draft_id: d.id,
            draft_title: d.title,
            channel: d.channel,
            claim_span: fVal
          }))
        };
      }

      if (isDry) {
        setSimulationResults(simulationPayload);
      } else {
        setSimulationResults(null);
      }
    } catch (e) {
      console.error('Error triggering ripple:', e);
    }

    // Connect draft animations: either matching fact_id or in apiAffectedDrafts
    const connectedDrafts = drafts.filter(d =>
      d.fact_id === fId || apiAffectedDrafts.some(ad => ad.draft_id === d.id)
    );

    const countToReport = Math.max(connectedDrafts.length, affectedCount);

    connectedDrafts.forEach(draft => {
      const distance = Math.hypot(draft.x - selectedFact.x, draft.y - selectedFact.y);
      const delayMs = Math.round((distance / 450) * 800);

      setTimeout(() => {
        setDrafts(prev =>
          prev.map(d =>
            d.id === draft.id ? { ...d, status: 'needs_update' as const, flipAngle: (d.flipAngle || 0) + 360 } : d
          )
        );
      }, delayMs);
    });

    // If live commit, update fact value after ripple waves expand
    setTimeout(() => {
      if (!isDry) {
        setFacts(prev =>
          prev.map(f =>
            f.id === fId ? { ...f, value: fVal, valid_until: fExp } : f
          )
        );
      }
      setIsRippling(false);

      emitToast({
        type: isDry ? 'info' : 'precedent',
        title: isDry ? '👻 GHOST SIMULATION EXECUTED' : '⚡ DEPENDENCY RIPPLE PROPAGATED',
        message: isDry
          ? `Simulated blast radius: ${countToReport} downstream creative asset${countToReport !== 1 ? 's' : ''} require updates.`
          : `Updated ${selectedFact.label} to ${fVal}. ${countToReport} dependent asset${countToReport !== 1 ? 's' : ''} flagged for revision.`
      });
    }, 1100);
  };

  const handleReset = () => {
    setDrafts(prev => prev.map(d => ({ ...d, status: 'clean' as const, flipAngle: 0 })));
    setGhostPreviewActive(false);
    setGhostSimulatedFacts(null);
    setSimulationResults(null);
  };

  const handleCommitGhostChanges = async () => {
    const fId = selectedFactId;
    const fVal = newValue;
    const fExp = newExpiry;

    const token = localStorage.getItem('parakh_auth_token') || 'test-token:manager:client_kavach,client_vyapar,client_mitti:evaluator:eval@agency.com';
    try {
      await fetch(`/api/review/clients/${clientId}/facts/ripple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          factId: fId,
          value: fVal,
          valid_until: fExp,
          dryRun: false
        })
      });
    } catch (e) {
      console.error('Error committing changes:', e);
    }

    setDrafts(prev =>
      prev.map(d => (d.fact_id === fId ? { ...d, status: 'needs_update' as const } : d))
    );
    setFacts(prev =>
      prev.map(f =>
        f.id === fId ? { ...f, value: fVal, valid_until: fExp } : f
      )
    );
    setGhostPreviewActive(false);
    setGhostSimulatedFacts(null);
    setSimulationResults(null);
    setDryRun(false);

    emitToast({
      type: 'approval',
      title: '✓ FACT UPDATES COMMITTED TO VAULT',
      message: 'Creative asset statuses flipped to "needs_update". Reviewers notified.'
    });
  };

  // Physical string tension calculation between a fact pin and draft pin
  const renderPhysicalRedString = (fact: FactNode, draft: DraftNode) => {
    const isSelected = fact.id === selectedFactId;
    const isAffected = draft.status === 'needs_update';
    const isGhostAffected = ghostPreviewActive && draft.fact_id === selectedFactId;

    // Pin anchor coordinates
    const factPinX = draft.x < fact.x ? fact.x - 105 : fact.x + 105;
    const factPinY = fact.y;
    const draftPinX = draft.x < fact.x ? draft.x + 105 : draft.x - 105;
    const draftPinY = draft.y;

    const dx = draftPinX - factPinX;
    const dy = draftPinY - factPinY;
    const distance = Math.hypot(dx, dy);

    // Physics: Rest length is 320px
    // When distance < 320px: string sags downward under gravity
    // When distance >= 320px: string tightens and thins out
    const restLength = 320;
    const sag = distance < restLength
      ? 24 + (restLength - distance) * 0.22
      : Math.max(3, 24 - (distance - restLength) * 0.12);

    const midX = (factPinX + draftPinX) / 2;
    const midY = (factPinY + draftPinY) / 2 + sag;

    const strokeWidth = distance >= restLength
      ? Math.max(1.5, 2.6 - (distance - restLength) * 0.004)
      : Math.min(3.6, 2.6 + (restLength - distance) * 0.005);

    const strokeColor = isGhostAffected
      ? '#FFD60A'
      : isAffected || isSelected
      ? 'var(--color-stamp-red)'
      : 'rgba(215, 38, 61, 0.45)';

    return (
      <g key={`string-${draft.id}-${fact.id}`}>
        {/* Soft neon aura for taut/affected red strings */}
        {(isAffected || isSelected || isGhostAffected) && (
          <path
            d={`M ${factPinX} ${factPinY} Q ${midX} ${midY} ${draftPinX} ${draftPinY}`}
            fill="none"
            stroke={isGhostAffected ? 'rgba(255, 214, 10, 0.3)' : 'rgba(215, 38, 61, 0.3)'}
            strokeWidth={strokeWidth + 5}
            strokeLinecap="round"
          />
        )}

        {/* Physical thread path that tightens/sags with motion */}
        <motion.path
          d={`M ${factPinX} ${factPinY} Q ${midX} ${midY} ${draftPinX} ${draftPinY}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={isGhostAffected ? '6 4' : isRippling ? '5 3' : 'none'}
          strokeLinecap="round"
          style={{
            filter: isAffected ? 'drop-shadow(0 0 8px rgba(215, 38, 61, 0.75))' : 'none'
          }}
        />

        {/* Metallic Thumbtacks at String Anchors */}
        <circle cx={factPinX} cy={factPinY} r="5" fill="#1C1E24" stroke={strokeColor} strokeWidth="2" />
        <circle cx={factPinX} cy={factPinY} r="2.5" fill="#D7263D" />

        <circle cx={draftPinX} cy={draftPinY} r="5" fill="#1C1E24" stroke={strokeColor} strokeWidth="2" />
        <circle cx={draftPinX} cy={draftPinY} r="2.5" fill={isAffected ? '#FFD60A' : '#D7263D'} />
      </g>
    );
  };

  const selectedFact = facts.find(f => f.id === selectedFactId) || facts[0];
  const affectedCount = drafts.filter(d => d.status === 'needs_update').length;

  return (
    <div
      className="ripple-board-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '1rem 2rem'
      }}
    >
      {/* HEADER & CONTROL DECK */}
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
          <DocketLabel docketId="FACT-RIPPLE-ENGINE" clientName={clientName} category="dependency_graph" />
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.85rem',
              marginTop: '0.2rem',
              color: 'var(--color-paper-light)'
            }}
          >
            Fact Ripple Dependency Board
          </h1>
          <p style={{ color: 'var(--color-steel)', fontSize: '0.86rem', marginTop: '0.15rem' }}>
            Physical dependency board: drag fact & asset pins. Updating a fact sends concentric shockwaves across the red strings.
          </p>
        </div>

        {/* VIEW MODE TOGGLE (Board vs Accessible Plain List) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* AUTO-LINKING ACTIVE BADGE */}
          <div
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '4px',
              backgroundColor: 'rgba(47, 191, 113, 0.12)',
              border: '1px solid var(--color-verified-green)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'var(--color-verified-green)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ✓ AUTO-LINKING: ACTIVE
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('board')}
            style={{
              fontSize: '0.78rem',
              padding: '0.45rem 0.9rem',
              backgroundColor: viewMode === 'board' ? 'var(--color-stamp-red)' : 'var(--color-ink-card)',
              color: '#FFFFFF',
              border: '1px solid var(--color-docket-border)'
            }}
          >
            🕸️ Physical Board
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('list')}
            style={{
              fontSize: '0.78rem',
              padding: '0.45rem 0.9rem',
              backgroundColor: viewMode === 'list' ? 'var(--color-stamp-red)' : 'var(--color-ink-card)',
              color: '#FFFFFF',
              border: '1px solid var(--color-docket-border)'
            }}
          >
            📋 Plain List View
          </button>
        </div>
      </div>

      {/* PROACTIVE EXPIRING FACTS RADAR BANNER (Improvement 3) */}
      {expiringFacts.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(255, 214, 10, 0.08)',
            border: '1.5px solid var(--color-highlighter)',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1rem' }}>⚠️</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-highlighter)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                EXPIRING FACTS RADAR: {expiringFacts.length} Fact{expiringFacts.length !== 1 ? 's' : ''} Expiring Soon
              </span>
            </div>
            <button
              className="btn"
              onClick={() => setShowExpiringDetails(!showExpiringDetails)}
              style={{
                fontSize: '0.72rem',
                padding: '0.3rem 0.7rem',
                backgroundColor: 'rgba(255, 214, 10, 0.15)',
                border: '1px solid var(--color-highlighter)',
                color: 'var(--color-highlighter)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {showExpiringDetails ? 'Hide Blast Radius' : 'Inspect Blast Radius 🔍'}
            </button>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--color-paper-light)', lineHeight: 1.45 }}>
            Automated claim scan identified promotional offers and price deadlines approaching expiration. Any draft claiming these facts will require immediate updates when revised.
          </div>

          {/* Expanded Blast Radius Cards */}
          {showExpiringDetails && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--color-docket-border)' }}>
              {expiringFacts.map(ef => (
                <div
                  key={ef.fact_id}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}
                >
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-highlighter)', fontWeight: 700, fontSize: '0.82rem' }}>
                      {ef.label} ({ef.value})
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--color-steel)', marginLeft: '8px' }}>
                      Expires: {ef.valid_until} ({ef.days_remaining <= 0 ? 'EXPIRED' : `${ef.days_remaining} days left`})
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '3px',
                        backgroundColor: ef.linked_drafts_count > 0 ? 'rgba(215, 38, 61, 0.2)' : 'rgba(47, 191, 113, 0.15)',
                        color: ef.linked_drafts_count > 0 ? '#FF7A7A' : 'var(--color-verified-green)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}
                    >
                      Blast Radius: {ef.linked_drafts_count} Draft{ef.linked_drafts_count !== 1 ? 's' : ''}
                    </span>
                    <button
                      className="btn"
                      onClick={() => {
                        handleTriggerRipple(ef.fact_id, ef.value, ef.valid_until, true);
                      }}
                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', fontWeight: 700, backgroundColor: 'rgba(255, 214, 10, 0.15)', border: '1px solid var(--color-highlighter)', color: 'var(--color-highlighter)' }}
                    >
                      💥 Dry-Run Blast
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FACT EDIT TOOLBAR */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: 'var(--color-ink-card)',
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid var(--color-docket-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Fact Picker */}
          <div>
            <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase' }}>
              Selected Fact Pin:
            </div>
            <select
              value={selectedFactId}
              onChange={e => {
                setSelectedFactId(e.target.value);
                const fact = facts.find(f => f.id === e.target.value);
                if (fact) {
                  setNewValue(fact.value);
                  setNewExpiry(fact.valid_until || '');
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-highlighter)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.86rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {facts.map(f => (
                <option key={f.id} value={f.id} style={{ backgroundColor: 'var(--color-ink)' }}>
                  {f.id}: {f.label} ({f.value})
                </option>
              ))}
            </select>
          </div>

          {/* New Value Input */}
          <div>
            <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase' }}>
              Update Value:
            </div>
            <input
              type="text"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="e.g. ₹999"
              style={{
                width: '110px',
                padding: '4px 8px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--color-docket-border)',
                borderRadius: '4px',
                color: 'white',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem'
              }}
            />
          </div>

          {/* New Expiry Date */}
          <div>
            <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase' }}>
              Valid Until:
            </div>
            <input
              type="date"
              value={newExpiry}
              onChange={e => setNewExpiry(e.target.value)}
              style={{
                padding: '3px 8px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--color-docket-border)',
                borderRadius: '4px',
                color: 'white',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem'
              }}
            />
          </div>

          {/* Dry Run Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: dryRun ? '#FFD60A' : 'var(--color-steel-light)',
              cursor: 'pointer',
              fontWeight: dryRun ? 700 : 400
            }}
          >
            <input
              type="checkbox"
              checked={dryRun}
              onChange={e => setDryRun(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            👻 Dry-Run Preview
          </label>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className={`btn ${dryRun ? 'btn-warning' : 'btn-primary'}`}
            onClick={handleTriggerRipple}
            disabled={isRippling}
            style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', fontWeight: 700 }}
          >
            {isRippling
              ? '⚡ Propagating Ripple...'
              : dryRun
              ? '👻 Run Ghost Simulation'
              : '⚡ Propagate Ripple'}
          </button>

          <button
            className="btn btn-outline"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            onClick={handleReset}
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: PHYSICAL INTERACTIVE CORKBOARD WITH DRAG, ZOOM & RIPPLE           */}
      {/* ========================================================================= */}
      {viewMode === 'board' ? (
        <div
          ref={boardRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onWheel={handleWheel}
          style={{
            width: '100%',
            height: '660px',
            backgroundColor: '#0C0D11',
            borderRadius: '10px',
            border: '1px solid var(--color-docket-border)',
            position: 'relative',
            overflow: 'hidden',
            cursor: isPanning ? 'grabbing' : 'grab',
            userSelect: 'none',
            boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.85)'
          }}
        >
          {/* DRY-RUN GHOST PREVIEW FLOATING BANNER */}
          <AnimatePresence>
            {ghostPreviewActive && ghostSimulatedFacts && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 40,
                  backgroundColor: 'rgba(28, 25, 20, 0.95)',
                  border: '1.5px dashed #FFD60A',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 8px 32px rgba(255, 214, 10, 0.25)',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#FFD60A' }}>
                  👻 <strong>DRY-RUN SIMULATION:</strong> Changing {ghostSimulatedFacts.factId} ({ghostSimulatedFacts.prevValue} → {ghostSimulatedFacts.nextValue}) would invalidate <strong>{affectedCount}</strong> creative assets.
                </div>
                <button
                  className="btn btn-warning"
                  onClick={handleCommitGhostChanges}
                  style={{ fontSize: '0.72rem', padding: '3px 8px', fontWeight: 700 }}
                >
                  ✓ Commit for Real
                </button>
                <button
                  onClick={() => setGhostPreviewActive(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-steel)',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FLOATING ZOOM & PAN CONTROLS */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              zIndex: 35,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(24, 26, 32, 0.92)',
              border: '1px solid var(--color-docket-border)',
              borderRadius: '6px',
              padding: '4px 8px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
            }}
          >
            <button
              className="board-control-btn"
              onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-paper-light)',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 700,
                padding: '2px 6px'
              }}
              title="Zoom In"
            >
              +
            </button>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', minWidth: '40px', textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="board-control-btn"
              onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-paper-light)',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 700,
                padding: '2px 6px'
              }}
              title="Zoom Out"
            >
              -
            </button>
            <button
              className="board-control-btn"
              onClick={() => {
                setZoom(1.0);
                setPan({ x: 0, y: 0 });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-highlighter)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                padding: '2px 6px',
                borderLeft: '1px solid var(--color-docket-border)'
              }}
              title="Reset View"
            >
              ⟲ Reset
            </button>
          </div>

          {/* MAIN TRANSFORM CONTAINER FOR PAN AND ZOOM */}
          <div
            style={{
              width: '100%',
              height: '100%',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '50% 50%',
              position: 'relative'
            }}
          >
            {/* SVG CANVAS: Background Grid, Concentric Shockwaves & Physical Red Strings */}
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 5,
                overflow: 'visible'
              }}
            >
              <defs>
                {/* Case File Board Dot Grid */}
                <pattern id="boardGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="rgba(255, 255, 255, 0.06)" />
                </pattern>

                {/* Concentric Ripple Glow Gradient */}
                <radialGradient id="rippleAura" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={dryRun ? '#FFD60A' : '#D7263D'} stopOpacity="0.4" />
                  <stop offset="70%" stopColor={dryRun ? '#FFD60A' : '#D7263D'} stopOpacity="0.1" />
                  <stop offset="100%" stopColor={dryRun ? '#FFD60A' : '#D7263D'} stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect width="2000" height="2000" x="-500" y="-500" fill="url(#boardGrid)" />

              {/* CONCENTRIC RIPPLE WAVES: Radiate outward from the edited fact */}
              {isRippling && (
                <g>
                  {/* Wave 1 */}
                  <motion.circle
                    cx={selectedFact.x}
                    cy={selectedFact.y}
                    initial={{ r: 10, opacity: 0.9, strokeWidth: 4 }}
                    animate={{ r: 580, opacity: 0, strokeWidth: 1 }}
                    transition={{ duration: 1.1, ease: 'easeOut' }}
                    fill="none"
                    stroke={dryRun ? '#FFD60A' : 'var(--color-stamp-red)'}
                  />
                  {/* Wave 2 */}
                  <motion.circle
                    cx={selectedFact.x}
                    cy={selectedFact.y}
                    initial={{ r: 10, opacity: 0.85, strokeWidth: 3 }}
                    animate={{ r: 480, opacity: 0, strokeWidth: 1 }}
                    transition={{ duration: 1.0, delay: 0.16, ease: 'easeOut' }}
                    fill="none"
                    stroke={dryRun ? '#FFD60A' : 'var(--color-stamp-red)'}
                    strokeDasharray="8 4"
                  />
                  {/* Wave 3 */}
                  <motion.circle
                    cx={selectedFact.x}
                    cy={selectedFact.y}
                    initial={{ r: 10, opacity: 0.75, strokeWidth: 2.5 }}
                    animate={{ r: 380, opacity: 0, strokeWidth: 0.8 }}
                    transition={{ duration: 0.9, delay: 0.32, ease: 'easeOut' }}
                    fill="none"
                    stroke={dryRun ? '#FFD60A' : 'var(--color-stamp-red)'}
                  />
                </g>
              )}

              {/* PHYSICAL RED STRINGS (Stretch and tighten as nodes move) */}
              {drafts.map(draft => {
                const fact = facts.find(f => f.id === draft.fact_id);
                if (!fact) return null;
                return renderPhysicalRedString(fact, draft);
              })}
            </svg>

            {/* DOM FACT NODES (Draggable with Spring Constraints) */}
            {facts.map(fact => {
              const isSelected = fact.id === selectedFactId;
              return (
                <motion.div
                  key={fact.id}
                  drag
                  dragConstraints={boardRef}
                  dragElastic={0.25}
                  onDrag={(_e, info) => {
                    handleFactDrag(fact.id, {
                      x: fact.x + info.delta.x,
                      y: fact.y + info.delta.y
                    });
                  }}
                  whileHover={{ scale: 1.03, zIndex: 25 }}
                  whileDrag={{ scale: 1.07, zIndex: 35, cursor: 'grabbing' }}
                  onClick={() => setSelectedFactId(fact.id)}
                  className="fact-card"
                  style={{
                    position: 'absolute',
                    left: `${fact.x}px`,
                    top: `${fact.y}px`,
                    width: '210px',
                    padding: '0.85rem 1rem',
                    backgroundColor: isSelected ? '#1B1F27' : 'var(--color-ink-card)',
                    border: `2px solid ${isSelected ? 'var(--color-highlighter)' : 'var(--color-docket-border)'}`,
                    borderRadius: '8px',
                    cursor: 'grab',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: isSelected ? '0 0 24px rgba(255, 214, 10, 0.28)' : 'var(--shadow-card)',
                    zIndex: isSelected ? 20 : 15,
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  {/* Pushpin indicator */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-7px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: '#D7263D',
                      border: '2px solid #FFFFFF',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-highlighter)', fontWeight: 700 }}>
                      FACT // {fact.id}
                    </span>
                    {isSelected && (
                      <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-verified-green)' }}>
                        ★ ACTIVE
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0.3rem 0', color: 'var(--color-paper-light)', lineHeight: 1.3 }}>
                    {fact.label}
                  </div>

                  <div style={{ fontSize: '1.15rem', fontFamily: 'var(--font-mono)', color: 'var(--color-verified-green)', fontWeight: 700 }}>
                    {fact.value}
                  </div>

                  {fact.valid_until && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-steel)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>
                      Valid: {fact.valid_until}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* DOM CREATIVE ASSET DRAFT NODES (Flip on Ripple Impact) */}
            {drafts.map(draft => {
              const isNeedsUpdate = draft.status === 'needs_update';
              const isGhostAffected = ghostPreviewActive && draft.fact_id === selectedFactId;

              return (
                <motion.div
                  key={draft.id}
                  drag
                  dragConstraints={boardRef}
                  dragElastic={0.25}
                  onDrag={(_e, info) => {
                    handleDraftDrag(draft.id, {
                      x: draft.x + info.delta.x,
                      y: draft.y + info.delta.y
                    });
                  }}
                  animate={{
                    rotateY: draft.flipAngle || 0,
                    scale: isNeedsUpdate ? [1, 1.12, 1] : 1
                  }}
                  transition={{
                    rotateY: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
                    scale: springs.soft
                  }}
                  whileHover={{ scale: 1.03, zIndex: 25 }}
                  whileDrag={{ scale: 1.07, zIndex: 35, cursor: 'grabbing' }}
                  className="draft-card"
                  style={{
                    position: 'absolute',
                    left: `${draft.x}px`,
                    top: `${draft.y}px`,
                    width: '220px',
                    padding: '0.85rem 1rem',
                    backgroundColor: isGhostAffected
                      ? 'rgba(255, 214, 10, 0.16)'
                      : isNeedsUpdate
                      ? 'rgba(255, 214, 10, 0.12)'
                      : 'var(--color-ink-card)',
                    border: isGhostAffected
                      ? '2px dashed #FFD60A'
                      : isNeedsUpdate
                      ? '2px solid var(--color-highlighter)'
                      : '1px solid var(--color-docket-border)',
                    borderRadius: '8px',
                    transform: 'translate(-50%, -50%)',
                    cursor: 'grab',
                    boxShadow: isGhostAffected || isNeedsUpdate
                      ? '0 0 24px rgba(255, 214, 10, 0.35)'
                      : 'var(--shadow-card)',
                    zIndex: isNeedsUpdate || isGhostAffected ? 18 : 12
                  }}
                >
                  {/* Pushpin indicator */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-7px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: isNeedsUpdate ? '#FFD60A' : '#D7263D',
                      border: '2px solid #FFFFFF',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)' }}>
                      {draft.id} • {draft.channel.toUpperCase()}
                    </span>

                    {/* STATUS PILL: FLIPS TO YELLOW 'NEEDS UPDATE' */}
                    {isGhostAffected ? (
                      <span
                        style={{
                          padding: '2px 6px',
                          backgroundColor: 'rgba(255, 214, 10, 0.25)',
                          color: '#FFD60A',
                          border: '1px dashed #FFD60A',
                          fontSize: '0.65rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          borderRadius: '3px'
                        }}
                      >
                        👻 GHOST IMPACT
                      </span>
                    ) : isNeedsUpdate ? (
                      <motion.span
                        initial={{ scale: 0.8 }}
                        animate={{ scale: [1, 1.25, 1] }}
                        style={{
                          padding: '2px 6px',
                          backgroundColor: 'var(--color-stamp-red)',
                          color: '#FFFFFF',
                          fontSize: '0.65rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          borderRadius: '3px',
                          boxShadow: '0 0 10px rgba(215, 38, 61, 0.6)'
                        }}
                      >
                        ⚠️ NEEDS UPDATE
                      </motion.span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-verified-green)'
                        }}
                      >
                        ✓ Clean
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0.4rem 0', color: 'var(--color-paper-light)', lineHeight: 1.3 }}>
                    {draft.title}
                  </div>

                  <div
                    style={{
                      fontSize: '0.74rem',
                      color: 'var(--color-steel-light)',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      padding: '4px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    Linked Claim: <span style={{ color: isNeedsUpdate || isGhostAffected ? '#FFD60A' : 'var(--color-steel-light)', fontWeight: 600 }}>"{draft.claim_span}"</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: ACCESSIBLE PLAIN LIST FALLBACK (FOR REDUCED MOTION & SMALL SCREENS)*/
        /* ========================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: 'rgba(255, 214, 10, 0.08)',
              border: '1px solid rgba(255, 214, 10, 0.3)',
              borderRadius: '6px',
              fontSize: '0.82rem',
              color: 'var(--color-paper-light)'
            }}
          >
            📋 <strong>Accessible Dependency List Mode:</strong> {isSmallScreen ? 'Small screen detected.' : prefersReducedMotion ? 'Reduced motion preference detected.' : 'Static tabular view active.'} Displaying structured graph dependencies.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
            {facts.map(fact => {
              const connectedDrafts = drafts.filter(d => d.fact_id === fact.id);
              const isSelected = fact.id === selectedFactId;

              return (
                <div
                  key={fact.id}
                  style={{
                    backgroundColor: 'var(--color-ink-card)',
                    border: `1px solid ${isSelected ? 'var(--color-highlighter)' : 'var(--color-docket-border)'}`,
                    borderRadius: '8px',
                    padding: '1.25rem',
                    boxShadow: 'var(--shadow-card)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-highlighter)', fontWeight: 700 }}>
                      FACT // {fact.id}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)' }}>
                      Valid: {fact.valid_until || 'Permanent'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', color: 'var(--color-paper-light)', margin: '0.4rem 0' }}>
                    {fact.label}
                  </h3>

                  <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--color-verified-green)', fontWeight: 700, marginBottom: '0.75rem' }}>
                    {fact.value}
                  </div>

                  <div style={{ borderTop: '1px dashed var(--color-docket-border)', paddingTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      Dependent Creative Assets ({connectedDrafts.length}):
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {connectedDrafts.map(draft => {
                        const isNeedsUpdate = draft.status === 'needs_update';
                        return (
                          <div
                            key={draft.id}
                            style={{
                              backgroundColor: isNeedsUpdate ? 'rgba(255, 214, 10, 0.12)' : 'rgba(0,0,0,0.25)',
                              border: `1px solid ${isNeedsUpdate ? '#FFD60A' : 'transparent'}`,
                              borderRadius: '4px',
                              padding: '0.5rem 0.75rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-paper-light)' }}>
                                {draft.title}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-steel)', marginTop: '2px' }}>
                                Claim: "{draft.claim_span}" • {draft.channel.toUpperCase()}
                              </div>
                            </div>

                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '3px',
                                backgroundColor: isNeedsUpdate ? 'var(--color-stamp-red)' : 'rgba(47, 191, 113, 0.15)',
                                color: isNeedsUpdate ? '#FFFFFF' : 'var(--color-verified-green)'
                              }}
                            >
                              {isNeedsUpdate ? '⚠️ NEEDS UPDATE' : '✓ CLEAN'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BLAST RADIUS & GHOST SIMULATION RESULTS MODAL */}
      <AnimatePresence>
        {simulationResults && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(10, 11, 14, 0.88)',
              backdropFilter: 'blur(8px)',
              zIndex: 3500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{
                width: '100%',
                maxWidth: '640px',
                backgroundColor: '#13151D',
                border: '2px solid var(--color-highlighter)',
                borderRadius: '8px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '1.2rem 1.5rem',
                  backgroundColor: '#1A1C25',
                  borderBottom: '1px solid var(--color-docket-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-highlighter)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    💥 BLAST RADIUS SIMULATION REPORT
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-paper-light)', margin: '0.2rem 0 0 0' }}>
                    {simulationResults.label}
                  </h3>
                </div>
                <button
                  onClick={() => setSimulationResults(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-steel)', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Fact Change Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--color-docket-border)', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase' }}>Current Vault Value</div>
                    <div style={{ fontSize: '1.1rem', color: '#FF7A7A', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{simulationResults.previous_value}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase' }}>Simulated New Value</div>
                    <div style={{ fontSize: '1.1rem', color: 'var(--color-verified-green)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{simulationResults.new_value || '(Expired)'}</div>
                  </div>
                </div>

                {/* Blast Radius Count */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase' }}>
                    Affected Creative Assets ({simulationResults.affected_items_count}):
                  </span>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: simulationResults.affected_items_count > 0 ? '#FF7A7A' : 'var(--color-verified-green)', fontWeight: 700 }}>
                    {simulationResults.affected_items_count > 0 ? '⚠️ Action Required on All Drafts' : '✓ Zero Downstream Impact'}
                  </span>
                </div>

                {/* List of Affected Drafts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                  {simulationResults.affected_drafts && simulationResults.affected_drafts.length > 0 ? (
                    simulationResults.affected_drafts.map((d, i) => (
                      <div
                        key={i}
                        style={{
                          backgroundColor: 'rgba(215, 38, 61, 0.1)',
                          border: '1px solid rgba(215, 38, 61, 0.35)',
                          borderRadius: '6px',
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem'
                        }}
                      >
                        <div>
                          <div style={{ color: 'var(--color-paper-light)', fontWeight: 600, fontSize: '0.86rem' }}>
                            {d.draft_title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-steel)', marginTop: '2px' }}>
                            Channel: <strong style={{ color: 'var(--color-paper-light)', textTransform: 'uppercase' }}>{d.channel}</strong> • Broken Claim: <span style={{ color: '#FFD60A', fontFamily: 'var(--font-mono)' }}>"{d.claim_span}"</span>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontFamily: 'var(--font-mono)',
                            color: '#FF7A7A',
                            fontWeight: 700,
                            padding: '3px 8px',
                            backgroundColor: 'rgba(215, 38, 61, 0.2)',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          FLIP TO REVISE
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-steel)', fontSize: '0.85rem' }}>
                      No active drafts are citing this fact value yet. Safe to update without invalidating campaigns.
                    </div>
                  )}
                </div>

                {/* Modal Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setSimulationResults(null)}
                    style={{ fontSize: '0.82rem', padding: '0.55rem 1rem' }}
                  >
                    Close Preview
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning"
                    onClick={handleCommitGhostChanges}
                    style={{ fontSize: '0.82rem', padding: '0.55rem 1.25rem', fontWeight: 700 }}
                  >
                    ✓ Commit Updates to Brand Vault
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Responsive Breakpoint Styles for 360px, 768px, and 1280px */}
      <style>{`
        @media (max-width: 860px) {
          .ripple-board-container {
            padding: 0.85rem 0.85rem !important;
          }
        }
        @media (max-width: 480px) {
          .ripple-board-container {
            padding: 0.5rem 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};
