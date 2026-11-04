import React, { useState, useEffect } from 'react';
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
  const [isPrecedentDrawerOpen, setIsPrecedentDrawerOpen] = useState(false);
  const [drawerClauseId, setDrawerClauseId] = useState('C-1.1');
  const [stampState, setStampState] = useState<{ visible: boolean; type: StampType; animate: boolean }>({
    visible: false,
    type: 'APPROVED',
    animate: false
  });

  // Sync findings when initial findings change
  useEffect(() => {
    setDraftContent(initialText);
    setFindings(initialFindings);
    if (initialFindings.length > 0) {
      setActiveFindingId(initialFindings[0].id);
    }
  }, [initialText, initialFindings]);

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
        handleOpenPrecedent(active);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFindingId, findings, draftContent]);

  const handleAcceptFix = (findingId: string) => {
    const finding = findings.find(f => f.id === findingId);
    if (!finding) return;

    if (finding.suggested_fix) {
      const updatedText = draftContent.replace(finding.span_text, finding.suggested_fix);
      setDraftContent(updatedText);
    }

    setFindings(prev =>
      prev.map(f => (f.id === findingId ? { ...f, status: 'accepted' as const } : f))
    );
  };

  const handleOpenPrecedent = (finding: FindingUI) => {
    setDrawerClauseId(finding.source_id || 'C-1.1');
    setIsPrecedentDrawerOpen(true);
  };

  const handleSavePrecedent = (_data: { reason: string; scope: string; expiry: string; decidedBy: string }) => {
    if (activeFindingId) {
      setFindings(prev =>
        prev.map(f => (f.id === activeFindingId ? { ...f, status: 'dismissed' as const } : f))
      );
    }
    setIsPrecedentDrawerOpen(false);
  };


  const handleApproveDraft = () => {
    setStampState({ visible: true, type: 'APPROVED', animate: true });
    if (onDraftApproved) onDraftApproved();
  };

  const pendingFindings = findings.filter(f => f.status === 'pending');
  const isAllResolved = pendingFindings.length === 0;

  return (
    <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '1rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* COMBINED TOP CONTROL BAR: Header, Status, Client, Actions all in ONE clean row */}
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

          <span
            style={{
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              backgroundColor: isAllResolved ? 'rgba(47, 191, 113, 0.15)' : 'rgba(215, 38, 61, 0.15)',
              color: isAllResolved ? 'var(--color-verified-green)' : 'var(--color-stamp-red)',
              border: `1px solid ${isAllResolved ? 'var(--color-verified-green)' : 'var(--color-stamp-red)'}`
            }}
          >
            {isAllResolved ? '✓ ALL ISSUES RESOLVED' : `⚠️ ${pendingFindings.length} COMPLIANCE ISSUES`}
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
            style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', fontWeight: 700 }}
          >
            🏛️ Stamp & Approve Copy
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN SPLIT: Editor & Copy on Left, Compliance Docket on Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(400px, 1.2fr) minmax(360px, 1fr)',
          gap: '1.5rem',
          alignItems: 'start'
        }}
      >
        {/* LEFT COLUMN: THE EVALUATED COPY */}
        <div
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
            justifyContent: 'space-between'
          }}
        >
          {/* Slammed Stamp Overlay */}
          {stampState.visible && (
            <div style={{ position: 'absolute', top: '30px', right: '30px', zIndex: 20 }}>
              <RubberStamp type={stampState.type} animate={stampState.animate} />
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
              {draftContent}
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
        </div>

        {/* RIGHT COLUMN: FINDINGS DOCKET & INTENT-LOCK FIXES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-steel)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              COMPLIANCE AUDIT // {findings.length} FINDINGS
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-highlighter)' }}>
              Keyboard: <kbd style={{ padding: '1px 5px', background: 'var(--color-ink-card)', border: '1px solid var(--color-docket-border)', borderRadius: '3px' }}>A</kbd> Accept • <kbd style={{ padding: '1px 5px', background: 'var(--color-ink-card)', border: '1px solid var(--color-docket-border)', borderRadius: '3px' }}>D</kbd> Dismiss
            </span>
          </div>

          {findings.length === 0 ? (
            <div
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
            </div>
          ) : (
            findings.map((f, idx) => {
              const isActive = f.id === activeFindingId;
              const isResolved = f.status !== 'pending';

              return (
                <div
                  key={f.id}
                  style={{
                    backgroundColor: 'var(--color-ink-card)',
                    border: `1px solid ${isActive ? 'var(--color-highlighter)' : 'var(--color-docket-border)'}`,
                    borderLeft: `4px solid ${
                      isResolved
                        ? 'var(--color-verified-green)'
                        : f.severity === 'critical'
                        ? 'var(--color-stamp-red)'
                        : 'var(--color-highlighter)'
                    }`,
                    borderRadius: '8px',
                    padding: '1.25rem',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 0 16px rgba(255, 214, 10, 0.2)' : undefined,
                    opacity: isResolved ? 0.65 : 1,
                    cursor: 'pointer'
                  }}
                  onClick={() => setActiveFindingId(f.id)}
                >
                  {/* Finding Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '3px',
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        backgroundColor: f.source_type === 'ai' ? 'rgba(215, 38, 61, 0.2)' : 'rgba(255, 214, 10, 0.2)',
                        color: f.source_type === 'ai' ? '#FF6B6B' : 'var(--color-highlighter)',
                        textTransform: 'uppercase'
                      }}
                    >
                      {f.source_type.toUpperCase()} • {f.source_id || 'RULE'}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)' }}>
                      ISSUE #{idx + 1}
                    </span>
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

                  {/* Action Buttons */}
                  {!isResolved ? (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                        onClick={e => {
                          e.stopPropagation();
                          handleAcceptFix(f.id);
                        }}
                      >
                        ✓ Accept Fix
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenPrecedent(f);
                        }}
                      >
                        📁 Dismiss / Exception
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--color-verified-green)', fontWeight: 600 }}>
                      ✓ Decision logged: {f.status.toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })
          )}
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
