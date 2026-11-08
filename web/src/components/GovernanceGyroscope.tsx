import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { springs } from '../motion';

export interface GovernanceGyroscopeProps {
  status?: 'active' | 'verified' | 'warning' | 'alert' | 'scanning';
  isScanning?: boolean;
  scanResult?: 'green' | 'amber' | 'red' | null;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const GovernanceGyroscope: React.FC<GovernanceGyroscopeProps> = ({
  status = 'active',
  isScanning = false,
  scanResult = null,
  size = 220,
  className = '',
  style = {},
  onClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; timestamp: number }[]>([]);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const prevScanningRef = useRef(isScanning);

  // High-performance 3D tilt tracking toward cursor (MotionValues: ZERO React re-renders)
  const isTouchDevice = typeof window !== 'undefined' && (
    window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches
  );
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateXSpring = useSpring(
    useTransform(mouseY, [0, 1], [12, -12]),
    springs.soft
  );
  const rotateYSpring = useSpring(
    useTransform(mouseX, [0, 1], [-12, 12]),
    springs.soft
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  // Color mapping
  const effectiveResult = scanResult || (
    status === 'verified'
      ? 'green'
      : status === 'alert'
      ? 'red'
      : status === 'warning'
      ? 'amber'
      : null
  );

  const resultColor =
    effectiveResult === 'green'
      ? 'var(--color-verified-green)'
      : effectiveResult === 'amber'
      ? 'var(--color-highlighter)'
      : effectiveResult === 'red'
      ? 'var(--color-stamp-red)'
      : 'var(--color-highlighter)';

  const activeScanning = isScanning || status === 'scanning';

  // Flash result color when review scan completes
  useEffect(() => {
    if (prevScanningRef.current && !activeScanning && effectiveResult) {
      setFlashColor(resultColor);
      const timer = setTimeout(() => setFlashColor(null), 1400);
      return () => clearTimeout(timer);
    }
    prevScanningRef.current = activeScanning;
  }, [activeScanning, effectiveResult, resultColor]);

  // Click triggers outward expanding ripple pulse
  const handleClick = () => {
    const id = Date.now();
    setRipples(prev => [...prev.slice(-2), { id, timestamp: id }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 1100);

    if (onClick) onClick();
  };

  // Inward particles during scanning state (8 radial streams)
  const inwardParticles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={className}
      title="Parakh Governance Core — Click to pulse"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        margin: '0 auto',
        width: typeof size === 'number' ? `${size}px` : size,
        maxWidth: '100%',
        ...style
      }}
    >
      {/* 3D TILT WRAPPER FOR THE GYROSCOPE GRAPHIC */}
      <motion.div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          rotateX: rotateXSpring,
          rotateY: rotateYSpring,
          transformStyle: 'preserve-3d',
          perspective: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
        whileTap={{ scale: 0.96 }}
      >
        <svg
          viewBox="0 0 320 320"
          style={{
            width: '100%',
            height: '100%',
            overflow: 'visible'
          }}
        >
          <defs>
            {/* Core Radial Breathing Glow */}
            <radialGradient id="govCoreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={flashColor || resultColor} stopOpacity="0.85" />
              <stop offset="60%" stopColor={flashColor || resultColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            {/* Radar Scan Gradient */}
            <linearGradient id="radarSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-stamp-red)" stopOpacity="0.75" />
              <stop offset="70%" stopColor="var(--color-stamp-red)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ============================================================== */}
          {/* RESULT FLASH BURST (When review completes)                     */}
          {/* ============================================================== */}
          <AnimatePresence>
            {flashColor && (
              <motion.circle
                cx="160"
                cy="160"
                initial={{ r: 30, opacity: 1 }}
                animate={{ r: 145, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.85, ease: 'easeOut' }}
                fill="none"
                stroke={flashColor}
                strokeWidth="4"
              />
            )}
          </AnimatePresence>

          {/* ============================================================== */}
          {/* CLICK RIPPLE WAVES                                             */}
          {/* ============================================================== */}
          {ripples.map(r => (
            <motion.circle
              key={r.id}
              cx="160"
              cy="160"
              initial={{ r: 28, opacity: 0.9, strokeWidth: 3 }}
              animate={{ r: 145, opacity: 0, strokeWidth: 1 }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              fill="none"
              stroke={resultColor}
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* ============================================================== */}
          {/* 1. OUTER GEAR / GRADUATION RING                                */}
          {/* Concentric around (160, 160): Clockwise                         */}
          {/* ============================================================== */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: isHovered ? 6 : 16, ease: 'linear' }}
            style={{ transformOrigin: '160px 160px' }}
            className={`gov-orbit-outer ${isHovered ? 'gov-fast' : ''}`}
          >
            {/* Outer track */}
            <circle
              cx="160"
              cy="160"
              r="138"
              fill="none"
              stroke="var(--color-docket-border)"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              opacity="0.65"
            />
            {/* Perimeter Degree Graduation Ticks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
              <rect
                key={deg}
                x="158.5"
                y="16"
                width="3"
                height="9"
                fill={deg % 90 === 0 ? resultColor : 'var(--color-steel)'}
                opacity={deg % 90 === 0 ? 0.9 : 0.4}
                transform={`rotate(${deg} 160 160)`}
              />
            ))}
          </motion.g>

          {/* ============================================================== */}
          {/* 2. MIDDLE ORBITAL TRACK & 4 ORBITING NODES                     */}
          {/* Concentric around (160, 160): Counter-Clockwise                */}
          {/* ============================================================== */}
          <motion.g
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: isHovered ? 4 : 11, ease: 'linear' }}
            style={{ transformOrigin: '160px 160px' }}
            className={`gov-orbit-middle ${isHovered ? 'gov-fast' : ''}`}
          >
            <circle
              cx="160"
              cy="160"
              r="108"
              fill="none"
              stroke={resultColor}
              strokeWidth="1.5"
              strokeDasharray="16 10 4 10"
              opacity="0.8"
            />
            {/* 4 Cardinal Orbiting Nodes */}
            <circle cx="160" cy="52" r="5" fill="var(--color-stamp-red)" />
            <circle cx="268" cy="160" r="5" fill="var(--color-highlighter)" />
            <circle cx="160" cy="268" r="5" fill="var(--color-verified-green)" />
            <circle cx="52" cy="160" r="5" fill="var(--color-paper-light)" />
          </motion.g>

          {/* ============================================================== */}
          {/* 3. CONCENTRIC ELLIPTICAL ORBITAL RING                          */}
          {/* Concentric at (160, 160) with 2 orbiting satellite nodes       */}
          {/* ============================================================== */}
          <motion.g
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: isHovered ? 3 : 8, ease: 'linear' }}
            style={{ transformOrigin: '160px 160px' }}
            className={`gov-orbit-inner-counter ${isHovered ? 'gov-fast' : ''}`}
          >
            <ellipse
              cx="160"
              cy="160"
              rx="86"
              ry="58"
              fill="none"
              stroke="var(--color-paper-worn)"
              strokeWidth="1.2"
              opacity="0.65"
              strokeDasharray="8 6"
            />
            {/* Elliptical Satellite Nodes */}
            <circle cx="74" cy="160" r="4.5" fill="var(--color-highlighter)" />
            <circle cx="246" cy="160" r="4.5" fill="var(--color-stamp-red)" />
          </motion.g>

