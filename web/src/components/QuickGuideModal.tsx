import React from 'react';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 11, 14, 0.82)',
        backdropFilter: 'blur(6px)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--color-ink-surface)',
          border: '1px solid var(--color-docket-border)',
          borderRadius: '10px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--color-docket-border)',
            backgroundColor: 'var(--color-ink-card)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--color-highlighter)', fontSize: '1.1rem' }}>ⓘ</span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--color-paper-light)', fontWeight: 700 }}>
              Quick Project Guide
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-steel)',
              fontSize: '1.4rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', fontSize: '0.88rem', color: 'var(--color-paper-light)', lineHeight: 1.5 }}>
          {/* What is Parakh */}
          <div>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>
              What is Parakh (परख)?
            </div>
            <p style={{ margin: 0, color: 'var(--color-steel-light)', fontSize: '0.84rem' }}>
              An intelligent brand-governance platform for marketing agencies that review creative copy against strict brand guidelines, legal rules, and commercial facts.
            </p>
          </div>

          {/* The 3 Brand Vaults */}
          <div style={{ backgroundColor: 'var(--color-ink-card)', padding: '0.85rem 1rem', borderRadius: '6px', border: '1px solid var(--color-docket-border)' }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-highlighter)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>
              What are Kavach Health, VyaparSetu, and Mitti & Moon?
            </div>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--color-steel-light)', fontSize: '0.82rem' }}>
              They are <strong>3 distinct client brand vaults</strong> demonstrating how an agency isolates guidelines between different industries so rules never bleed into each other:
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', color: 'var(--color-paper-light)' }}>
              <li>
                <strong>Kavach Health:</strong> Healthtech diagnostics — strict clinical accuracy, zero fear-mongering, approved test package = ₹499.
              </li>
              <li>
                <strong>VyaparSetu:</strong> MSME Fintech — strict RBI compliance, no 'zero KYC loans', ₹2,500 Diwali cashback promo.
              </li>
              <li>
                <strong>Mitti & Moon:</strong> Ayurvedic skincare — honest beauty standards, no fake 'chemical-free' or 'instant whitening' claims.
              </li>
            </ul>
          </div>

          {/* Other Key Features */}
          <div>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>
              Key Features in This Project
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.8rem' }}>
              <div style={{ backgroundColor: 'var(--color-ink)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--color-docket-border)' }}>
                <strong style={{ color: 'var(--color-stamp-red)' }}>🛡️ Citation Gate:</strong>
                <div style={{ color: 'var(--color-steel)', fontSize: '0.76rem', marginTop: '2px' }}>Quotes exact handbook clauses. Zero hallucinated rules.</div>
              </div>

              <div style={{ backgroundColor: 'var(--color-ink)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--color-docket-border)' }}>
                <strong style={{ color: 'var(--color-highlighter)' }}>📁 Brand Case Law:</strong>
                <div style={{ color: 'var(--color-steel)', fontSize: '0.76rem', marginTop: '2px' }}>Remembers client verbal approvals so approved copy isn't re-flagged.</div>
              </div>

              <div style={{ backgroundColor: 'var(--color-ink)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--color-docket-border)' }}>
                <strong style={{ color: 'var(--color-verified-green)' }}>🕸️ Fact Ripple:</strong>
                <div style={{ color: 'var(--color-steel)', fontSize: '0.76rem', marginTop: '2px' }}>When a price changes, ripples across all linked campaigns.</div>
              </div>

              <div style={{ backgroundColor: 'var(--color-ink)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--color-docket-border)' }}>
                <strong style={{ color: '#64B5F6' }}>🩺 Guideline Debugger:</strong>
                <div style={{ color: 'var(--color-steel)', fontSize: '0.76rem', marginTop: '2px' }}>Finds and rewrites vague, conflicting rules in brand handbooks.</div>
              </div>
            </div>
          </div>

          {/* How to test */}
          <div style={{ borderTop: '1px dashed var(--color-docket-border)', paddingTop: '0.65rem', fontSize: '0.8rem', color: 'var(--color-steel)' }}>
            💡 <strong>Quick Test:</strong> Type or click <em>"⚡ Paste Sample Copy"</em> on the home screen, click <em>"Evaluate Copy"</em>, then click <em>"✓ Accept Fix"</em> to see word diffs replace violations in real time!
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid var(--color-docket-border)',
            backgroundColor: 'var(--color-ink-card)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            className="btn btn-primary"
            onClick={onClose}
            style={{ fontSize: '0.8rem', padding: '0.35rem 1rem' }}
          >
            Got it ✓
          </button>
        </div>
      </div>
    </div>
  );
};
