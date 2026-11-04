import React, { useRef } from 'react';
import { motion, useScroll, useSpring, useInView } from 'motion/react';
import { springs } from '../motion';

// ============================================================================
// STEP 1 ANIMATION: UPLOAD (Document Ingestion Scanner)
// ============================================================================
const UploadStepAnimation: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-20px' });

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '140px',
        backgroundColor: '#0c0d10',
        borderRadius: '6px',
        border: '1px solid var(--color-docket-border)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Background Grid Pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          opacity: 0.6
        }}
      />

      {/* Document Card Ingesting */}
      <motion.div
        animate={isInView ? { y: [20, -6, 0], opacity: [0, 1, 1] } : { y: 20, opacity: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '180px',
          padding: '10px 14px',
          backgroundColor: 'var(--color-ink-card)',
          border: '1px solid var(--color-steel)',
          borderRadius: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          position: 'relative',
          zIndex: 2
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--color-highlighter)', letterSpacing: '1px' }}>
            DOC // DRAFT_V1.MD
          </span>
          <span style={{ fontSize: '0.62rem', color: 'var(--color-verified-green)' }}>● INGEST</span>
        </div>
        <div style={{ height: '4px', width: '85%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px', marginBottom: '4px' }} />
        <div style={{ height: '4px', width: '60%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px', marginBottom: '4px' }} />
        <div style={{ height: '4px', width: '75%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
      </motion.div>

      {/* Laser Scanning Beam */}
      <motion.div
        animate={isInView ? { y: [-60, 60, -60] } : { y: -60 }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          backgroundColor: 'var(--color-stamp-red)',
          boxShadow: '0 0 12px 2px var(--color-stamp-red)',
          zIndex: 3
        }}
      />
    </div>
  );
};

// ============================================================================
// STEP 2 ANIMATION: CHECK (Deterministic Policy Rule Matrix)
// ============================================================================
const CheckStepAnimation: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-20px' });

  const rules = [
    { label: 'Prohibited Medical Claims', status: 'FLAGGED', color: 'var(--color-stamp-red)' },
    { label: 'Fact Verification vs DB', status: 'VERIFIED', color: 'var(--color-verified-green)' },
    { label: 'Pricing Consistency', status: 'VERIFIED', color: 'var(--color-verified-green)' }
  ];

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '140px',
        backgroundColor: '#0c0d10',
        borderRadius: '6px',
        border: '1px solid var(--color-docket-border)',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '8px',
        position: 'relative'
      }}
    >
      {rules.map((rule, idx) => (
        <motion.div
          key={rule.label}
          initial={{ opacity: 0, x: -16 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
          transition={{ delay: idx * 0.18, duration: 0.4 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            backgroundColor: 'var(--color-ink-card)',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--color-paper-light)', fontFamily: 'var(--font-sans)' }}>
            {rule.label}
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              color: rule.color,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {rule.status === 'FLAGGED' ? '⚠ ' : '✓ '}
            {rule.status}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

// ============================================================================
// STEP 3 ANIMATION: CITE (SVG Citation Path Drawing)
// ============================================================================
const CiteStepAnimation: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-20px' });

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '140px',
        backgroundColor: '#0c0d10',
        borderRadius: '6px',
        border: '1px solid var(--color-docket-border)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        overflow: 'hidden'
      }}
    >
      {/* Left Draft Span Card */}
      <div
        style={{
          width: '95px',
          padding: '8px',
          backgroundColor: 'var(--color-ink-card)',
          border: '1px solid var(--color-highlighter)',
          borderRadius: '4px',
          zIndex: 2
        }}
      >
        <div style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)' }}>DRAFT SPAN</div>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-highlighter)', marginTop: '2px' }}>
          "100% cure"
        </div>
      </div>

      {/* SVG Citation Line Connecting Cards */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        <motion.path
          d="M 115 70 C 150 25, 170 115, 205 70"
          fill="none"
          stroke="var(--color-stamp-red)"
          strokeWidth="2.5"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], repeat: Infinity, repeatDelay: 1.5 }}
          style={{ filter: 'drop-shadow(0 0 6px var(--color-stamp-red))' }}
        />
        {/* End Pin Dots */}
        <circle cx="115" cy="70" r="3.5" fill="var(--color-stamp-red)" />
        <circle cx="205" cy="70" r="3.5" fill="var(--color-stamp-red)" />
      </svg>

      {/* Right Brand Rule Citation Card */}
      <div
        style={{
          width: '95px',
          padding: '8px',
          backgroundColor: 'var(--color-ink-card)',
          border: '1px solid var(--color-stamp-red)',
          borderRadius: '4px',
          zIndex: 2
        }}
      >
        <div style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)' }}>RULE #C-4.2</div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-paper-light)', marginTop: '2px' }}>
          Zero Guarantee
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STEP 4 ANIMATION: DECIDE (Rubber Stamp Slam Impact)
// ============================================================================
const DecideStepAnimation: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-20px' });

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '140px',
        backgroundColor: '#0c0d10',
        borderRadius: '6px',
        border: '1px solid var(--color-docket-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Editorial Case File Page */}
      <div
        style={{
          width: '190px',
          height: '105px',
          backgroundColor: '#FAF7F2',
          borderRadius: '3px',
          padding: '10px 12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#666' }}>DOCKET // AUDIT_SEAL</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#999' }}>2026-NOV-04</span>
        </div>

        <div style={{ height: '3px', width: '80%', backgroundColor: '#e2dacf', borderRadius: '1px' }} />
        <div style={{ height: '3px', width: '60%', backgroundColor: '#e2dacf', borderRadius: '1px' }} />

        {/* Rubber Stamp Slam Impact */}
        <motion.div
          initial={{ opacity: 0, scale: 2.3, rotate: -18 }}
          animate={
            isInView
              ? { opacity: 1, scale: 1, rotate: -4 }
              : { opacity: 0, scale: 2.3, rotate: -18 }
          }
          transition={{
            ...springs.snappy,
            delay: 0.25
          }}
          style={{
            position: 'absolute',
            top: '28%',
            left: '20%',
            padding: '4px 10px',
            border: '2.5px solid var(--color-stamp-red)',
            borderRadius: '4px',
            color: 'var(--color-stamp-red)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            fontWeight: 800,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            backgroundColor: 'rgba(215, 38, 61, 0.08)',
            boxShadow: 'inset 0 0 8px rgba(215, 38, 61, 0.2)'
          }}
        >
          APPROVED
        </motion.div>
      </div>
    </div>
  );
};

