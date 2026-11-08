import React from 'react';
import { motion } from 'motion/react';

export type StampType = 'APPROVED' | 'PRECEDENT' | 'EXPIRED' | 'CHANGES REQUIRED' | 'RATIFIED' | 'AMENDED';

interface RubberStampProps {
  type: StampType;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const RubberStamp: React.FC<RubberStampProps> = ({
  type,
  animate = false,
  className = '',
  style = {}
}) => {
  const isApproved = type === 'APPROVED' || type === 'RATIFIED' || type === 'AMENDED';
  const isPrecedent = type === 'PRECEDENT';
  const isExpired = type === 'EXPIRED';

  const typeClass = isApproved
    ? 'approved'
    : isPrecedent
    ? 'precedent'
    : isExpired
    ? 'expired'
    : '';

  const targetRotate = isApproved ? -3 : isPrecedent ? 2 : isExpired ? 4 : -2;

  return (
    <motion.div
      initial={
        animate
          ? {
              scale: 2.5,
              rotate: -20,
              opacity: 0
            }
          : false
      }
      animate={{
        scale: [2.5, 0.94, 1.02, 1],
        rotate: [-20, targetRotate - 1, targetRotate + 1, targetRotate],
        opacity: 1
      }}
      transition={
        animate
          ? {
              duration: 0.45,
              times: [0, 0.58, 0.8, 1],
              ease: [0.175, 0.885, 0.32, 1.275]
            }
          : { duration: 0.2 }
      }
      className={`rubber-stamp ${typeClass} ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 18px',
        border: '3px solid currentColor',
        borderRadius: '5px',
        userSelect: 'none',
        lineHeight: 1.15,
        boxShadow: animate
          ? '0 10px 25px rgba(0, 0, 0, 0.28)'
          : '0 4px 12px rgba(0, 0, 0, 0.15)',
        transformOrigin: 'center center',
        ...style
      }}
    >
      <div
        style={{
          fontSize: '0.6rem',
          letterSpacing: '2px',
          opacity: 0.85,
          marginBottom: '2px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700
        }}
      >
        ★ PARAKH GOVERNANCE ★
      </div>
      <div
        style={{
          fontSize: '1.15rem',
          fontWeight: 900,
          letterSpacing: '3px',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase'
        }}
      >
        {type}
      </div>
      <div
        style={{
          fontSize: '0.55rem',
          letterSpacing: '1.5px',
          opacity: 0.75,
          marginTop: '3px',
          fontFamily: 'var(--font-mono)'
        }}
      >
        SEALED DOCKET // 2026-Q4
      </div>
    </motion.div>
  );
};
