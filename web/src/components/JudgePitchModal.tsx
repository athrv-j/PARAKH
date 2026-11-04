import React from 'react';

interface JudgePitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadShowcase: () => void;
}

export const JudgePitchModal: React.FC<JudgePitchModalProps> = ({
  isOpen,
  onClose,
  onLoadShowcase
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 11, 14, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          backgroundColor: 'var(--color-ink-surface)',
          border: '1.5px solid var(--color-highlighter)',
          borderRadius: '10px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--color-docket-border)',
            backgroundColor: 'var(--color-ink-card)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-highlighter)', letterSpacing: '2px' }}>
              ⚖️ HACKATHON JUDGE BRIEFING & SYSTEM OVERVIEW
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--color-paper-light)', margin: '0.2rem 0 0 0' }}>
              Parakh (परख) — The Memory of Every Brand Decision
            </h1>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-steel)',
              fontSize: '1.8rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', color: 'var(--color-paper-light)', lineHeight: '1.6' }}>
          {/* Executive Summary */}
          <div style={{ backgroundColor: 'rgba(255, 214, 10, 0.08)', borderLeft: '4px solid var(--color-highlighter)', padding: '1rem 1.25rem', borderRadius: '4px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: 'var(--color-highlighter)', fontFamily: 'var(--font-sans)' }}>
              🎯 The Problem We Are Solving (Inkloom Problem Statement)
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-paper-light)' }}>
              Creative agencies handle dozens of client brands simultaneously. Every brand has 50+ pages of strict guidelines, unwritten verbal preferences, and legal pricing facts. Generic AI tools (like raw ChatGPT) fail in production because they <strong>hallucinate fake guidelines</strong> and have <strong>zero memory</strong> of client exceptions.
              <br /><br />
              <strong>Parakh (परख)</strong> solves this with a strict <em>Citation Gate</em> ("no source, no flag"), <em>Brand Case Law</em> (remembering verbal client exceptions), <em>Fact Ripple</em> (updating connected ads when prices change), and <em>Guideline Debugger</em> (fixing vague rulebooks).
            </p>
          </div>

          {/* The 4 Architectural Pillars */}
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-paper-light)', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>
              🏛️ The 4 Core Architectural Inventions
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
              {/* Pillar 1 */}
              <div style={{ backgroundColor: 'var(--color-ink-card)', border: '1px solid var(--color-docket-border)', borderRadius: '6px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>🛡️</span>
                  <strong style={{ color: 'var(--color-stamp-red)' }}>1. Citation Gate ("No Source, No Flag")</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-steel)', margin: 0 }}>
                  Generic LLMs often critique copy based on personal biases. Parakh’s Citation Gate intercepts every LLM critique and rejects it unless it quotes an exact clause ID and verbatim sentence from the client’s approved handbook. Zero hallucinations.
                </p>
              </div>

              {/* Pillar 2 */}
              <div style={{ backgroundColor: 'var(--color-ink-card)', border: '1px solid var(--color-docket-border)', borderRadius: '6px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>⚖️</span>
                  <strong style={{ color: 'var(--color-highlighter)' }}>2. Brand Case Law (Precedents)</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-steel)', margin: 0 }}>
                  When a client says: <em>"You can use 'instant' just for our Diwali sale"</em>, reviewers file a precedent with scope and reason chips. Using local 64-dim semantic embeddings, Parakh remembers this exception so future reviewers don't re-flag approved copy.
                </p>
              </div>

              {/* Pillar 3 */}
              <div style={{ backgroundColor: 'var(--color-ink-card)', border: '1px solid var(--color-docket-border)', borderRadius: '6px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>🕸️</span>
                  <strong style={{ color: 'var(--color-verified-green)' }}>3. Fact Ripple Board</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-steel)', margin: 0 }}>
                  When a product price changes from ₹199 to ₹499, it shouldn't require manual checking of 50 ads. Parakh constructs a living dependency graph. Updating a fact ripples outward, marking all linked campaigns as "Needs Update".
                </p>
              </div>

              {/* Pillar 4 */}
              <div style={{ backgroundColor: 'var(--color-ink-card)', border: '1px solid var(--color-docket-border)', borderRadius: '6px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>🩺</span>
                  <strong style={{ color: '#64B5F6' }}>4. Guideline Debugger</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-steel)', margin: 0 }}>
                  Often, the problem isn't the copywriter—it's the client's vague guidelines (e.g. "Be playful, but strictly professional"). Parakh ranks ambiguous clauses by conflict frequency and generates clearer, enforceable rewrites.
                </p>
              </div>
            </div>
          </div>

          {/* Quick 2-Minute Judge Evaluation Walkthrough */}
          <div style={{ backgroundColor: 'var(--color-ink-card)', border: '1px dashed var(--color-highlighter)', borderRadius: '6px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: 'var(--color-highlighter)', fontFamily: 'var(--font-mono)' }}>
              ⚡ 2-MINUTE JUDGE EVALUATION WALKTHROUGH
            </h3>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li>
                <strong>Review Workspace:</strong> Click <em>"▶ Load Judge Showcase"</em> below. Notice how the Dengue campaign copy flags 4 violations (fear-mongering, sales hyperbole, banned term <em>"miracle cure"</em>, and price mismatch <em>"₹199 vs ₹499"</em>). Notice every card quotes the exact Clause or Fact ID.
              </li>
              <li>
                <strong>Intent-Lock Fixes:</strong> Click <em>"✓ Accept Fix"</em> on a finding. Watch the suggested word diff replace the violation in real-time while preserving creator tone.
              </li>
              <li>
                <strong>Filing a Precedent:</strong> On another finding, click <em>"📁 Dismiss / File Precedent"</em>. Select an exception reason chip (e.g. <em>"Client Verbal Approval"</em>) and save. Notice how the precedent is indexed into the brand's permanent Case Law memory.
              </li>
              <li>
                <strong>Fact Ripple:</strong> Switch to the <em>"🕸️ Fact Ripple Board"</em> tab. Modify a diagnostic package price or expiry date to see connected campaigns ripple red.
              </li>
              <li>
                <strong>Guideline Debugger:</strong> Switch to <em>"🩺 Guideline Debugger"</em> to see ambiguous brand rules ranked by dispute frequency, and click <em>"Accept Rewrite"</em>.
              </li>
            </ol>
          </div>

          {/* Indian Brand Demonstration Cases */}
          <div>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--color-steel)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
              Realistic Indian Brand Benchmarks Included:
            </h4>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ backgroundColor: 'var(--color-ink)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--color-docket-border)', fontSize: '0.8rem' }}>
                🏥 <strong>Kavach Health</strong> (Preventive Diagnostics & Labs)
              </span>
              <span style={{ backgroundColor: 'var(--color-ink)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--color-docket-border)', fontSize: '0.8rem' }}>
                💳 <strong>VyaparSetu</strong> (B2B MSME Fintech & POS)
              </span>
              <span style={{ backgroundColor: 'var(--color-ink)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--color-docket-border)', fontSize: '0.8rem' }}>
                🌿 <strong>Mitti & Moon</strong> (Ayurvedic D2C Skincare)
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1.25rem 2rem',
            borderTop: '1px solid var(--color-docket-border)',
            backgroundColor: 'var(--color-ink-card)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--color-steel)' }}>
            Tech Stack: Node 24 native SQLite • Supabase PostgreSQL • Groq Llama 3.3 70B • WCAG 2.1 Contrast • 64-dim Embeddings
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-outline"
              onClick={onClose}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              Close Guide
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onLoadShowcase();
                onClose();
              }}
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700 }}
            >
              ▶ Load Live Judge Showcase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
