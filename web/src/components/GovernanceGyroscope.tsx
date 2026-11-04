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

  // High-performance 3D tilt tracking toward cursor (MotionValues: ZERO React re-renders)
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
        perspective: 800,
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
          {/* Concentric around 160, 160: Clockwise                          */}
          {/* ============================================================== */}
          <g
            className="gov-orbit-outer"
            style={{
              animationDuration: isHovered ? '6s' : '28s'
            }}
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
          </g>

          {/* ============================================================== */}
          {/* 2. MIDDLE ORBITAL TRACK & 4 ORBITING NODES                     */}
          {/* Concentric around 160, 160: Counter-Clockwise                  */}
          {/* ============================================================== */}
          <g
            className="gov-orbit-middle"
            style={{
              animationDuration: isHovered ? '5s' : '20s'
            }}
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
            {/* 4 Cardinal Orbiting Nodes with High Contrast */}
            <circle cx="160" cy="52" r="5" fill="var(--color-stamp-red)" />
            <circle cx="268" cy="160" r="5" fill="var(--color-highlighter)" />
            <circle cx="160" cy="268" r="5" fill="var(--color-verified-green)" />
            <circle cx="52" cy="160" r="5" fill="var(--color-paper-light)" />
          </g>

          {/* ============================================================== */}
          {/* 3. CENTERED ELLIPTICAL ORBITAL RING                            */}
          {/* Perfectly concentric at cx="160" cy="160", tilted 30 deg       */}
          {/* ============================================================== */}
          <g transform="rotate(30 160 160)">
            <g
              className="gov-orbit-middle"
              style={{
                animationDuration: isHovered ? '3.5s' : '15s'
              }}
            >
              <ellipse
                cx="160"
                cy="160"
                rx="86"
                ry="46"
                fill="none"
                stroke="var(--color-paper-worn)"
                strokeWidth="1.2"
                opacity="0.6"
                strokeDasharray="8 6"
              />
              {/* Elliptical Satellite Nodes */}
              <circle cx="74" cy="160" r="4" fill="var(--color-highlighter)" />
              <circle cx="246" cy="160" r="4" fill="var(--color-stamp-red)" />
            </g>
          </g>

          {/* ============================================================== */}
          {/* 4. INNER RETICLE PRECISION RING                                */}
          {/* Concentric around 160, 160                                     */}
          {/* ============================================================== */}
          <g
            className="gov-orbit-outer"
            style={{
              animationDuration: isHovered ? '3s' : '11s'
            }}
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
          </g>

          {/* ============================================================== */}
          {/* SCANNING STATE: RADAR SWEEP LINE & INWARD PARTICLES            */}
          {/* ============================================================== */}
          {activeScanning && (
            <g>
              {/* Radar Sweep Wedge Beam */}
              <g className="gov-radar-sweep">
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
          <circle
            cx="160"
            cy="160"
            r="28"
            fill="#0c0d10"
            stroke={flashColor || resultColor}
            strokeWidth="2.5"
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

      {/* Hardware-Accelerated CSS Keyframes */}
      <style>{`
        .gov-orbit-outer {
          transform-box: view-box;
          transform-origin: 160px 160px;
          animation: govSpinClockwise linear infinite;
          will-change: transform;
        }
        .gov-orbit-middle {
          transform-box: view-box;
          transform-origin: 160px 160px;
          animation: govSpinCounter linear infinite;
          will-change: transform;
        }
        .gov-radar-sweep {
          transform-box: view-box;
          transform-origin: 160px 160px;
          animation: govSpinClockwise 1.6s linear infinite;
          will-change: transform;
        }
        @keyframes govSpinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes govSpinCounter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};
