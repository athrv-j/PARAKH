import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { springs } from '../motion';

interface VaultDoorTransitionProps {
  isOpen: boolean;
  targetVaultName: string;
  onTransitionComplete: () => void;
}

export const VaultDoorTransition: React.FC<VaultDoorTransitionProps> = ({
  isOpen,
  targetVaultName,
  onTransitionComplete
}) => {
  const [typedText, setTypedText] = useState('');
  const [phase, setPhase] = useState<'closed' | 'opening' | 'idle'>('idle');

  useEffect(() => {
    if (isOpen) {
      setPhase('closed');
      setTypedText('');

      // Typewriter effect when panels close
      let i = 0;
      const interval = setInterval(() => {
        if (i <= targetVaultName.length) {
          setTypedText(targetVaultName.slice(0, i));
          i++;
        } else {
          clearInterval(interval);
          // Wait slightly, then open doors
          setTimeout(() => {
            setPhase('opening');
            setTimeout(() => {
              setPhase('idle');
              onTransitionComplete();
            }, 550);
          }, 350);
        }
      }, 35);

      return () => clearInterval(interval);
    }
  }, [isOpen, targetVaultName]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            pointerEvents: 'all',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* LEFT VAULT DOOR PANEL */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: phase === 'opening' ? '-100%' : '0%' }}
            exit={{ x: '-100%' }}
            transition={{
              ...springs.snappy,
              mass: 1.2
            }}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '50%',
              backgroundColor: '#0c0d10',
              borderRight: '2px solid var(--color-stamp-red)',
              backgroundImage: 'radial-gradient(circle at 100% 50%, rgba(215, 38, 61, 0.15) 0%, transparent 60%)',
              boxShadow: 'inset -20px 0 40px rgba(0,0,0,0.8)'
            }}
          >
            {/* Mechanical Door Bolts */}
            <div style={{ position: 'absolute', right: '12px', top: '20%', bottom: '20%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {[1, 2, 3, 4, 5, 6].map(b => (
                <div
                  key={b}
                  style={{
                    width: '10px',
                    height: '24px',
                    borderRadius: '3px',
                    backgroundColor: '#1E2128',
                    border: '1px solid var(--color-steel)'
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* RIGHT VAULT DOOR PANEL */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: phase === 'opening' ? '100%' : '0%' }}
            exit={{ x: '100%' }}
            transition={{
              ...springs.snappy,
              mass: 1.2
            }}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: '50%',
              backgroundColor: '#0c0d10',
              borderLeft: '2px solid var(--color-stamp-red)',
              backgroundImage: 'radial-gradient(circle at 0% 50%, rgba(215, 38, 61, 0.15) 0%, transparent 60%)',
              boxShadow: 'inset 20px 0 40px rgba(0,0,0,0.8)'
            }}
          >
            {/* Mechanical Door Bolts */}
            <div style={{ position: 'absolute', left: '12px', top: '20%', bottom: '20%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {[1, 2, 3, 4, 5, 6].map(b => (
                <div
                  key={b}
                  style={{
                    width: '10px',
                    height: '24px',
                    borderRadius: '3px',
                    backgroundColor: '#1E2128',
                    border: '1px solid var(--color-steel)'
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* CENTER SEAL & TYPEWRITER LOCK DISPLAY */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: phase === 'opening' ? 0 : 1,
              scale: phase === 'opening' ? 0.9 : 1
            }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem 3rem',
              backgroundColor: 'rgba(16, 17, 20, 0.92)',
              border: '1px solid var(--color-stamp-red)',
              borderRadius: '8px',
              boxShadow: '0 0 50px rgba(215, 38, 61, 0.35)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-stamp-red)', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              🔒 TENANT BOUNDARY LOCK
            </div>

            {/* Typewriter target vault name */}
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.8rem',
                color: 'var(--color-paper-light)',
                minHeight: '2.4rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{typedText}</span>
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
                style={{
                  display: 'inline-block',
                  width: '3px',
                  height: '1.6rem',
                  backgroundColor: 'var(--color-highlighter)'
                }}
              />
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--color-steel)', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
              PURGING CACHE • PARTITIONING CLIENT DOCKET
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
