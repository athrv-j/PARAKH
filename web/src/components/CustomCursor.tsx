import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

export type CursorVariant = 'default' | 'magnifier' | 'stamp';

export const CustomCursor: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [variant, setVariant] = useState<CursorVariant>('default');

  const isEnabledRef = useRef(false);
  const isVisibleRef = useRef(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth spring physics for outer ring
  const ringX = useSpring(mouseX, { stiffness: 450, damping: 28, mass: 0.4 });
  const ringY = useSpring(mouseY, { stiffness: 450, damping: 28, mass: 0.4 });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      // Touch interaction: hide custom cursor and restore native touch behavior
      if (e.pointerType === 'touch') {
        if (isVisibleRef.current) {
          isVisibleRef.current = false;
          setIsVisible(false);
          document.documentElement.classList.remove('custom-cursor-active');
        }
        return;
      }

      // Mouse or trackpad movement detected: activate immediately
      if (!isEnabledRef.current) {
        isEnabledRef.current = true;
        setIsEnabled(true);
      }

      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        setIsVisible(true);
        document.documentElement.classList.add('custom-cursor-active');
      }

      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1. Stamp state: Over findings, flagged spans, rubber stamps, or audit markers
      if (
        target.closest(
          '[id^="span-finding"], [id^="card-finding"], .rubber-stamp, .highlight-span, [data-cursor="stamp"], .finding-card, .fact-card, .draft-card'
        )
      ) {
        setVariant('stamp');
      }
      // 2. Magnifier state: Over interactive elements (buttons, inputs, links, tabs)
      else if (
        target.closest(
          'button, a, input, textarea, select, [role="button"], .btn, .nav-tab, .interactive, [data-cursor="magnifier"], kbd, .hero-card'
        )
      ) {
        setVariant('magnifier');
      }
      // 3. Default state
      else {
        setVariant('default');
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        isVisibleRef.current = false;
        setIsVisible(false);
        document.documentElement.classList.remove('custom-cursor-active');
      }
    };

    const handleMouseLeave = () => {
      isVisibleRef.current = false;
      setIsVisible(false);
      document.documentElement.classList.remove('custom-cursor-active');
    };

    const handleMouseEnter = () => {
      if (isEnabledRef.current) {
        isVisibleRef.current = true;
        setIsVisible(true);
        document.documentElement.classList.add('custom-cursor-active');
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.documentElement.classList.remove('custom-cursor-active');
    };
  }, [mouseX, mouseY]);

  // If not enabled or mouse is outside window, render nothing
  if (!isEnabled || !isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99999,
        overflow: 'hidden'
      }}
    >
      {/* 1. Pinpoint Center Dot (Follows exact mouse coordinates) */}
      <motion.div
        style={{
          position: 'absolute',
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
          width: variant === 'magnifier' ? '4px' : '6px',
          height: variant === 'magnifier' ? '4px' : '6px',
          borderRadius: '50%',
          backgroundColor:
            variant === 'stamp'
              ? 'var(--color-stamp-red)'
              : variant === 'magnifier'
              ? 'var(--color-highlighter)'
              : '#FFFFFF',
          boxShadow:
            variant === 'stamp'
              ? '0 0 8px var(--color-stamp-red)'
              : variant === 'magnifier'
              ? '0 0 10px var(--color-highlighter)'
              : '0 0 6px rgba(255, 255, 255, 0.85)',
          pointerEvents: 'none',
          willChange: 'transform',
          transition: 'background-color 0.15s ease, width 0.15s ease, height 0.15s ease'
        }}
      />

      {/* 2. Trailing Outer Ring (Spring-driven, transforms into Magnifier or Stamp) */}
      <motion.div
        style={{
          position: 'absolute',
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          willChange: 'transform'
        }}
      >
        {variant === 'default' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1.5px solid rgba(255, 255, 255, 0.65)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              boxShadow: '0 0 12px rgba(255, 255, 255, 0.2)'
            }}
          />
        )}

        {/* MAGNIFIER CURSOR: Over interactive items */}
        {variant === 'magnifier' && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '2px solid var(--color-highlighter)',
              backgroundColor: 'rgba(255, 214, 10, 0.15)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              boxShadow: '0 0 16px rgba(255, 214, 10, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                color: 'var(--color-highlighter)',
                opacity: 0.95,
                userSelect: 'none',
                lineHeight: 1
              }}
            >
              🔍
            </div>
          </motion.div>
        )}

        {/* STAMP CURSOR: Over findings & compliance violations */}
        {variant === 'stamp' && (
          <motion.div
            initial={{ scale: 0.7, rotate: -15, opacity: 0 }}
            animate={{ scale: 1, rotate: -4, opacity: 1 }}
            exit={{ scale: 0.7, rotate: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.175, 0.885, 0.32, 1.275] }}
            style={{
              width: '50px',
              height: '36px',
              border: '2px solid var(--color-stamp-red)',
              borderRadius: '4px',
              backgroundColor: 'rgba(215, 38, 61, 0.3)',
              boxShadow: '0 0 18px rgba(215, 38, 61, 0.55)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1
            }}
          >
            <div
              style={{
                fontSize: '0.6rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 900,
                color: '#FF6B6B',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              ★ AUDIT
            </div>
            <div
              style={{
                fontSize: '0.5rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-stamp-red)',
                letterSpacing: '0.5px'
              }}
            >
              SEAL
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
