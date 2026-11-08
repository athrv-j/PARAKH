import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { springs } from '../motion';

export type ToastType = 'precedent' | 'approval' | 'ratified' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

// Global Custom Event Dispatcher for Purposeful Toasts
export const emitToast = (toast: Omit<ToastItem, 'id'>) => {
  const event = new CustomEvent('parakh-toast', {
    detail: { ...toast, id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` }
  });
  window.dispatchEvent(event);
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleNewToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (customEvent.detail) {
        const item = customEvent.detail;
        setToasts(prev => [item, ...prev].slice(0, 4));

        // Auto-dismiss after duration (default 5000ms)
        const duration = item.duration || 5000;
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== item.id));
        }, duration);
      }
    };

    window.addEventListener('parakh-toast', handleNewToast);
    return () => window.removeEventListener('parakh-toast', handleNewToast);
  }, []);

  const handleDismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99998,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '420px',
        width: 'calc(100vw - 48px)',
        pointerEvents: 'none'
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => {
          const isApproval = toast.type === 'approval';
          const isPrecedent = toast.type === 'precedent';
          const isRatified = toast.type === 'ratified';

          const accentColor = isApproval
            ? 'var(--color-verified-green)'
            : isPrecedent
            ? '#FFD60A'
            : isRatified
            ? '#2FBF71'
            : 'var(--color-steel-light)';

          const icon = isApproval
            ? '🏛️'
            : isPrecedent
            ? '⚖️'
            : isRatified
            ? '📜'
            : 'ℹ️';

          return (
            <motion.div
              layout
              key={toast.id}
              initial={{ opacity: 0, x: 120, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.88, transition: { duration: 0.25 } }}
              transition={springs.bouncy}
              style={{
                pointerEvents: 'auto',
                backgroundColor: '#161820',
                border: `1.5px solid ${accentColor}`,
                borderLeft: `4px solid ${accentColor}`,
                borderRadius: '8px',
                padding: '1rem 1.25rem',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Header: Category Badge and Dismiss */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: accentColor,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{icon}</span>
                  {isApproval
                    ? 'DOCKET SEALED // APPROVED'
                    : isPrecedent
                    ? 'BINDING PRECEDENT FILED'
                    : isRatified
                    ? 'RULE RATIFIED & DEPLOYED'
                    : 'GOVERNANCE AUDIT RECORD'}
                </span>

                <button
                  onClick={() => handleDismiss(toast.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-steel)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    padding: '2px 4px'
                  }}
                  aria-label="Dismiss notification"
                >
                  ✕
                </button>
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: 'var(--color-paper-light)',
                  fontFamily: 'var(--font-sans)',
                  marginTop: '2px'
                }}
              >
                {toast.title}
              </div>

              {/* Purposeful Explanation Message */}
              <div
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--color-steel-light)',
                  lineHeight: 1.45,
                  fontFamily: 'var(--font-sans)'
                }}
              >
                {toast.message}
              </div>

              {/* Auto-Dismiss Timer Progress Indicator */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: (toast.duration || 5000) / 1000, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '2.5px',
                  backgroundColor: accentColor,
                  opacity: 0.6
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

