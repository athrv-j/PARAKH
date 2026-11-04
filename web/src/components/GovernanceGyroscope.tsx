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
  size = 240,
  className = '',
  style = {},
  onClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; timestamp: number }[]>([]);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const prevScanningRef = useRef(isScanning);

  // 3D tilt tracking toward cursor
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateXSpring = useSpring(
    useTransform(mouseY, [0, 1], [14, -14]),
    springs.soft
  );
  const rotateYSpring = useSpring(
    useTransform(mouseX, [0, 1], [-14, 14]),
    springs.soft
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
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

  // Determine current core color
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
      ? 'var(--color-verified)'
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
      const timer = setTimeout(() => setFlashColor(null), 1500);
      return () => clearTimeout(timer);
    }
    prevScanningRef.current = activeScanning;
  }, [activeScanning, effectiveResult, resultColor]);

  // Click triggers outward expanding ripple pulse
  const handleClick = () => {
    const id = Date.now();
    setRipples(prev => [...prev.slice(-3), { id, timestamp: id }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 1200);

    if (onClick) onClick();
  };

  // Inward particles during scanning state (12 radial streams)
  const inwardParticles = [
    0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330
  ];

  const numericSize = typeof size === 'number' ? size : 240;

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
        width: typeof size === 'number' ? `${size}px` : size,
        maxWidth: '100%',
        aspectRatio: '1 / 1',
        position: 'relative',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: 900,
        userSelect: 'none',
        margin: '0 auto',
        ...style
      }}
    >
      <motion.div
        style={{
          width: '100%',
          height: '100%',
          rotateX: rotateXSpring,
          rotateY: rotateYSpring,
          transformStyle: 'preserve-3d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        whileTap={{ scale: 0.96 }}
      >
        <svg
          viewBox="0 0 320 320"
          style={{
            width: '100%',
            height: '100%',
            overflow: 'visible',
            filter: `drop-shadow(0 0 24px ${flashColor || resultColor}44)`,
            transition: 'filter 0.5s ease'
          }}
        >
          <defs>
            {/* Core Radial Breathing Glow */}
            <radialGradient id="govCoreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={flashColor || resultColor} stopOpacity="0.85" />
              <stop offset="50%" stopColor={flashColor || resultColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            {/* Radar Scan Gradient */}
            <linearGradient id="radarSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-stamp-red)" stopOpacity="0.8" />
              <stop offset="70%" stopColor="var(--color-stamp-red)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>

            {/* Ripple Pulse Gradient */}
            <radialGradient id="rippleGrad" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="transparent" />
              <stop offset="90%" stopColor={resultColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* ============================================================== */}
          {/* RESULT FLASH BURST (When review completes)                     */}
          {/* ============================================================== */}
          <AnimatePresence>
            {flashColor && (
              <motion.circle
                cx="160"
                cy="160"
                initial={{ r: 35, opacity: 1, scale: 0.8 }}
                animate={{ r: 155, opacity: 0, scale: 1.35 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                fill="none"
                stroke={flashColor}
                strokeWidth="5"
                style={{ filter: `drop-shadow(0 0 20px ${flashColor})` }}
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
              initial={{ r: 32, opacity: 0.9, strokeWidth: 3 }}
              animate={{ r: 150, opacity: 0, strokeWidth: 1 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              fill="none"
              stroke={resultColor}
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* ============================================================== */}
          {/* 1. OUTER GEAR / GRADUATION RING                                */}
          {/* Clockwise: normal 32s, hover 7s                                */}
          {/* ============================================================== */}
          <g
            style={{
              transformOrigin: '160px 160px',
              animation: `govSpinClockwise ${isHovered ? '7s' : '32s'} linear infinite`
            }}
          >
            {/* Outer track */}
            <circle
              cx="160"
              cy="160"
              r="140"
              fill="none"
              stroke="var(--color-docket-border)"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              opacity="0.7"
            />
            {/* Perimeter Degree Graduation Ticks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
              <rect
                key={deg}
                x="158.5"
                y="14"
                width="3"
                height="10"
                fill={deg % 90 === 0 ? resultColor : 'var(--color-steel)'}
                opacity={deg % 90 === 0 ? 0.9 : 0.45}
                transform={`rotate(${deg} 160 160)`}
              />
            ))}
          </g>

          {/* ============================================================== */}
          {/* 2. MIDDLE ORBITAL TRACK & ORBITING NODES                       */}
          {/* Counter-Clockwise: normal 20s, hover 5s                        */}
          {/* ============================================================== */}
          <g
            style={{
              transformOrigin: '160px 160px',
              animation: `govSpinCounter ${isHovered ? '5s' : '20s'} linear infinite`
            }}
          >
            <circle
              cx="160"
              cy="160"
              r="110"
              fill="none"
              stroke={resultColor}
              strokeWidth="1.5"
              strokeDasharray="18 10 4 10"
              opacity="0.8"
            />
            {/* 4 Orbiting Satellite Dots on Track */}
            <circle cx="160" cy="50" r="5" fill="var(--color-stamp-red)" style={{ filter: 'drop-shadow(0 0 6px var(--color-stamp-red))' }} />
            <circle cx="270" cy="160" r="5" fill="var(--color-highlighter)" style={{ filter: 'drop-shadow(0 0 6px var(--color-highlighter))' }} />
            <circle cx="160" cy="270" r="5" fill="var(--color-verified)" style={{ filter: 'drop-shadow(0 0 6px var(--color-verified))' }} />
            <circle cx="50" cy="160" r="5" fill="var(--color-paper-light)" style={{ filter: 'drop-shadow(0 0 4px var(--color-paper-light))' }} />
          </g>

          {/* ============================================================== */}
          {/* 3. TILTED ELLIPTICAL ORBITAL RING                              */}
          {/* Clockwise: normal 14s, hover 3.5s                              */}
          {/* ============================================================== */}
          <g
            transform="rotate(35 160 160)"
            style={{
              transformOrigin: '160px 160px',
              animation: `govSpinClockwise ${isHovered ? '3.5s' : '14s'} linear infinite`
            }}
          >
            <ellipse
              cx="160"
              cy="160"
              rx="88"
              ry="42"
              fill="none"
              stroke="var(--color-paper-worn)"
              strokeWidth="1.2"
              opacity="0.65"
              strokeDasharray="12 6"
            />
            {/* Elliptical Satellite Node */}
            <circle cx="72" cy="160" r="4" fill="var(--color-highlighter)" />
            <circle cx="248" cy="160" r="4" fill="var(--color-stamp-red)" />
          </g>

          {/* ============================================================== */}
          {/* 4. INNER RETICLE RING                                          */}
          {/* Counter-Clockwise: normal 9s, hover 2.5s                       */}
          {/* ============================================================== */}
          <g
            style={{
              transformOrigin: '160px 160px',
              animation: `govSpinCounter ${isHovered ? '2.5s' : '9s'} linear infinite`
            }}
          >
            <circle
              cx="160"
              cy="160"
              r="68"
              fill="none"
              stroke="var(--color-docket-border)"
              strokeWidth="1"
              strokeDasharray="8 6"
            />
            <rect x="159" y="94" width="2" height="6" fill="var(--color-steel)" />
            <rect x="159" y="220" width="2" height="6" fill="var(--color-steel)" />
            <rect x="94" y="159" width="6" height="2" fill="var(--color-steel)" />
            <rect x="220" y="159" width="6" height="2" fill="var(--color-steel)" />
          </g>

          {/* ============================================================== */}
          {/* SCANNING STATE: RADAR SWEEP LINE & INWARD PARTICLES            */}
          {/* ============================================================== */}
          {activeScanning && (
            <g style={{ transformOrigin: '160px 160px' }}>
              {/* Radar Sweep Wedge Beam */}
              <g
                style={{
                  transformOrigin: '160px 160px',
                  animation: 'radarSweep 1.6s linear infinite'
                }}
              >
                <path
                  d="M 160 160 L 160 22 A 138 138 0 0 1 257 63 Z"
                  fill="url(#radarSweepGrad)"
                />
                <line
                  x1="160"
                  y1="160"
                  x2="160"
                  y2="20"
                  stroke="var(--color-stamp-red)"
                  strokeWidth="2.5"
                  style={{ filter: 'drop-shadow(0 0 8px var(--color-stamp-red))' }}
                />
              </g>

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
                      cy: [25, 130],
                      opacity: [0, 0.9, 0],
                      scale: [1.2, 0.6]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.1,
                      delay: i * 0.09,
                      ease: 'easeInOut'
                    }}
                    style={{ filter: 'drop-shadow(0 0 6px var(--color-highlighter))' }}
                  />
                </g>
              ))}
            </g>
          )}

          {/* ============================================================== */}
          {/* IDLE BREATHING GLOW AURA                                       */}
          {/* ============================================================== */}
          <motion.circle
            cx="160"
            cy="160"
            r="44"
            fill="url(#govCoreGlow)"
            animate={{
              scale: activeScanning ? [1, 1.25, 1] : isHovered ? [1.05, 1.18, 1.05] : [0.94, 1.06, 0.94],
              opacity: activeScanning ? [0.8, 1, 0.8] : [0.65, 0.92, 0.65]
            }}
            transition={{
              duration: activeScanning ? 0.8 : isHovered ? 1.6 : 3.4,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{ transformOrigin: '160px 160px' }}
          />

          {/* ============================================================== */}
          {/* CENTER SEAL EMBLEM & LOCK BEZEL                                */}
          {/* ============================================================== */}
          <motion.circle
            cx="160"
            cy="160"
            r="28"
            fill="#0c0d10"
            stroke={flashColor || resultColor}
            strokeWidth="2"
            animate={{
              scale: activeScanning ? [1, 1.08, 1] : 1
            }}
            transition={{
              repeat: activeScanning ? Infinity : 0,
              duration: 0.8
            }}
            style={{
              transformOrigin: '160px 160px',
              filter: `drop-shadow(0 0 8px ${flashColor || resultColor})`
            }}
          />

          {/* Case Seal Inscription */}
          <text
            x="160"
            y="164"
            textAnchor="middle"
            fill="var(--color-paper-light)"
            fontFamily="var(--font-mono)"
            fontSize="11"
            fontWeight="800"
            letterSpacing="1.5"
            style={{ pointerEvents: 'none' }}
          >
            {activeScanning ? 'SCAN' : 'PRK'}
          </text>
        </svg>
      </motion.div>

      {/* Orbit Footer Status Identifier */}
      <div
        style={{
          position: 'absolute',
          bottom: numericSize < 160 ? '-14px' : '-22px',
          fontSize: numericSize < 160 ? '0.62rem' : '0.72rem',
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

      {/* Standardized CSS Keyframes for Performance Hardware Acceleration */}
      <style>{`
        @keyframes govSpinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes govSpinCounter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes radarSweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
