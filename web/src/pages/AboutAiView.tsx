import React from 'react';
import { DocketLabel } from '../components/DocketLabel.tsx';

export const AboutAiView: React.FC = () => {
  const models = [
    {
      component: 'Tone & Messaging Review',
      model: 'llama-3.3-70b-versatile',
      provider: 'Groq Cloud',
      env: 'External Cloud API',
      purpose: 'Detects nuanced tone violations, sales hyperbole, and messaging issues against client clauses.',
      masking: 'PII & Confidential Masker applied before transmission'
    },
    {
      component: 'Citation Gate Guardrail',
      model: 'Deterministic AST & Verbatim Substring Verifier',
      provider: 'Local Node.js Engine',
      env: 'Local Server (Zero External Call)',
      purpose: 'Hard mathematical filter: drops any LLM finding that cannot quote verbatim source guidelines.',
      masking: 'N/A (Local Engine)'
    },
    {
      component: 'Brand Case Law Vector Matcher',
      model: 'Local Deterministic Semantic Embedding Engine (64-dim)',
      provider: 'Local Engine',
      env: 'Local Server (Zero External Call)',
      purpose: 'Computes cosine similarity for precedent retrieval without transmitting client data outside the vault.',
      masking: 'N/A (Local Engine)'
    },
    {
      component: 'Guideline Debugger Synthesizer',
      model: 'llama-3.3-70b-versatile',
      provider: 'Groq Cloud',
      env: 'External Cloud API',
      purpose: 'Synthesizes clearer guideline rewrites strictly using past override examples as evidence.',
      masking: 'Masked before transmission'
    },
    {
      component: 'Visual Contrast & Accessibility Calculator',
      model: 'WCAG 2.1 Relative Luminance Math Formula',
      provider: 'Local Math Engine',
      env: 'Local Server',
      purpose: 'Calculates color contrast ratios mathematically with 0% AI hallucination risk.',
      masking: 'N/A (Local Engine)'
    }
  ];

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}
    >
      <div>
        <DocketLabel docketId="TRANSPARENCY-DISCLOSURE" category="governance" />
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', marginTop: '0.25rem', color: 'var(--color-paper-light)' }}>
          About AI & Service Transparency
        </h1>
        <p style={{ color: 'var(--color-steel)', fontSize: '1rem', marginTop: '0.5rem', maxWidth: '750px', lineHeight: 1.6 }}>
          In accordance with the hackathon rules and ethical brand governance, Parakh discloses every AI model, algorithm, and cloud service used across the platform.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {models.map((m, idx) => (
          <div key={idx} className="index-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-highlighter)' }}>
                {m.component.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  backgroundColor: m.env.includes('Local') ? 'var(--color-verified-bg)' : 'rgba(215, 38, 61, 0.2)',
                  color: m.env.includes('Local') ? 'var(--color-verified-green)' : '#FF8A8A'
                }}
              >
                {m.env.includes('Local') ? 'LOCAL ENGINE' : 'CLOUD API'}
              </span>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-paper-light)' }}>
              {m.model}
            </h3>

            <p style={{ fontSize: '0.86rem', color: 'var(--color-steel-light)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              {m.purpose}
            </p>

            <div style={{ fontSize: '0.78rem', color: 'var(--color-steel)', borderTop: '1px solid var(--color-docket-border)', paddingTop: '0.5rem' }}>
              🔒 Privacy Guard: {m.masking}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
