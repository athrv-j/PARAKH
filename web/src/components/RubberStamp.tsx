import React from 'react';

export type StampType = 'APPROVED' | 'PRECEDENT' | 'EXPIRED' | 'CHANGES REQUIRED';

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
  const typeClass =
    type === 'APPROVED'
      ? 'approved'
      : type === 'PRECEDENT'
      ? 'precedent'
      : type === 'EXPIRED'
      ? 'expired'
      : '';

  return (
    <div
      className={`rubber-stamp ${typeClass} ${animate ? 'animate-stamp-slam' : ''} ${className}`}
      style={style}
    >
      {type}
    </div>
  );
};
