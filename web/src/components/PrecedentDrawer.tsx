import React, { useState } from 'react';

export interface PrecedentItem {
  id: string;
  clause_id: string;
  decision: string;
  reason: string;
  scope: string;
  expiry?: string | null;
  decided_by: string;
}

interface PrecedentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clauseId?: string;
  activePrecedents?: PrecedentItem[];
  onSavePrecedent: (data: { reason: string; scope: string; expiry: string; decidedBy: string }) => void;
  onConfirmPrecedent?: (precedentId: string) => void;
}

const REASON_CHIPS = [
  'Client approved on call',
  'One-time festive campaign exception',
  'Direct colloquial customer quote',
  'Statutory survey methodology linked',
  'Urgent seasonal health awareness alert'
];

export const PrecedentDrawer: React.FC<PrecedentDrawerProps> = ({
  isOpen,
  onClose,
  clauseId = 'C-1.1',
  activePrecedents = [],
  onSavePrecedent,
  onConfirmPrecedent
}) => {
  const [selectedChip, setSelectedChip] = useState(REASON_CHIPS[0]);
  const [customReason, setCustomReason] = useState('');
  const [scope, setScope] = useState<'this_campaign' | 'all_content'>('this_campaign');
  const [expiry, setExpiry] = useState('2026-12-31');
  const [decidedBy, setDecidedBy] = useState('Brand Governance Reviewer');
  const [showQuickCapture, setShowQuickCapture] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = customReason.trim() ? `${selectedChip} — ${customReason.trim()}` : selectedChip;
    onSavePrecedent({
      reason: finalReason,
      scope,
      expiry,
      decidedBy
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(16, 17, 20, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        transition: 'opacity 0.25s ease'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          backgroundColor: 'var(--color-ink-surface)',
          borderLeft: '1px solid var(--color-docket-border)',
          padding: '2rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="docket-label">BRAND CASE LAW // PRECEDENT STORE</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', marginTop: '0.25rem', color: 'var(--color-paper-light)' }}>
              {showQuickCapture ? 'Log Client Call Decision' : `File Precedent for ${clauseId}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-steel)',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {/* Toggle between Decision Filing and Matched Precedents */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${!showQuickCapture ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, padding: '0.5rem' }}
            onClick={() => setShowQuickCapture(false)}
          >
            File Precedent
          </button>
          <button
            className={`btn ${showQuickCapture ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, padding: '0.5rem' }}
            onClick={() => setShowQuickCapture(true)}
          >
            ⚡ 10-Sec Quick Capture
          </button>
        </div>

        {/* Existing Precedents Section */}
        {activePrecedents.length > 0 && !showQuickCapture && (
          <div style={{ border: '1px dashed var(--color-docket-border)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
            <span className="docket-label" style={{ color: 'var(--color-highlighter)' }}>
              MATCHED HISTORICAL PRECEDENTS ({activePrecedents.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              {activePrecedents.map(p => (
                <div
                  key={p.id}
                  style={{
                    backgroundColor: 'var(--color-ink-card)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--color-highlighter)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-steel)' }}>
                    <span>{p.decided_by}</span>
                    <span style={{ textTransform: 'uppercase' }}>Scope: {p.scope}</span>
                  </div>
                  <p style={{ fontSize: '0.88rem', margin: '0.5rem 0', color: 'var(--color-paper-light)' }}>
                    "{p.reason}"
                  </p>
                  {p.expiry && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-steel)' }}>
                      Valid until: {p.expiry}
                    </div>
                  )}
                  {onConfirmPrecedent && (
                    <button
                      className="btn btn-outline"
                      style={{ marginTop: '0.5rem', width: '100%', padding: '0.4rem', fontSize: '0.78rem' }}
                      onClick={() => onConfirmPrecedent(p.id)}
                    >
                      Confirm Precedent Applies
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filing Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="docket-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              REASON CHIPS (SELECT OR CUSTOMIZE)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {REASON_CHIPS.map(chip => (
                <button
                  type="button"
                  key={chip}
                  onClick={() => setSelectedChip(chip)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: selectedChip === chip ? 'var(--color-stamp-red)' : 'var(--color-docket-border)',
                    backgroundColor: selectedChip === chip ? 'var(--color-stamp-red-bg)' : 'transparent',
                    color: selectedChip === chip ? '#FFFFFF' : 'var(--color-steel-light)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="docket-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              ADDITIONAL NOTES / VERBAL AGREEMENT DETAILS
            </label>
            <textarea
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="e.g. Approved by client VP Marketing on Monday sync call for festive banner only..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--color-ink-card)',
                border: '1px solid var(--color-docket-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-paper-light)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="docket-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                SCOPE
              </label>
              <select
                value={scope}
                onChange={e => setScope(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  backgroundColor: 'var(--color-ink-card)',
                  border: '1px solid var(--color-docket-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-paper-light)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="this_campaign">This Campaign Only</option>
                <option value="all_content">All Brand Content</option>
              </select>
            </div>

            <div>
              <label className="docket-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                EXPIRY DATE
              </label>
              <input
                type="date"
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  backgroundColor: 'var(--color-ink-card)',
                  border: '1px solid var(--color-docket-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-paper-light)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div>
            <label className="docket-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              DECIDED BY (AUTHORIZER)
            </label>
            <input
              type="text"
              value={decidedBy}
              onChange={e => setDecidedBy(e.target.value)}
              placeholder="e.g. Dr. Anita Roy, Chief Medical Officer"
              style={{
                width: '100%',
                padding: '0.65rem',
                backgroundColor: 'var(--color-ink-card)',
                border: '1px solid var(--color-docket-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-paper-light)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.88rem'
              }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            📁 Save Precedent to Case File
          </button>
        </form>
      </div>
    </div>
  );
};
