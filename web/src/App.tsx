import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ReviewWorkspace, FindingUI } from './scenes/ReviewWorkspace.tsx';
import { FactRippleBoard } from './scenes/FactRippleBoard.tsx';
import { GuidelineDebuggerView } from './scenes/GuidelineDebuggerView.tsx';
import { AboutAiView } from './pages/AboutAiView.tsx';
import { GovernanceGyroscope } from './components/GovernanceGyroscope.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { QuickGuideModal } from './components/QuickGuideModal.tsx';
import { Header, NavTabId } from './components/Header.tsx';
import { VaultDoorTransition } from './components/VaultDoorTransition.tsx';
import { HowParakhWorks } from './components/HowParakhWorks.tsx';
import { InteractiveUploadZone } from './components/InteractiveUploadZone.tsx';
import { CustomCursor } from './components/CustomCursor.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { getSupabase } from './lib/supabaseClient.ts';


interface ClientItem {
  id: string;
  name: string;
}

interface DraftItem {
  id: string;
  version_id?: string;
  title: string;
  channel: string;
  text: string;
  ai_status?: 'available' | 'unavailable' | 'cached';
  ai_notice?: string | null;
  from_cache?: boolean;
  findings: FindingUI[];
}

export default function App() {
  const [clients, setClients] = useState<ClientItem[]>([
    { id: 'client_kavach', name: 'Kavach Health' },
    { id: 'client_vyapar', name: 'VyaparSetu Fintech' },
    { id: 'client_mitti', name: 'Mitti & Moon Botanical' }
  ]);
  const [selectedClientId, setSelectedClientId] = useState<string>('client_kavach');
  const [currentDraft, setCurrentDraft] = useState<DraftItem | null>(null);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalErrorNotice, setEvalErrorNotice] = useState<string | null>(null);

  // Tab & Auth State
  const [activeTab, setActiveTab] = useState<NavTabId>('review');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isQuickGuideOpen, setIsQuickGuideOpen] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);

  // Vault Door Transition State
  const [isVaultDoorTransitionOpen, setIsVaultDoorTransitionOpen] = useState(false);
  const [targetVaultName, setTargetVaultName] = useState('');
  const [pendingVaultId, setPendingVaultId] = useState<string | null>(null);

  // Gov Core Scan Result & Hero Ref
  const [scanResult, setScanResult] = useState<'green' | 'amber' | 'red' | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Pause animations when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        document.documentElement.classList.add('tab-hidden');
      } else {
        document.documentElement.classList.remove('tab-hidden');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);


  // Restore Parakh Auth Session from LocalStorage & Supabase fallback
  useEffect(() => {
    try {
      const stored = localStorage.getItem('parakh_auth_user');
      if (stored) {
        setAuthUser(JSON.parse(stored));
      }
    } catch {}

    const client = getSupabase();
    if (client) {
      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) setAuthUser(session.user);
      });
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) setAuthUser(session.user);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  // Fetch client list from backend API
  useEffect(() => {
    fetch('/api/clients')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.clients && data.clients.length > 0) {
          setClients(data.clients);
        }
      })
      .catch(() => {});
  }, []);

  const currentClient = clients.find(c => c.id === selectedClientId) || clients[0];

  // Dynamic evaluation: When user submits copy from InteractiveUploadZone
  const handleEvaluateFromZone = async (title: string, channel: string, text: string) => {
    setIsEvaluating(true);
    setScanResult(null);
    setEvalErrorNotice(null);
    try {
      const response = await fetch(`/api/review/clients/${selectedClientId}/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          channel,
          text,
          author: authUser ? authUser.email : 'Agency Creator'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Evaluation request returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.draft) {
        const findings = data.draft.findings || [];
        const hasCritical = findings.some((f: any) => f.severity === 'critical');
        const hasWarning = findings.some((f: any) => f.severity === 'warning');
        const result: 'green' | 'amber' | 'red' = hasCritical ? 'red' : hasWarning ? 'amber' : 'green';
        setScanResult(result);

        // Allow scan completion flash to display on Gov Core before unrolling review workspace
        setTimeout(() => {
          setCurrentDraft({
            id: data.draft.id,
            version_id: data.draft.version_id,
            title: data.draft.title,
            channel: data.draft.channel,
            text: data.draft.text,
            ai_status: data.draft.ai_status || data.ai_status,
            ai_notice: data.draft.ai_notice || data.ai_notice,
            from_cache: data.draft.from_cache || data.from_cache,
            findings: data.draft.findings || []
          });
          setActiveTab('review');
          setIsEvaluating(false);
        }, 950);
      } else {
        setIsEvaluating(false);
      }
    } catch (err: any) {
      setEvalErrorNotice(err.message || 'Failed to complete review. Please check connection and try again.');
      setIsEvaluating(false);
    }
  };



  const handleDraftCreatedFromModal = (newDraft: any) => {
    setCurrentDraft({
      id: newDraft.id,
      version_id: newDraft.version_id,
      title: newDraft.title,
      channel: newDraft.channel,
      text: newDraft.text,
      findings: newDraft.findings || []
    });
    setActiveTab('review');
  };

  const handleClientSwitch = (newId: string) => {
    if (newId === selectedClientId) return;
    const target = clients.find(c => c.id === newId);
    setTargetVaultName(target?.name || 'Client Vault');
    setPendingVaultId(newId);
    setIsVaultDoorTransitionOpen(true);
  };

  const handleTransitionComplete = () => {
    if (pendingVaultId) {
      setSelectedClientId(pendingVaultId);
      setCurrentDraft(null);
    }
    setIsVaultDoorTransitionOpen(false);
  };

  const handleClientCreated = (newClient: { id: string; name: string }) => {
    setClients(prev => [...prev, newClient]);
    setSelectedClientId(newClient.id);
    setCurrentDraft(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-ink)' }}>
      {/* UPGRADED HEADER WITH STICKY SCROLL COMPRESSION, GLIDING RED PILL, AND VAULT DROPDOWN */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        clients={clients}
        selectedClientId={selectedClientId}
        onClientSwitch={handleClientSwitch}
        authUser={authUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenQuickGuide={() => setIsQuickGuideOpen(true)}
      />

      {/* MECHANICAL VAULT DOOR TRANSITION WITH TYPEWRITER EFFECT */}
      <VaultDoorTransition
        isOpen={isVaultDoorTransitionOpen}
        targetVaultName={targetVaultName}
        onTransitionComplete={handleTransitionComplete}
      />


      {/* MAIN VIEWPORT WITH PURPOSEFUL TAB PAGE TRANSITIONS */}
      <main style={{ flex: 1, padding: '1rem 0', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, filter: 'blur(3px)' }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(3px)' }}
            transition={{ duration: prefersReducedMotion ? 0.15 : 0.28, ease: [0.19, 1, 0.22, 1] }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {activeTab === 'review' && (
              <>
                {!currentDraft ? (
                  <>
                    <div
                    ref={heroRef}
                    className="hero-card"
                    onMouseMove={e => {
                      if (!heroRef.current) return;
                      const rect = heroRef.current.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      heroRef.current.style.setProperty('--spotlight-x', `${x}px`);
                      heroRef.current.style.setProperty('--spotlight-y', `${y}px`);
                    }}
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: '780px',
                      margin: '1.5rem auto',
                      padding: '2.5rem 1.5rem',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      overflow: 'hidden',
                      background: 'radial-gradient(650px circle at var(--spotlight-x, 50%) var(--spotlight-y, 35%), rgba(215, 38, 61, 0.08), rgba(255, 214, 10, 0.03) 40%, transparent 70%)',
                      border: '1px solid var(--color-docket-border)',
                      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)'
                    }}
                  >
                    {/* Lightweight Tactile Grid Texture */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        opacity: 0.35,
                        zIndex: 0,
                        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }}
                    />

                    {/* Center Interactive Gov Core Gyroscope Graphic */}
                    <div style={{ marginBottom: '1.25rem', position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
                      <GovernanceGyroscope
                        status={isEvaluating ? 'scanning' : 'active'}
                        isScanning={isEvaluating}
                        scanResult={scanResult}
                        size={240}
                      />
                    </div>

                    {/* Clean Serif Headline — Rock-solid Typography with Zero Word Overlap */}
                    <h1
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 'clamp(1.75rem, 3.8vw, 2.35rem)',
                        color: 'var(--color-paper-light)',
                        textAlign: 'center',
                        margin: '0 auto 0.75rem auto',
                        maxWidth: '640px',
                        lineHeight: 1.25,
                        fontWeight: 800
                      }}
                    >
                      Upload or Paste Copy for Brand Governance Review
                    </h1>

                    {/* Subtext */}
                    <p
                      style={{
                        fontSize: '0.92rem',
                        color: 'var(--color-steel)',
                        textAlign: 'center',
                        maxWidth: '560px',
                        lineHeight: '1.6',
                        margin: '0 auto 1.75rem auto'
                      }}
                    >
                      Upload your draft copy or promotional text below. Parakh will evaluate it dynamically against {currentClient.name}'s guideline clauses, prohibited terminology, and pricing fact sheets.
                    </p>

                    {evalErrorNotice && (
                      <div
                        style={{
                          backgroundColor: 'rgba(215, 38, 61, 0.15)',
                          border: '1px solid var(--color-stamp-red)',
                          color: 'var(--color-stamp-red)',
                          padding: '0.75rem 1.25rem',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          marginBottom: '1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>⚠️ {evalErrorNotice}</span>
                        <button
                          onClick={() => setEvalErrorNotice(null)}
                          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {/* Interactive Drag-and-Drop & Auto-Typing Upload Hub */}
                    <InteractiveUploadZone
                      onEvaluate={handleEvaluateFromZone}
                      isEvaluating={isEvaluating}
                      clientName={currentClient.name}
                    />
                  </div>

                  {/* SCROLL-DRIVEN HOW PARAKH WORKS WALKTHROUGH */}
                  <HowParakhWorks />
                </>
              ) : (
                  /* WHEN USER HAS SUBMITTED: SHOW STREAMLINED REVIEW WORKSPACE */
                  <ReviewWorkspace
                    clientId={currentClient.id}
                    clientName={currentClient.name}
                    draftId={currentDraft.id}
                    title={currentDraft.title}
                    channel={currentDraft.channel}
                    initialText={currentDraft.text}
                    initialFindings={currentDraft.findings}
                    aiStatus={currentDraft.ai_status}
                    aiNotice={currentDraft.ai_notice}
                    fromCache={currentDraft.from_cache}
                    onNewReviewRequested={() => setCurrentDraft(null)}
                  />
                )}
              </>
            )}

            {activeTab === 'ripple' && (
              <FactRippleBoard
                clientId={currentClient.id}
                clientName={currentClient.name}
              />
            )}

            {activeTab === 'debugger' && (
              <GuidelineDebuggerView
                clientId={currentClient.id}
                clientName={currentClient.name}
              />
            )}

            {activeTab === 'about_ai' && <AboutAiView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer
        className="app-footer"
        style={{
          borderTop: '1px solid var(--color-docket-border)',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: 'var(--color-steel)',
          backgroundColor: 'var(--color-ink-surface)',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div>
          <strong>Parakh (परख)</strong> — The Memory of Every Brand Decision.
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontFamily: 'var(--font-mono)', flexWrap: 'wrap' }}>
          <span>VAULT: {currentClient.name}</span>
          <span>AUTH: {authUser ? 'SUPABASE' : 'GUEST'}</span>
          <span>CITATION GATE: ENFORCED</span>
        </div>
      </footer>

      {/* Upload Guidelines Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        clientId={currentClient.id}
        clientName={currentClient.name}
        onDraftCreated={handleDraftCreatedFromModal}
        onGuidelinesImported={() => {}}
        onClientCreated={handleClientCreated}
      />

      {/* Supabase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthStateChange={user => setAuthUser(user)}
      />

      {/* Project Quick Guide Modal */}
      <QuickGuideModal
        isOpen={isQuickGuideOpen}
        onClose={() => setIsQuickGuideOpen(false)}
      />

      {/* Purposeful Spring-in Toasts */}
      <ToastContainer />

      {/* Custom Cursor (Dot + Ring, Magnifier on Interactive, Stamp on Findings; Disabled on Touch) */}
      <CustomCursor />

      {/* Responsive Styles for App Viewports */}
      <style>{`
        @media (max-width: 640px) {
          .hero-card {
            padding: 1.5rem 0.85rem !important;
            margin: 0.75rem auto !important;
            border-radius: 8px !important;
          }
          .app-footer {
            padding: 0.75rem 1rem !important;
            font-size: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}
