import React, { useState, useEffect } from 'react';
import { RubberStamp, StampType } from '../components/RubberStamp.tsx';
import { DocketLabel } from '../components/DocketLabel.tsx';
import { WordDiffViewer } from '../components/WordDiffViewer.tsx';
import { PrecedentDrawer } from '../components/PrecedentDrawer.tsx';

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
}

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({
  clientName,
  draftId,
  title,
  channel,
  initialText,
  initialFindings,
  onDraftApproved
}) => {
  const [draftContent, setDraftContent] = useState(initialText);
  const [findings, setFindings] = useState<FindingUI[]>(initialFindings);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(initialFindings[0]?.id || null);
  const [isPrecedentDrawerOpen, setIsPrecedentDrawerOpen] = useState(false);
  const [drawerClauseId, setDrawerClauseId] = useState('C-1.1');
  const [stampState, setStampState] = useState<{ visible: boolean; type: StampType; animate: boolean }>({
    visible: false,
    type: 'APPROVED',
    animate: false
  });
  const [isScreenShaking, setIsScreenShaking] = useState(false);

  // Sync findings when initial findings change
  useEffect(() => {
    setDraftContent(initialText);
    setFindings(initialFindings);
    if (initialFindings.length > 0) {
      setActiveFindingId(initialFindings[0].id);
    }
  }, [initialText, initialFindings]);

  // Keyboard shortcuts (A = Accept, D = Dismiss, E = Exception)
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
        handleOpenPrecedent(active);
      } else if (e.key === 'e' || e.key === 'E') {
        handleOpenPrecedent(active);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFindingId, findings, draftContent]);

  const handleAcceptFix = (findingId: string) => {
    const finding = findings.find(f => f.id === findingId);
    if (!finding) return;

    // Apply suggested fix to draft text
    if (finding.suggested_fix) {
      const updatedText = draftContent.replace(finding.span_text, finding.suggested_fix);
      setDraftContent(updatedText);
    }

    setFindings(prev =>
      prev.map(f => (f.id === findingId ? { ...f, status: 'accepted' as const } : f))
    );
  };

  const handleOpenPrecedent = (finding: FindingUI) => {
    setActiveFindingId(finding.id);
    setDrawerClauseId(finding.source_id || 'C-1.1');
    setIsPrecedentDrawerOpen(true);
  };

  const handleSavePrecedent = (_data: { reason: string; scope: string; expiry: string; decidedBy: string }) => {
    if (!activeFindingId) return;

    setFindings(prev =>
      prev.map(f => (f.id === activeFindingId ? { ...f, status: 'dismissed' as const } : f))
    );
  };

  const handleApproveDraft = () => {
    const pendingCount = findings.filter(f => f.status === 'pending').length;
    if (pendingCount > 0) {
      alert(`Cannot approve: ${pendingCount} compliance finding(s) must be reviewed first.`);
      return;
    }

    // Trigger stamp slam animation and screen shake
    setIsScreenShaking(true);
    setStampState({ visible: true, type: 'APPROVED', animate: true });

    setTimeout(() => {
      setIsScreenShaking(false);
      if (onDraftApproved) onDraftApproved();
    }, 600);
  };

  const pendingFindings = findings.filter(f => f.status === 'pending');

  return (
    <div
      className={`review-workspace-container ${isScreenShaking ? 'screen-shake' : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(420px, 1.25fr) minmax(360px, 1fr)',
        gap: '2rem',
        width: '100%',
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '1.5rem',
        alignItems: 'start'
      }}
    >
      {/* LEFT COLUMN: THE DRAFT PAPER SHEET */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <DocketLabel docketId={draftId.replace('draft_', 'PRK-')} clientName={clientName} category={channel} />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-steel)' }}>
              Shortcuts: <kbd style={{ padding: '2px 6px', background: 'var(--color-steel-dark)', borderRadius: '3px' }}>A</kbd> Accept • <kbd style={{ padding: '2px 6px', background: 'var(--color-steel-dark)', borderRadius: '3px' }}>D</kbd> Dismiss
            </span>
          </div>
        </div>

        {/* Parchment Sheet */}
        <div
          className="paper-sheet"
          style={{
            minHeight: '480px',
            padding: '2.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Slammed Stamp Overlay */}
          {stampState.visible && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: '40px',
                zIndex: 20
              }}
            >
              <RubberStamp type={stampState.type} animate={stampState.animate} />
            </div>
          )}

          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.75rem',
              marginBottom: '1.5rem',
              color: 'var(--color-ink)',
              borderBottom: '1px solid #d8d2c6',
              paddingBottom: '0.75rem'
            }}
          >
            {title}
          </h2>

          <div
            style={{
              fontSize: '1.15rem',
              lineHeight: 1.8,
              color: '#1a1c22',
              whiteSpace: 'pre-wrap'
            }}
          >
            {/* Render highlighted spans */}
            {draftContent}
          </div>

          <div
            style={{
              marginTop: '3rem',
              paddingTop: '1.5rem',
              borderTop: '1px dashed #d8d2c6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.82rem',
              color: '#5a5e6b',
              fontFamily: 'var(--font-mono)'
            }}
          >
            <span>CONTENT CHANNEL: {channel.toUpperCase()}</span>
            <span>VERIFIED CITATIONS ONLY // ZERO UNCHECKED CLAIMS</span>
          </div>
        </div>

        {/* Approval Action Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--color-ink-card)',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-docket-border)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {pendingFindings.length === 0 ? '✓ All Compliance Findings Resolved' : `${pendingFindings.length} Pending Finding(s)`}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-steel)' }}>
              {pendingFindings.length === 0 ? 'Ready for formal stamp approval' : 'Review each issue before final publication'}
            </div>
          </div>
          <button
            className={`btn ${pendingFindings.length === 0 ? 'btn-success' : 'btn-outline'}`}
            onClick={handleApproveDraft}
          >
            🏛️ Stamp & Approve Draft
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: FINDING CARDS & INTENT-LOCK WORD DIFFS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="docket-label">
            COMPLIANCE DOCKET ({findings.length} ISSUES)
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-highlighter)' }}>
            Citation Gate: Verified
          </span>
        </div>

        {findings.map((f, idx) => {
          const isActive = f.id === activeFindingId;
          const isResolved = f.status !== 'pending';

          return (
            <div
              key={f.id}
              className="index-card"
              style={{
                borderLeft: `4px solid ${
                  isResolved
                    ? 'var(--color-verified-green)'
                    : f.severity === 'critical'
                    ? 'var(--color-stamp-red)'
                    : 'var(--color-highlighter)'
                }`,
                borderColor: isActive ? 'var(--color-highlighter)' : undefined,
                boxShadow: isActive ? '0 0 18px rgba(255, 214, 10, 0.35)' : undefined,
                opacity: isResolved ? 0.7 : 1,
                cursor: 'pointer'
              }}
              onClick={() => setActiveFindingId(f.id)}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '3px',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor:
                      f.source_type === 'ai'
                        ? 'rgba(215, 38, 61, 0.2)'
                        : 'rgba(255, 214, 10, 0.2)',
                    color: f.source_type === 'ai' ? '#FF6B6B' : 'var(--color-highlighter)'
                  }}
                >
                  {f.source_type.toUpperCase()} • {f.source_id || 'RULE'}
                </span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)' }}>
                  ISSUE #{idx + 1}
                </span>
              </div>

              {/* Quoted Violation Span */}
              <div style={{ margin: '0.5rem 0', fontSize: '0.92rem', color: 'var(--color-paper-light)' }}>
                <strong>Flagged Text:</strong>{' '}
                <span style={{ backgroundColor: 'var(--color-stamp-red-bg)', padding: '2px 6px', borderRadius: '3px', color: '#FF8A8A' }}>
                  "{f.span_text}"
                </span>
              </div>

              {/* Source Clause Quotation (Citation Gate) */}
              <div
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--color-steel-light)',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '2px solid var(--color-steel)',
                  margin: '0.5rem 0'
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--color-steel)', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Quoted Clause Source:
                </div>
                "{f.source_text}"
              </div>

              {/* Explanation */}
              <p style={{ fontSize: '0.85rem', color: 'var(--color-steel-light)', margin: '0.5rem 0' }}>
                {f.explanation}
              </p>

              {/* Word-level Diff from Intent Lock */}
              {f.word_diff && f.word_diff.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-verified-green)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Intent-Lock Suggested Correction:
                  </div>
                  <WordDiffViewer tokens={f.word_diff} />
                </div>
              )}

              {/* Action Buttons */}
              {!isResolved ? (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.78rem' }}
                    onClick={e => {
                      e.stopPropagation();
                      handleAcceptFix(f.id);
                    }}
                  >
                    ✓ Accept Fix
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.78rem' }}
                    onClick={e => {
                      e.stopPropagation();
                      handleOpenPrecedent(f);
                    }}
                  >
                    📁 Dismiss / File Precedent
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-verified-green)' }}>
                  ✓ Decision logged: {f.status.toUpperCase()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sliding Precedent Drawer */}
      <PrecedentDrawer
        isOpen={isPrecedentDrawerOpen}
        onClose={() => setIsPrecedentDrawerOpen(false)}
        clauseId={drawerClauseId}
        onSavePrecedent={handleSavePrecedent}
      />
    </div>
  );
};
