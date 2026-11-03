import React, { useState } from 'react';

interface GovernanceGyroscopeProps {
  status?: 'active' | 'verified' | 'alert';
  size?: number;
}

export const GovernanceGyroscope: React.FC<GovernanceGyroscopeProps> = ({
  status = 'active',
  size = 220
}) => {
  const [isSpun, setIsSpun] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);

  const coreColor =
    status === 'verified'
      ? 'var(--color-verified-green)'
      : status === 'alert'
      ? 'var(--color-stamp-red)'
      : 'var(--color-highlighter)';

  const handleClick = () => {
    setIsSpun(true);
    setPulseCount(prev => prev + 1);
    setTimeout(() => setIsSpun(false), 1200);
  };

  return (
    <div
      onClick={handleClick}
      title="Parakh Governance Engine Core — Click to pulse"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        margin: '0 auto'
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        style={{
          filter: `drop-shadow(0 0 16px ${coreColor}33)`,
          transition: 'all 0.4s ease'
        }}
      >
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={coreColor} stopOpacity="0.8" />
            <stop offset="60%" stopColor={coreColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Outer Rotating Gear Ring */}
        <g
          style={{
            transformOrigin: 'center',
            animation: `spin ${isSpun ? '2s' : '36s'} linear infinite`
          }}
        >
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="var(--color-docket-border)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />
          {/* Ticks */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <rect
              key={deg}
              x="98"
              y="8"
              width="4"
              height="8"
              fill="var(--color-steel)"
              transform={`rotate(${deg} 100 100)`}
            />
          ))}
        </g>

        {/* Middle Counter-Rotating Gyroscope Ring */}
        <g
          style={{
            transformOrigin: 'center',
            animation: `spinReverse ${isSpun ? '2.5s' : '24s'} linear infinite`
          }}
        >
          <circle
            cx="100"
            cy="100"
            r="68"
            fill="none"
            stroke={coreColor}
            strokeWidth="1.5"
            strokeDasharray="18 12"
            opacity="0.85"
          />
          {/* Orbital Nodes */}
          <circle cx="100" cy="32" r="4.5" fill="var(--color-stamp-red)" />
          <circle cx="168" cy="100" r="4.5" fill="var(--color-highlighter)" />
          <circle cx="100" cy="168" r="4.5" fill="var(--color-verified-green)" />
          <circle cx="32" cy="100" r="4.5" fill="var(--color-steel-light)" />
        </g>

        {/* Inner Oscillating Orbital Ellipse */}
        <g
          style={{
            transformOrigin: 'center',
            animation: `spin ${isSpun ? '1.5s' : '14s'} ease-in-out infinite alternate`
          }}
        >
          <ellipse
            cx="100"
            cy="100"
            rx="48"
            ry="24"
            fill="none"
            stroke="var(--color-paper-worn)"
            strokeWidth="1.2"
            opacity="0.6"
          />
        </g>

        {/* Center Pulsing Case Seal Core */}
        <circle cx="100" cy="100" r="32" fill="url(#coreGlow)" />
        <circle
          cx="100"
          cy="100"
          r="20"
          fill="#101114"
          stroke={coreColor}
          strokeWidth="2"
          style={{
            transition: 'all 0.3s ease',
            transform: isSpun ? 'scale(1.1)' : 'scale(1)',
            transformOrigin: 'center'
          }}
        />

        {/* Brand Emblem Inscription */}
        <text
          x="100"
          y="105"
          textAnchor="middle"
          fill="var(--color-paper-light)"
          fontFamily="var(--font-mono)"
          fontSize="10"
          fontWeight="700"
          letterSpacing="1"
        >
          PRK
        </text>
      </svg>

      {/* Center Interactive Tooltip */}
      <div
        style={{
          position: 'absolute',
          bottom: '-18px',
          fontSize: '0.68rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-steel)',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}
      >
        GOV CORE {pulseCount > 0 ? `// PULSE #${pulseCount}` : '// ACTIVE'}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};
