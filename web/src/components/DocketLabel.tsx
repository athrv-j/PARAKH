import React from 'react';

interface DocketLabelProps {
  docketId: string;
  clientName?: string;
  category?: string;
  className?: string;
}

export const DocketLabel: React.FC<DocketLabelProps> = ({
  docketId,
  clientName,
  category,
  className = ''
}) => {
  return (
    <div
      className={`docket-label ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
    >
      <span style={{ color: 'var(--color-stamp-red)', fontWeight: 700 }}>
        CASE FILE // {docketId}
      </span>
      {clientName && (
        <>
          <span style={{ opacity: 0.5 }}>•</span>
          <span style={{ color: 'var(--color-paper-light)' }}>{clientName}</span>
        </>
      )}
      {category && (
        <>
          <span style={{ opacity: 0.5 }}>•</span>
          <span
            style={{
              padding: '2px 6px',
              backgroundColor: 'var(--color-steel-dark)',
              borderRadius: '2px',
              fontSize: '0.7rem',
              color: 'var(--color-highlighter)'
            }}
          >
            {category.toUpperCase()}
          </span>
        </>
      )}
    </div>
  );
};
