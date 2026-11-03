import React, { useState } from 'react';
import { DocketLabel } from '../components/DocketLabel.tsx';

interface FactNode {
  id: string;
  label: string;
  value: string;
  valid_until?: string | null;
  x: number;
  y: number;
}

interface DraftNode {
  id: string;
  title: string;
  channel: string;
  claim_span: string;
  status: 'clean' | 'needs_update';
  fact_id: string;
  x: number;
  y: number;
}

interface FactRippleBoardProps {
  clientId: string;
  clientName: string;
}

export const FactRippleBoard: React.FC<FactRippleBoardProps> = ({ clientName }) => {
  const [facts, setFacts] = useState<FactNode[]>([
    { id: 'F-KAV-01', label: 'Basic Health Checkup Price', value: '₹499', valid_until: '2026-12-31', x: 420, y: 150 },
    { id: 'F-KAV-02', label: 'Diwali Wellness Camp Price', value: '₹899', valid_until: '2026-11-05', x: 420, y: 320 },
    { id: 'F-KAV-03', label: 'NABL Accreditation Code', value: 'NABL-MC-2026-441', valid_until: '2028-01-01', x: 420, y: 490 }
  ]);

  const [drafts, setDrafts] = useState<DraftNode[]>([
    { id: 'D-01', title: 'Instagram Reel: Routine Care', channel: 'social', claim_span: '₹499', status: 'clean', fact_id: 'F-KAV-01', x: 120, y: 120 },
    { id: 'D-02', title: 'Diwali Email Blast #1', channel: 'email', claim_span: '₹899', status: 'clean', fact_id: 'F-KAV-02', x: 740, y: 260 },
    { id: 'D-03', title: 'Festive Poster A3 Print', channel: 'print', claim_span: 'Offer ends 2026-11-05', status: 'clean', fact_id: 'F-KAV-02', x: 740, y: 400 },
    { id: 'D-04', title: 'Press Release: Quality Standards', channel: 'pr', claim_span: 'NABL-MC-2026-441', status: 'clean', fact_id: 'F-KAV-03', x: 120, y: 460 }
  ]);

  const [selectedFactId, setSelectedFactId] = useState<string>('F-KAV-02');
  const [newValue, setNewValue] = useState('₹999');
  const [newExpiry, setNewExpiry] = useState('2026-11-20');
  const [isRippling, setIsRippling] = useState(false);
  const [dryRun, setDryRun] = useState(false);

  const handleTriggerRipple = () => {
    setIsRippling(true);

    setTimeout(() => {
      // Flip connected drafts to needs_update state
      setDrafts(prev =>
        prev.map(d => (d.fact_id === selectedFactId ? { ...d, status: 'needs_update' as const } : d))
      );

      if (!dryRun) {
        setFacts(prev =>
          prev.map(f =>
            f.id === selectedFactId ? { ...f, value: newValue, valid_until: newExpiry } : f
          )
        );
      }

      setIsRippling(false);
    }, 500);
  };

  const handleReset = () => {
    setDrafts(prev => prev.map(d => ({ ...d, status: 'clean' as const })));
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <DocketLabel docketId="FACT-RIPPLE-GRAPH" clientName={clientName} category="dependency_engine" />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginTop: '0.25rem', color: 'var(--color-paper-light)' }}>
            Fact Ripple Dependency Board
          </h1>
          <p style={{ color: 'var(--color-steel)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Interactive dependency board: claims in creative drafts link to verified facts. Changing a fact ripples outward via red strings.
          </p>
        </div>

        {/* Fact Edit Trigger Controls */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            backgroundColor: 'var(--color-ink-card)',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-docket-border)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-steel)', textTransform: 'uppercase' }}>Selected Fact:</div>
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
                fontSize: '0.88rem',
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

          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-steel)', textTransform: 'uppercase' }}>New Value / Date:</div>
            <input
              type="text"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              style={{
                width: '100px',
                padding: '4px 8px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--color-docket-border)',
                borderRadius: '3px',
                color: 'white',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-steel-light)', cursor: 'pointer' }}>
            <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
            Dry-Run
          </label>

          <button className="btn btn-primary" onClick={handleTriggerRipple}>
            ⚡ Propagate Ripple
          </button>

          <button className="btn btn-outline" style={{ padding: '0.5rem 0.8rem' }} onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>

      {/* SVG Canvas Board */}
      <div
        style={{
          width: '100%',
          height: '620px',
          backgroundColor: '#0D0E12',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-docket-border)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.8)'
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 960 620">
          <defs>
            {/* Subtle Grid Pattern */}
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Red Strings Connecting Facts to Drafts */}
          {drafts.map(draft => {
            const fact = facts.find(f => f.id === draft.fact_id);
            if (!fact) return null;

            const isConnectedToSelected = fact.id === selectedFactId;
            const isAffected = draft.status === 'needs_update';

            return (
              <g key={`string-${draft.id}-${fact.id}`}>
                {/* Tension String Path */}
                <path
                  d={`M ${fact.x + 90} ${fact.y + 40} Q ${(fact.x + draft.x) / 2} ${(fact.y + draft.y) / 2 - (isRippling ? 25 : 5)} ${draft.x + 90} ${draft.y + 40}`}
                  fill="none"
                  stroke={isAffected || isConnectedToSelected ? 'var(--color-stamp-red)' : 'rgba(138, 143, 152, 0.3)'}
                  strokeWidth={isAffected || isConnectedToSelected ? 2.5 : 1.2}
                  strokeDasharray={isRippling ? '4 2' : 'none'}
                  style={{
                    transition: 'all 0.3s ease',
                    filter: isAffected ? 'drop-shadow(0 0 6px rgba(215, 38, 61, 0.6))' : 'none'
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* DOM-rendered Fact Cards (Center) */}
        {facts.map(fact => {
          const isSelected = fact.id === selectedFactId;
          return (
            <div
              key={fact.id}
              onClick={() => setSelectedFactId(fact.id)}
              style={{
                position: 'absolute',
                left: `${fact.x}px`,
                top: `${fact.y}px`,
                width: '200px',
                padding: '0.85rem 1rem',
                backgroundColor: isSelected ? '#1E222B' : 'var(--color-ink-card)',
                border: `2px solid ${isSelected ? 'var(--color-highlighter)' : 'var(--color-docket-border)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transform: 'translate(-50%, -50%)',
                boxShadow: isSelected ? '0 0 20px rgba(255, 214, 10, 0.25)' : 'var(--shadow-card)',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
            >
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-highlighter)' }}>
                FACT // {fact.id}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--color-paper-light)' }}>
                {fact.label}
              </div>
              <div style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: 'var(--color-verified-green)', fontWeight: 700 }}>
                {fact.value}
              </div>
              {fact.valid_until && (
                <div style={{ fontSize: '0.7rem', color: 'var(--color-steel)', marginTop: '0.25rem' }}>
                  Expires: {fact.valid_until}
                </div>
              )}
            </div>
          );
        })}

        {/* DOM-rendered Draft & Creative Cards (Sides) */}
        {drafts.map(draft => {
          const isNeedsUpdate = draft.status === 'needs_update';
          return (
            <div
              key={draft.id}
              style={{
                position: 'absolute',
                left: `${draft.x}px`,
                top: `${draft.y}px`,
                width: '210px',
                padding: '0.85rem 1rem',
                backgroundColor: isNeedsUpdate ? 'rgba(255, 214, 10, 0.12)' : 'var(--color-ink-card)',
                border: `2px solid ${isNeedsUpdate ? 'var(--color-highlighter)' : 'var(--color-docket-border)'}`,
                borderRadius: 'var(--radius-md)',
                transform: 'translate(-50%, -50%)',
                boxShadow: isNeedsUpdate ? '0 0 22px rgba(255, 214, 10, 0.35)' : 'var(--shadow-card)',
                transition: 'all 0.3s ease',
                zIndex: 10
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)' }}>
                  {draft.id} • {draft.channel.toUpperCase()}
                </span>
                {isNeedsUpdate && (
                  <span
                    style={{
                      padding: '2px 6px',
                      backgroundColor: 'var(--color-stamp-red)',
                      color: 'white',
                      fontSize: '0.65rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      borderRadius: '2px'
                    }}
                  >
                    NEEDS UPDATE
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0.4rem 0', color: 'var(--color-paper-light)' }}>
                {draft.title}
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--color-steel-light)', backgroundColor: 'rgba(0,0,0,0.25)', padding: '4px 6px', borderRadius: '3px' }}>
                Linked Claim: <span style={{ color: isNeedsUpdate ? '#FFD60A' : 'var(--color-steel-light)', fontWeight: 600 }}>"{draft.claim_span}"</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
