import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface InteractiveUploadZoneProps {
  onEvaluate: (title: string, channel: string, text: string) => void;
  isEvaluating: boolean;
  clientName: string;
}

const SAMPLE_CHIPS = [
  {
    label: '🚨 Violation: Unapproved Cure Claim',
    title: 'Monsoon Miracle Cure Campaign',
    channel: 'social',
    text: 'DENGUE OUTBREAK IN YOUR CITY! Kavach Health offers a 100% guaranteed miracle cure blood screening. Book now for only ₹199 at all verified centers!'
  },
  {
    label: '💰 Discrepancy: Expired Package Price',
    title: 'Executive Full Body Health Package',
    channel: 'email',
    text: 'Book the Kavach Gold Executive Full Body Checkup for only ₹799 (original ₹4,999). 100% instant recovery reports delivered in 2 hours.'
  },
  {
    label: '✅ Verified: 100% Compliant Copy',
    title: 'Routine Monsoon Preventive Health Check',
    channel: 'social',
    text: 'Stay ahead of seasonal illnesses. Schedule a comprehensive diagnostic blood panel with Kavach Health certified laboratories. Consultation fees starting from ₹499. Terms apply.'
  }
];

export const InteractiveUploadZone: React.FC<InteractiveUploadZoneProps> = ({
  onEvaluate,
  isEvaluating,
  clientName
}) => {
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('social');
  const [text, setText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSpiraling, setIsSpiraling] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isScanningSweep, setIsScanningSweep] = useState(false);
  const [typingInterval, setTypingInterval] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_CHARS = 1000;
  const charCount = text.length;
  const RADIUS = 9;
  const circumference = 2 * Math.PI * RADIUS;
  const strokeDashoffset = circumference - (Math.min(1, charCount / MAX_CHARS) * circumference);

  // Cleanup typewriter interval on unmount
  useEffect(() => {
    return () => {
      if (typingInterval) clearInterval(typingInterval);
    };
  }, [typingInterval]);

  // Handle sample chip click with auto-type effect
  const handleSelectSample = (sample: typeof SAMPLE_CHIPS[0]) => {
    if (typingInterval) clearInterval(typingInterval);
    setTitle(sample.title);
    setChannel(sample.channel);
    setText('');
    setHasError(false);

    let idx = 0;
    const fullText = sample.text;
    const interval = setInterval(() => {
      idx += 3;
      if (idx >= fullText.length) {
        setText(fullText);
        clearInterval(interval);
        setTypingInterval(null);
      } else {
        setText(fullText.slice(0, idx));
      }
    }, 15);
    setTypingInterval(interval);
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const processDroppedFile = (file: File) => {
    setIsDragOver(false);
    setIsSpiraling(true);

    setTimeout(() => {
      setIsSpiraling(false);
      setIsParsing(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = (e.target?.result as string) || '';
        setTimeout(() => {
          setIsParsing(false);
          const sanitizedTitle = file.name.replace(/\.[^/.]+$/, '');
          setTitle(sanitizedTitle);
          setText(content.slice(0, 1200));
          onEvaluate(sanitizedTitle, 'social', content.slice(0, 1200));
        }, 1200);
      };
      reader.readAsText(file);
    }, 900);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processDroppedFile(files[0]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      setHasError(true);
      setErrorMessage('Please provide both headline and copy text to evaluate.');
      setTimeout(() => setHasError(false), 800);
      return;
    }

    setIsScanningSweep(true);
    setTimeout(() => {
      setIsScanningSweep(false);
      onEvaluate(title, channel, text);
    }, 450);
  };

  return (
    <motion.div
      animate={hasError ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
      transition={{ duration: 0.45 }}
      style={{ width: '100%' }}
    >
      {/* Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => setMode('paste')}
          aria-label="Direct Paste Mode"
          className="btn"
          style={{
            fontSize: '0.78rem',
            padding: '0.45rem 1rem',
            minHeight: '36px',
            backgroundColor: mode === 'paste' ? 'var(--color-stamp-red)' : 'var(--color-ink-card)',
            color: '#FFFFFF',
            border: '1px solid var(--color-docket-border)'
          }}
        >
          ✍️ Direct Text Paste
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          aria-label="Drag and Drop Document Upload Mode"
          className="btn"
          style={{
            fontSize: '0.78rem',
            padding: '0.45rem 1rem',
            minHeight: '36px',
            backgroundColor: mode === 'upload' ? 'var(--color-stamp-red)' : 'var(--color-ink-card)',
            color: '#FFFFFF',
            border: '1px solid var(--color-docket-border)'
          }}
        >
          📂 Drag & Drop File
        </button>
      </div>

      {/* SAMPLE CHIP PICKERS */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase', marginBottom: '0.5rem', textAlign: 'center' }}>
          One-Click Demo Test Cases:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
          {SAMPLE_CHIPS.map((sample, idx) => (
            <motion.button
              key={idx}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelectSample(sample)}
              style={{
                backgroundColor: 'var(--color-ink-card)',
                border: '1px solid var(--color-docket-border)',
                borderRadius: '20px',
                padding: '4px 12px',
                color: 'var(--color-paper-light)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {sample.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* DRAG-AND-DROP UPLOAD ZONE */}
      {mode === 'upload' ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
          tabIndex={0}
          role="region"
          aria-label="Upload zone for creative copy files"
          style={{
            width: '100%',
            height: '240px',
            position: 'relative',
            borderRadius: '8px',
            backgroundColor: isDragOver ? 'rgba(215, 38, 61, 0.08)' : 'var(--color-ink-card)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            border: '2px solid transparent'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.docx"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processDroppedFile(e.target.files[0]);
              }
            }}
          />

          {/* Marching-Ants Animated Border on Drag-Over */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            <rect
              x="2"
              y="2"
              width="calc(100% - 4px)"
              height="calc(100% - 4px)"
              rx="8"
              fill="none"
              stroke={isDragOver ? 'var(--color-stamp-red)' : 'var(--color-docket-border)'}
              strokeWidth="2"
              strokeDasharray={isDragOver ? '8 6' : '6 4'}
              className={isDragOver ? 'marching-ants' : ''}
            />
          </svg>

          {/* Vortex Graphic on Drag Over */}
          {isDragOver && (
            <motion.div
              animate={{ rotate: 360, scale: [0.95, 1.05, 0.95] }}
              transition={{ rotate: { repeat: Infinity, duration: 3, ease: 'linear' }, scale: { repeat: Infinity, duration: 1.5 } }}
              style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                border: '2px dashed var(--color-stamp-red)',
                opacity: 0.35,
                pointerEvents: 'none'
              }}
            />
          )}

          {/* Spiraling Inward File Card Animation */}
          {isSpiraling && (
            <motion.div
              initial={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
              animate={{ scale: 0.15, rotate: 720, opacity: 0, y: -90 }}
              transition={{ duration: 0.85, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                padding: '12px 20px',
                backgroundColor: 'var(--color-paper-light)',
                color: '#101114',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                fontWeight: 700,
                boxShadow: '0 8px 30px var(--color-stamp-red)',
                zIndex: 10
              }}
            >
              📄 INGESTING DRAFT...
            </motion.div>
          )}

          {/* Parsing Redaction Bars Animation */}
          {isParsing && (
            <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 5 }}>
              <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-highlighter)', textAlign: 'center' }}>
                REDACTING & PARSING GUIDELINES...
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15, ease: 'easeInOut' }}
                    style={{ height: '100%', width: '60%', backgroundColor: 'var(--color-stamp-red)' }}
                  />
                </div>
              ))}
            </div>
          )}

          {!isSpiraling && !isParsing && (
            <div style={{ textAlign: 'center', zIndex: 2, padding: '0 1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                {isDragOver ? '🌀' : '📁'}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--color-paper-light)', marginBottom: '0.25rem' }}>
                {isDragOver ? `Release to Ingest into Gov Core for ${clientName}` : `Drop Copy Document for ${clientName}`}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-steel)', fontFamily: 'var(--font-mono)' }}>
                Supports .md, .txt, .docx • Or click to browse
              </div>
            </div>
          )}
        </div>
      ) : (
        /* PASTE FORM MODE */
        <form
          onSubmit={handleFormSubmit}
          style={{
            width: '100%',
            backgroundColor: 'var(--color-ink-card)',
            border: '1px solid var(--color-docket-border)',
            borderRadius: '8px',
            padding: '1.75rem',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            position: 'relative'
          }}
        >
          {/* Scanning Sweep Laser Line */}
          <AnimatePresence>
            {isScanningSweep && (
              <motion.div
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: '3px',
                  backgroundColor: 'var(--color-stamp-red)',
                  boxShadow: '0 0 15px 3px var(--color-stamp-red)',
                  zIndex: 20,
                  pointerEvents: 'none'
                }}
              />
            )}
          </AnimatePresence>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Campaign Title / Headline
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Monsoon Health Screening Campaign"
              required
              aria-label="Campaign Title"
              style={{
                width: '100%',
                backgroundColor: 'var(--color-ink)',
                border: '1px solid var(--color-docket-border)',
                borderRadius: '4px',
                padding: '0.65rem 0.85rem',
                color: 'var(--color-paper-light)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Publishing Channel
            </label>
            <select
              value={channel}
              onChange={e => setChannel(e.target.value)}
              aria-label="Publishing Channel"
              style={{
                width: '100%',
                backgroundColor: 'var(--color-ink)',
                border: '1px solid var(--color-docket-border)',
                borderRadius: '4px',
                padding: '0.65rem 0.85rem',
                color: 'var(--color-paper-light)',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            >
              <option value="social">Social Media (Instagram / X / LinkedIn)</option>
              <option value="email">Email Newsletter</option>
              <option value="press_release">Press Release</option>
              <option value="web">Website Copy</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase' }}>
                Draft Copy Content
              </label>

              {/* Circular Character Counter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: charCount > MAX_CHARS ? 'var(--color-stamp-red)' : 'var(--color-steel)' }}>
                  {charCount}/{MAX_CHARS}
                </span>
                <svg width="24" height="24" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke="var(--color-docket-border)"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r={RADIUS}
                    fill="none"
                    stroke={charCount > MAX_CHARS ? 'var(--color-stamp-red)' : charCount > MAX_CHARS * 0.8 ? 'var(--color-highlighter)' : 'var(--color-verified-green)'}
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.15s ease' }}
                  />
                </svg>
              </div>
            </div>

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste your creative marketing copy here to evaluate against brand guidelines..."
              rows={6}
              required
              aria-label="Draft Copy Content"
              style={{
                width: '100%',
                backgroundColor: 'var(--color-ink)',
                border: '1px solid var(--color-docket-border)',
                borderRadius: '4px',
                padding: '0.75rem',
                color: 'var(--color-paper-light)',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                outline: 'none',
                fontFamily: 'var(--font-sans)'
              }}
            />
          </div>

          {errorMessage && (
            <div style={{ color: 'var(--color-stamp-red)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
              ⚠ {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isEvaluating}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem', fontWeight: 700 }}
          >
            {isEvaluating ? '⚙️ Running Citation Gate & Brand Compliance...' : '⚡ Scan & Evaluate Copy with Parakh AI'}
          </button>
        </form>
      )}

      <style>{`
        .marching-ants {
          animation: marchingAnts 0.6s linear infinite;
        }
        @keyframes marchingAnts {
          to {
            stroke-dashoffset: -14;
          }
        }
      `}</style>
    </motion.div>
  );
};