// ============================================================================
// STEP 5 ANIMATION: REMEMBER (Card Filing into Archival Folder)
// ============================================================================
const RememberStepAnimation: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-20px' });

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '140px',
        backgroundColor: '#0c0d10',
        borderRadius: '6px',
        border: '1px solid var(--color-docket-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Archival Folder Tab & Pocket */}
      <div
        style={{
          width: '190px',
          height: '85px',
          backgroundColor: '#1E2128',
          border: '1px solid var(--color-steel)',
          borderRadius: '6px',
          position: 'absolute',
          bottom: '15px',
          zIndex: 3,
          boxShadow: '0 -6px 20px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '8px 12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--color-highlighter)', letterSpacing: '1px' }}>
            📁 VAULT PRECEDENTS
          </span>
          <span style={{ fontSize: '0.62rem', color: 'var(--color-verified-green)', fontWeight: 700 }}>LOCKED</span>
        </div>
      </div>

      {/* Precedent Card Filing into Folder */}
      <motion.div
        animate={
          isInView
            ? { y: [-35, 12], rotate: [-6, 0], opacity: [0.7, 1] }
            : { y: -35, rotate: -6, opacity: 0.7 }
        }
        transition={{
          repeat: Infinity,
          repeatDelay: 1.8,
          duration: 1.4,
          ease: [0.16, 1, 0.3, 1]
        }}
        style={{
          width: '160px',
          height: '75px',
          backgroundColor: '#FAF7F2',
          border: '1px solid #d4c8b8',
          borderRadius: '4px',
          padding: '8px 10px',
          position: 'absolute',
          top: '20px',
          zIndex: 2,
          boxShadow: '0 6px 16px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: '#777', borderBottom: '1px solid #ddd', paddingBottom: '3px' }}>
          PRECEDENT #PRK-492
        </div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#101114', marginTop: '4px' }}>
          Monsoon Cardiac Claim Override
        </div>
        <div style={{ fontSize: '0.5rem', color: 'var(--color-stamp-red)', marginTop: '2px', fontWeight: 600 }}>
          IMMUTABLE MEMORY
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: HOW PARAKH WORKS (Scroll-Driven Walkthrough)
// ============================================================================
const STEPS = [
  {
    id: 'upload',
    number: '01',
    title: 'Upload',
    tag: 'INGESTION ENGINE',
    description: 'Import brand guidelines (.docx, .md) and paste draft copy. Assets are isolated inside tenant boundary vaults.',
    Animation: UploadStepAnimation
  },
  {
    id: 'check',
    number: '02',
    title: 'Check',
    tag: 'DETERMINISTIC GATES',
    description: 'Instant verification for banned terms, price discrepancies, and unverified claims with zero LLM hallucination.',
    Animation: CheckStepAnimation
  },
  {
    id: 'cite',
    number: '03',
    title: 'Cite',
    tag: 'GROUNDED EVIDENCE',
    description: 'Every warning draws an explicit citation line directly to the canonical source clause and brand intent.',
    Animation: CiteStepAnimation
  },
  {
    id: 'decide',
    number: '04',
    title: 'Decide',
    tag: 'EDITORIAL ACTION',
    description: 'Human editors apply instant compliant rewrites or mark exceptions with official case law audit stamps.',
    Animation: DecideStepAnimation
  },
  {
    id: 'remember',
    number: '05',
    title: 'Remember',
    tag: 'IMMUTABLE MEMORY',
    description: 'Approved rulings become permanent organizational precedents, ending repetitive brand compliance debates forever.',
    Animation: RememberStepAnimation
  }
];

export const HowParakhWorks: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll progress for filling the vertical rail
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 75%', 'end 90%']
  });

  const railScaleY = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 26,
    mass: 0.6
  });

  return (
    <section
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '860px',
        margin: '3.5rem auto 2rem auto',
        padding: '0 1.5rem',
        position: 'relative'
      }}
    >
      {/* Section Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--color-stamp-red)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginBottom: '0.5rem'
          }}
        >
          // ARCHITECTURE & AUDIT LIFECYCLE
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
            color: 'var(--color-paper-light)',
            margin: '0 0 0.75rem 0',
            fontWeight: 800
          }}
        >
          How Parakh Works
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            fontSize: '0.92rem',
            color: 'var(--color-steel)',
            maxWidth: '520px',
            margin: '0 auto',
            lineHeight: 1.6
          }}
        >
          From unvetted creative copy to immutable brand precedent in five deterministic steps.
        </motion.p>
      </div>

      {/* Step Cards with Connected Scroll Rail */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Background Inactive Rail Line */}
        <div
          style={{
            position: 'absolute',
            left: '28px',
            top: '30px',
            bottom: '30px',
            width: '2px',
            backgroundColor: 'var(--color-docket-border)',
            zIndex: 0
          }}
        />

        {/* Scroll-Driven Active Progress Fill Rail */}
        <motion.div
          style={{
            position: 'absolute',
            left: '28px',
            top: '30px',
            bottom: '30px',
            width: '2px',
            scaleY: railScaleY,
            transformOrigin: 'top',
            background: 'linear-gradient(to bottom, var(--color-stamp-red), var(--color-highlighter))',
            boxShadow: '0 0 10px var(--color-stamp-red)',
            zIndex: 1
          }}
        />

        {/* 5 Distinct Steps */}
        {STEPS.map((step, idx) => {
          const AnimationComponent = step.Animation;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'grid',
                gridTemplateColumns: '56px 1fr',
                gap: '1.25rem',
                alignItems: 'start',
                position: 'relative',
                zIndex: 2
              }}
            >
              {/* Node Badge on Rail */}
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-ink)',
                  border: '2px solid var(--color-docket-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: 'var(--color-paper-light)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.8)'
                }}
              >
                {step.number}
              </div>

              {/* Step Detail Card */}
              <div
                style={{
                  backgroundColor: 'var(--color-ink-card)',
                  border: '1px solid var(--color-docket-border)',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      color: 'var(--color-highlighter)',
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem'
                    }}
                  >
                    {step.tag}
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.35rem',
                      color: 'var(--color-paper-light)',
                      margin: '0 0 0.4rem 0',
                      fontWeight: 700
                    }}
                  >
                    {step.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.86rem',
                      color: 'var(--color-steel)',
                      lineHeight: 1.55,
                      margin: 0
                    }}
                  >
                    {step.description}
                  </p>
                </div>

                {/* Step Bespoke Motion Graphic */}
                <AnimationComponent />
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
