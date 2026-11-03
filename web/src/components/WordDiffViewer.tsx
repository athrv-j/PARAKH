import React from 'react';

interface WordDiffToken {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface WordDiffViewerProps {
  tokens: WordDiffToken[];
  className?: string;
}

export const WordDiffViewer: React.FC<WordDiffViewerProps> = ({ tokens, className = '' }) => {
  return (
    <div
      className={`word-diff-container ${className}`}
      style={{
        lineHeight: 1.6,
        fontFamily: 'var(--font-sans)',
        fontSize: '0.92rem',
        padding: '0.75rem',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-steel-dark)'
      }}
    >
      {tokens.map((token, idx) => {
        if (token.added) {
          return (
            <ins key={idx} className="diff-added">
              {token.value}
            </ins>
          );
        }
        if (token.removed) {
          return (
            <del key={idx} className="diff-removed">
              {token.value}
            </del>
          );
        }
        return <span key={idx}>{token.value}</span>;
      })}
    </div>
  );
};
