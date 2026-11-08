import React from 'react';
import { motion } from 'motion/react';

interface CaseFileSkeletonShimmerProps {
  title?: string;
  subtitle?: string;
  lines?: number;
  compact?: boolean;
  className?: string;
}

export const CaseFileSkeletonShimmer: React.FC<CaseFileSkeletonShimmerProps> = ({
  title = 'INGESTING CASE FILE // AUDITING COMPLIANCE DOCKET',
  subtitle = 'Cross-referencing brand guidelines, pricing facts & case law precedents...',
  lines = 4,
  compact = false,
  className = ''
}) => {
  return (
    <div
      className={`case-file-skeleton ${className}`}
      style={{
        width: '100%',
        backgroundColor: compact ? 'transparent' : '#14161C',
        border: compact ? 'none' : '1px solid var(--color-docket-border)',
        borderRadius: '8px',
        padding: compact ? '1rem' : '1.5rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: compact ? 'none' : 'inset 0 0 30px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* CONTINUOUS METALLIC SHIMMER LIGHT WAVE */}
      <motion.div
        animate={{ x: ['-100%', '220%'] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255, 214, 10, 0.03) 25%, rgba(255, 214, 10, 0.12) 50%, rgba(255, 214, 10, 0.03) 75%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 5
        }}
      />

      {/* DOCKET HEADER SKELETON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '3px',
              backgroundColor: 'rgba(215, 38, 61, 0.3)',
              border: '1px solid var(--color-stamp-red)'
            }}
          />
          <div
            style={{
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-highlighter)',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}
          >
            {title}
          </div>
        </div>

        {/* Pulsing Redact Pill */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            padding: '2px 8px',
            borderRadius: '3px',
            backgroundColor: 'rgba(255, 214, 10, 0.15)',
            color: 'var(--color-highlighter)',
            border: '1px solid rgba(255, 214, 10, 0.3)'
          }}
        >
          REDACTING PII • EVALUATING
        </motion.div>
      </div>

      {/* CASE FILE PARAGRAPH SKELETON BARS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.25rem' }}>
        {Array.from({ length: lines }).map((_, idx) => {
          const widths = ['95%', '84%', '91%', '72%', '60%'];
          const width = widths[idx % widths.length];

          return (
            <div
              key={idx}
              style={{
                height: '14px',
                width,
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '3px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Internal micro-shimmer line */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.6,
                  delay: idx * 0.12,
                  ease: 'easeInOut'
                }}
                style={{
                  height: '100%',
                  width: '50%',
                  background:
                    'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent)'
                }}
              />
            </div>
          );
        })}
      </div>

      {/* FOOTER AUDIT CAPTION */}
      {subtitle && (
        <div
          style={{
            borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
            paddingTop: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-steel)'
          }}
        >
          <span>{subtitle}</span>
          <span>PARAKH SECURE VAULT</span>
        </div>
      )}
    </div>
  );
};

