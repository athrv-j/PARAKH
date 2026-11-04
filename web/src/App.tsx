import { useState, useEffect, useRef } from 'react';
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

  // Quick In-Page Upload State
  const [copyTitle, setCopyTitle] = useState('');
  const [copyChannel, setCopyChannel] = useState('social');
  const [copyText, setCopyText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);

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

  // Gov Core Scan Result & Hero Spotlight State
  const [scanResult, setScanResult] = useState<'green' | 'amber' | 'red' | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [spotlightPos, setSpotlightPos] = useState({ x: 390, y: 220 });


  // Listen for Supabase Auth state
  useEffect(() => {
    const client = getSupabase();
    if (client) {
      client.auth.getSession().then(({ data: { session } }) => {
        setAuthUser(session?.user ?? null);
      });
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        setAuthUser(session?.user ?? null);
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

  // Dynamic evaluation: When user submits copy, run backend checks
  const handleRunEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copyTitle.trim() || !copyText.trim()) {
      alert('Please provide both title and copy content to evaluate.');
      return;
    }

    setIsEvaluating(true);
    setScanResult(null);
    try {
      const response = await fetch(`/api/review/clients/${selectedClientId}/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: copyTitle,
          channel: copyChannel,
          text: copyText,
          author: authUser ? authUser.email : 'Agency Creator'
        })
      });

      if (!response.ok) {
        throw new Error(`Evaluation failed with status ${response.status}`);
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
            findings: data.draft.findings || []
          });
          setActiveTab('review');
          setIsEvaluating(false);
        }, 950);
      } else {
        setIsEvaluating(false);
      }
    } catch (err: any) {
      alert(`Error evaluating copy: ${err.message}`);
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


      {/* MAIN VIEWPORT */}
      <main style={{ flex: 1, padding: '1.5rem 0', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'review' && (
          <>
            {/* IF NO COPY IS UPLOADED YET: SHOW CLEAN UPLOAD & EVALUATION HUB */}
            {!currentDraft ? (
              <div
                ref={heroRef}
                onMouseMove={e => {
                  if (!heroRef.current) return;
                  const rect = heroRef.current.getBoundingClientRect();
                  setSpotlightPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  });
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
                  background: `radial-gradient(650px circle at ${spotlightPos.x}px ${spotlightPos.y}px, rgba(215, 38, 61, 0.09), rgba(255, 214, 10, 0.04) 45%, transparent 75%)`,
                  border: '1px solid var(--color-docket-border)',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)'
                }}
              >
                {/* Slow-Drifting Paper Grain Texture Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '-50px',
                    pointerEvents: 'none',
                    opacity: 0.16,
                    zIndex: 0,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
                    animation: 'paperGrainDrift 36s ease-in-out infinite alternate'
                  }}
                />

                {/* Center Moving Interactive Gov Core Orbit Graphic */}
                <div style={{ marginBottom: '1.75rem', position: 'relative', zIndex: 1 }}>
                  <GovernanceGyroscope
                    status={isEvaluating ? 'scanning' : 'active'}
                    isScanning={isEvaluating}
                    scanResult={scanResult}
                    size="min(220px, 75vw)"
                  />
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--color-highlighter)',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '0.35rem'
                  }}
                >
                  ACTIVE VAULT: {currentClient.name.toUpperCase()}
                </div>

                <h1
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.8rem',
                    color: 'var(--color-paper-light)',
                    textAlign: 'center',
                    margin: '0 0 0.5rem 0'
                  }}
                >
                  Upload or Paste Copy for Brand Governance Review
                </h1>

                <p
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--color-steel)',
                    textAlign: 'center',
                    maxWidth: '540px',
                    lineHeight: '1.5',
                    marginBottom: '1.75rem'
                  }}
                >
                  Upload your draft copy or promotional text below. Parakh will evaluate it dynamically against {currentClient.name}'s guideline clauses, prohibited terminology, and pricing fact sheets.
                </p>

                {/* Direct Upload / Evaluate Form */}
                <form
                  onSubmit={handleRunEvaluation}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--color-ink-card)',
                    border: '1px solid var(--color-docket-border)',
                    borderRadius: '8px',
                    padding: '1.75rem',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem'
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-steel)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      Campaign Title / Headline
                    </label>
                    <input
                      type="text"
                      value={copyTitle}
                      onChange={e => setCopyTitle(e.target.value)}
                      placeholder="e.g. Monsoon Health Screening Campaign"
                      required
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
                      value={copyChannel}
                      onChange={e => setCopyChannel(e.target.value)}
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
                      <button
                        type="button"
                        onClick={() => {
                          setCopyTitle('Monsoon Dengue Awareness Campaign');
                          setCopyChannel('social');
                          setCopyText('DENGUE OUTBREAK IS KILLING HUNDREDS IN YOUR CITY! BUY NOW OR REGRET MISSING OUT ON COMPLETE HEALTH IMMUNITY!!! Book our miracle cure blood test at cheap rates for only ₹199 at all certified centres.');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-highlighter)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        ⚡ Paste Sample Copy
                      </button>
                    </div>
                    <textarea
                      value={copyText}
                      onChange={e => setCopyText(e.target.value)}
                      placeholder="Paste your creative marketing copy here to evaluate against brand guidelines..."
                      rows={6}
                      required
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

                  <button
                    type="submit"
                    disabled={isEvaluating}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem', fontWeight: 700 }}
                  >
                    {isEvaluating ? '⚙️ Running Citation Gate & Brand Compliance...' : '⚡ Evaluate Copy with Parakh AI'}
                  </button>
                </form>
              </div>
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
                onNewReviewRequested={() => setCurrentDraft(null)}
                onDraftApproved={() => {
                  alert(`✓ Copy "${currentDraft.title}" officially approved with sealed compliance docket.`);
                }}
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
      </main>

      {/* FOOTER */}
      <footer
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
          gap: '1rem'
        }}
      >
        <div>
          <strong>Parakh (परख)</strong> — The Memory of Every Brand Decision.
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', fontFamily: 'var(--font-mono)' }}>
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
    </div>
  );
}
