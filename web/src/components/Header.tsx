import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { springs, staggerContainer, fadeUp } from '../motion';

export type NavTabId = 'review' | 'ripple' | 'debugger' | 'about_ai';

interface ClientItem {
  id: string;
  name: string;
}

interface HeaderProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  clients: ClientItem[];
  selectedClientId: string;
  onClientSwitch: (newId: string) => void;
  authUser: any;
  onOpenAuth: () => void;
  onOpenUpload: () => void;
  onOpenQuickGuide: () => void;
}

const NAV_TABS = [
  { id: 'review' as NavTabId, label: 'Review', icon: '📋' },
  { id: 'ripple' as NavTabId, label: 'Fact Ripple', icon: '🕸️' },
  { id: 'debugger' as NavTabId, label: 'Debugger', icon: '🩺' },
  { id: 'about_ai' as NavTabId, label: 'About AI', icon: '🛡️' }
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  clients,
  selectedClientId,
  onClientSwitch,
  authUser,
  onOpenAuth,
  onOpenUpload,
  onOpenQuickGuide
}) => {
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close vault dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsVaultOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sticky header scroll compression
  const { scrollY } = useScroll();
  const logoScale = useTransform(scrollY, [0, 80], [1, 0.9]);

  const currentClient = clients.find(c => c.id === selectedClientId) || clients[0];

  return (
    <>
      {/* DESKTOP & TABLET STICKY HEADER */}
      <header
        className="header-main"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: '1px solid var(--color-docket-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: '1rem',
          padding: '0.65rem 1.5rem',
          backgroundColor: 'rgba(16, 17, 20, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxSizing: 'border-box',
          width: '100%'
        }}
      >
        {/* LEFT: LOGO & BRAND VAULT SELECTOR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {/* Logo */}
          <motion.div
            style={{
              scale: logoScale,
              transformOrigin: 'left center',
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.35rem',
              cursor: 'pointer',
              flexShrink: 0
            }}
            onClick={() => onTabChange('review')}
          >
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-paper-light)', letterSpacing: '-0.5px' }}>
              Parakh
            </span>
            <span className="header-logo-sub" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--color-steel)' }}>
              (परख)
            </span>
            <span className="header-logo-sub" style={{ fontSize: '0.62rem', color: 'var(--color-highlighter)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
              // GOV
            </span>
          </motion.div>

          {/* BRAND VAULT DROPDOWN */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ borderColor: 'var(--color-highlighter)' }}
              onClick={() => setIsVaultOpen(!isVaultOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'var(--color-ink-card)',
                border: '1px solid var(--color-docket-border)',
                borderRadius: '6px',
                padding: '5px 10px',
                color: 'var(--color-paper-light)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}
            >
              <span>🏢</span>
              <span style={{ color: 'var(--color-paper-light)', fontWeight: 600 }}>
                {currentClient.name}
              </span>
              <motion.span
                animate={{ rotate: isVaultOpen ? 180 : 0 }}
                transition={springs.snappy}
                style={{ fontSize: '0.75rem', color: 'var(--color-steel)', marginLeft: '2px', display: 'inline-block' }}
              >
                ▾
              </motion.span>
            </motion.button>

            {/* Dropdown Popover */}
            <AnimatePresence>
              {isVaultOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: springs.snappy }}
                  exit={{ opacity: 0, y: 6, scale: 0.95, transition: { duration: 0.15 } }}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    minWidth: '220px',
                    backgroundColor: 'var(--color-ink-surface)',
                    border: '1px solid var(--color-docket-border)',
                    borderRadius: '8px',
                    boxShadow: '0 14px 35px rgba(0, 0, 0, 0.65)',
                    padding: '6px',
                    zIndex: 200,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Select Tenant Vault
                  </div>

                  <motion.div variants={staggerContainer(0.04, 0.02)} initial="hidden" animate="visible">
                    {clients.map(c => {
                      const isSelected = c.id === selectedClientId;
                      return (
                        <motion.button
                          key={c.id}
                          variants={fadeUp}
                          whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => {
                            setIsVaultOpen(false);
                            onClientSwitch(c.id);
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: isSelected ? 'rgba(215, 38, 61, 0.12)' : 'transparent',
                            color: isSelected ? 'var(--color-stamp-red)' : 'var(--color-paper-light)',
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <span style={{ fontWeight: isSelected ? 700 : 500 }}>
                            🏢 {c.name}
                          </span>
                          {isSelected && <span style={{ fontSize: '0.75rem' }}>✓</span>}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CENTER: DESKTOP NAV TABS (PIXEL-PERFECT, NO WRAPPING, LEVEL HEIGHT) */}
        <nav
          className="desktop-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            backgroundColor: 'var(--color-ink-card)',
            padding: '3px 4px',
            borderRadius: '8px',
            border: '1px solid var(--color-docket-border)',
            height: '38px',
            boxSizing: 'border-box'
          }}
        >
          {NAV_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.96 }}
                whileHover="hover"
                initial="initial"
                onClick={() => onTabChange(tab.id)}
                style={{
                  position: 'relative',
                  border: 'none',
                  background: 'transparent',
                  padding: '5px 12px',
                  height: '32px',
                  borderRadius: '6px',
                  color: isActive ? '#FFFFFF' : 'var(--color-steel)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  zIndex: 1,
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                  lineHeight: 1
                }}
              >
                {/* GLIDING RED ACTIVE PILL VIA layoutId — FITS EXACTLY INSIDE NAV BAR */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    transition={springs.snappy}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-stamp-red)',
                      boxShadow: '0 0 12px rgba(215, 38, 61, 0.45)',
                      zIndex: -1
                    }}
                  />
                )}

                <span style={{ fontSize: '0.85rem' }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* RIGHT: AUTH, INGEST & INFO BUTTONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {/* Supabase Auth Button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.03 }}
            onClick={onOpenAuth}
            className="auth-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'transparent',
              border: `1px solid ${authUser ? 'var(--color-verified-green)' : 'var(--color-docket-border)'}`,
              borderRadius: '6px',
              padding: '6px 10px',
              color: authUser ? 'var(--color-verified-green)' : 'var(--color-paper-light)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <span>⚡</span>
            <span>{authUser ? authUser.email.split('@')[0] : 'Supabase Auth'}</span>
          </motion.button>

          {/* Ingest Guidelines Button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.03 }}
            onClick={onOpenUpload}
            className="btn btn-primary ingest-btn"
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            + Ingest Guidelines
          </motion.button>

          {/* Info Quick Guide Icon Button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.12, rotate: 15 }}
            title="Project Quick Guide"
            onClick={onOpenQuickGuide}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-ink-card)',
              border: '1px solid var(--color-highlighter)',
              color: 'var(--color-highlighter)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 800,
              boxShadow: '0 0 10px rgba(255, 214, 10, 0.2)',
              flexShrink: 0
            }}
          >
            ⓘ
          </motion.button>
        </div>
      </header>

      {/* MOBILE BOTTOM TAB BAR (Appears on screens <= 768px) */}
      <nav
        className="mobile-bottom-nav"
        style={{
          display: 'none',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 900,
          backgroundColor: 'rgba(12, 13, 16, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--color-docket-border)',
          padding: '6px 8px calc(6px + env(safe-area-inset-bottom, 0px)) 8px',
          justifyContent: 'space-around',
          alignItems: 'center'
        }}
      >
        {NAV_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => onTabChange(tab.id)}
              style={{
                position: 'relative',
                border: 'none',
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '6px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: isActive ? '#FFFFFF' : 'var(--color-steel)',
                flex: 1,
                userSelect: 'none'
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavPillMobile"
                  transition={springs.snappy}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-stamp-red)',
                    boxShadow: '0 0 12px rgba(215, 38, 61, 0.45)',
                    zIndex: -1
                  }}
                />
              )}

              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', fontWeight: isActive ? 700 : 500, letterSpacing: '0.5px' }}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 860px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-bottom-nav {
            display: flex !important;
          }
          main {
            padding-bottom: 74px !important;
          }
        }
        @media (max-width: 640px) {
          .header-main {
            padding: 0.5rem 0.65rem !important;
            gap: 0.35rem !important;
          }
          .header-logo-sub {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};