          {/* ============================================================== */}
          {/* 4. INNER RETICLE PRECISION RING                                */}
          {/* Concentric around (160, 160): Clockwise                         */}
          {/* ============================================================== */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: isHovered ? 2.5 : 7, ease: 'linear' }}
            style={{ transformOrigin: '160px 160px' }}
            className={`gov-orbit-inner-clock ${isHovered ? 'gov-fast' : ''}`}
          >
            <circle
              cx="160"
              cy="160"
              r="66"
              fill="none"
              stroke="var(--color-docket-border)"
              strokeWidth="1"
              strokeDasharray="6 6"
              opacity="0.75"
            />
            <rect x="159" y="90" width="2" height="6" fill="var(--color-steel)" />
            <rect x="159" y="224" width="2" height="6" fill="var(--color-steel)" />
            <rect x="90" y="159" width="6" height="2" fill="var(--color-steel)" />
            <rect x="224" y="159" width="6" height="2" fill="var(--color-steel)" />
          </motion.g>

          {/* ============================================================== */}
          {/* SCANNING STATE: RADAR SWEEP LINE & INWARD PARTICLES            */}
          {/* ============================================================== */}
          {activeScanning && (
            <g>
              {/* Radar Sweep Wedge Beam */}
              <motion.g
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                style={{ transformOrigin: '160px 160px' }}
                className="gov-radar-sweep"
              >
                <path
                  d="M 160 160 L 160 24 A 136 136 0 0 1 256 64 Z"
                  fill="url(#radarSweepGrad)"
                />
                <line
                  x1="160"
                  y1="160"
                  x2="160"
                  y2="22"
                  stroke="var(--color-stamp-red)"
                  strokeWidth="2.5"
                />
              </motion.g>

              {/* Inward Ingesting Particles */}
              {inwardParticles.map((deg, i) => (
                <g key={deg} transform={`rotate(${deg} 160 160)`}>
                  <motion.circle
                    cx="160"
                    cy="25"
                    r="3.5"
                    fill="var(--color-highlighter)"
                    initial={{ cy: 25, opacity: 0 }}
                    animate={{
                      cy: [25, 135],
                      opacity: [0, 0.95, 0],
                      scale: [1.2, 0.6]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.1,
                      delay: i * 0.12,
                      ease: 'easeInOut'
                    }}
                  />
                </g>
              ))}
            </g>
          )}

          {/* ============================================================== */}
          {/* IDLE BREATHING GLOW AURA                                       */}
          {/* ============================================================== */}
          <circle
            cx="160"
            cy="160"
            r="44"
            fill="url(#govCoreGlow)"
            className="gov-core-pulse"
          />

          {/* ============================================================== */}
          {/* 5. ACTIVE ROTATING CENTER BEZEL & COG (BECH WLA GHUMRA HAI)    */}
          {/* Clockwise rotating notched mechanical cog ring                 */}
          {/* ============================================================== */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: isHovered ? 2.5 : 6, ease: 'linear' }}
            style={{ transformOrigin: '160px 160px' }}
            className={`gov-center-bezel ${isHovered ? 'gov-fast' : ''}`}
          >
            {/* Outer notched cog ring */}
            <circle
              cx="160"
              cy="160"
              r="35"
              fill="none"
              stroke={flashColor || resultColor}
              strokeWidth="2"
              strokeDasharray="8 6"
              opacity="0.9"
            />
            {/* 4 Cardinal Cog Teeth / Notches */}
            <rect x="158.5" y="121" width="3" height="6.5" rx="1" fill={flashColor || resultColor} />
            <rect x="158.5" y="192.5" width="3" height="6.5" rx="1" fill={flashColor || resultColor} />
            <rect x="121" y="158.5" width="6.5" height="3" rx="1" fill={flashColor || resultColor} />
            <rect x="192.5" y="158.5" width="6.5" height="3" rx="1" fill={flashColor || resultColor} />
            {/* 4 Diagonal Micro Accent Dots */}
            <circle cx="137" cy="137" r="1.5" fill="var(--color-paper-light)" />
            <circle cx="183" cy="137" r="1.5" fill="var(--color-paper-light)" />
            <circle cx="137" cy="183" r="1.5" fill="var(--color-paper-light)" />
            <circle cx="183" cy="183" r="1.5" fill="var(--color-paper-light)" />
          </motion.g>

          {/* ============================================================== */}
          {/* 6. INNER COUNTER-ROTATING GYRO RING                            */}
          {/* Counter-Clockwise rotating inner reticle                       */}
          {/* ============================================================== */}
          <motion.g
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: isHovered ? 2 : 4.5, ease: 'linear' }}
            style={{ transformOrigin: '160px 160px' }}
            className={`gov-center-inner ${isHovered ? 'gov-fast' : ''}`}
          >
            <circle
              cx="160"
              cy="160"
              r="29.5"
              fill="none"
              stroke="var(--color-paper-worn)"
              strokeWidth="1.2"
              strokeDasharray="6 4 2 4"
              opacity="0.8"
            />
            {/* 2 Opposite Gyro Node Diamonds */}
            <polygon points="160,128 162.5,131 160,134 157.5,131" fill="var(--color-highlighter)" />
            <polygon points="160,186 162.5,189 160,192 157.5,189" fill="var(--color-stamp-red)" />
          </motion.g>

          {/* ============================================================== */}
          {/* 7. CENTER SEAL EMBLEM DISC & BADGE INSCRIPTION                */}
          {/* ============================================================== */}
          <circle
            cx="160"
            cy="160"
            r="25"
            fill="#0c0d10"
            stroke="var(--color-docket-border)"
            strokeWidth="2"
          />

          {/* Case Seal Inscription */}
          <text
            x="160"
            y="164.5"
            textAnchor="middle"
            fill="var(--color-paper-light)"
            fontFamily="var(--font-mono)"
            fontSize="10.5"
            fontWeight="800"
            letterSpacing="1.5"
            style={{ pointerEvents: 'none' }}
          >
            {activeScanning ? 'SCAN' : 'PRK'}
          </text>
        </svg>
      </motion.div>

      {/* Orbit Footer Status Identifier — IN NORMAL FLOW (ZERO OVERLAP!) */}
      <div
        style={{
          marginTop: '10px',
          fontSize: '0.72rem',
          fontFamily: 'var(--font-mono)',
          color: activeScanning ? 'var(--color-stamp-red)' : flashColor || resultColor,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 700
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: activeScanning ? 'var(--color-stamp-red)' : flashColor || resultColor,
            boxShadow: `0 0 8px ${activeScanning ? 'var(--color-stamp-red)' : flashColor || resultColor}`
          }}
        />
        {activeScanning
          ? 'RADAR SCAN IN PROGRESS...'
          : flashColor
          ? `AUDIT // ${effectiveResult?.toUpperCase()}`
          : `GOV CORE // ${status.toUpperCase()}`}
      </div>

      {/* Hardware-Accelerated Static Keyframes */}
      <style>{`
        .gov-orbit-outer {
          transform-box: view-box;
          transform-origin: 160px 160px;
          animation: govSpinClockwise 26s linear infinite;
        }
        .gov-orbit-middle {
          transform-box: view-box;
          transform-origin: 160px 160px;
          animation: govSpinCounter 18s linear infinite;
        }
        .gov-orbit-inner-counter {
          transform-box: view-box;
          transform-origin: 160px 160px;
          animation: govSpinCounter 14s linear infinite;
        }
        .gov-orbit-inner-clock {
          transform-box: view-box;
          transform-origin: 160px 160px;
          animation: govSpinClockwise 7s linear infinite;
        }
        .gov-center-bezel {
          transform-box: view-box;
          transform-origin: 160px 160px;
          animation: govSpinClockwise 6s linear infinite;
        }
        .gov-center-inner {
          transform-box: view-box;
          transform-origin: 160px 160px;
          animation: govSpinCounter 4.5s linear infinite;
        }
        .gov-fast.gov-orbit-outer { animation-duration: 6s; }
        .gov-fast.gov-orbit-middle { animation-duration: 4s; }
        .gov-fast.gov-orbit-inner-counter { animation-duration: 3s; }
        .gov-fast.gov-orbit-inner-clock { animation-duration: 2.5s; }
        .gov-fast.gov-center-bezel { animation-duration: 2.5s; }
        .gov-fast.gov-center-inner { animation-duration: 2s; }

        .gov-radar-sweep {
          transform-box: view-box;
          transform-origin: 160px 160px;
          animation: govSpinClockwise 1.6s linear infinite;
        }
        .gov-core-pulse {
          transform-box: view-box;
          transform-origin: 160px 160px;
          animation: govPulse 3.2s ease-in-out infinite;
        }

        @keyframes govSpinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes govSpinCounter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes govPulse {
          0%, 100% { transform: scale(0.94); opacity: 0.65; }
          50% { transform: scale(1.1); opacity: 0.95; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gov-orbit-outer,
          .gov-orbit-middle,
          .gov-orbit-inner-counter,
          .gov-orbit-inner-clock,
          .gov-radar-sweep,
          .gov-core-pulse {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
