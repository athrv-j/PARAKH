import { useState, useEffect } from 'react';
import { ReviewWorkspace, FindingUI } from './scenes/ReviewWorkspace.tsx';
import { FactRippleBoard } from './scenes/FactRippleBoard.tsx';
import { GuidelineDebuggerView } from './scenes/GuidelineDebuggerView.tsx';
import { AboutAiView } from './pages/AboutAiView.tsx';
import { GovernanceGyroscope } from './components/GovernanceGyroscope.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { QuickGuideModal } from './components/QuickGuideModal.tsx';
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
  const [activeTab, setActiveTab] = useState<'review' | 'ripple' | 'debugger' | 'about_ai'>('review');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isQuickGuideOpen, setIsQuickGuideOpen] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);

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
        setCurrentDraft({
          id: data.draft.id,
          version_id: data.draft.version_id,
          title: data.draft.title,
          channel: data.draft.channel,
          text: data.draft.text,
          findings: data.draft.findings || []
        });
        setActiveTab('review');
      }
    } catch (err: any) {
      alert(`Error evaluating copy: ${err.message}`);
    } finally {
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

  const handleClientCreated = (newClient: { id: string; name: string }) => {
    setClients(prev => [...prev, newClient]);
    setSelectedClientId(newClient.id);
    setCurrentDraft(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-ink)' }}>
      {/* CLEAN ENTERPRISE TOP HEADER */}
      <header
        style={{
          borderBottom: '1px solid var(--color-docket-border)',
          backgroundColor: 'var(--color-ink-surface)',
          padding: '0.75rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.55rem', fontWeight: 800, color: 'var(--color-paper-light)' }}>
              Parakh
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', color: 'var(--color-steel)' }}>
              (परख)
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-highlighter)', fontFamily: 'var(--font-mono)', marginLeft: '6px' }}>
              // BRAND GOVERNANCE
            </span>
          </div>

          {/* Client Vault Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-ink-card)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--color-docket-border)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-steel)', textTransform: 'uppercase' }}>Brand Vault:</span>
            <select
              value={selectedClientId}
              onChange={e => {
                setSelectedClientId(e.target.value);
                setCurrentDraft(null); // Reset draft so user uploads for this vault
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-paper-light)',
                fontWeight: 700,
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {clients.map(c => (
                <option key={c.id} value={c.id} style={{ backgroundColor: 'var(--color-ink)' }}>
                  🏢 {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className={`btn ${activeTab === 'review' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
            onClick={() => setActiveTab('review')}
          >
            📋 Review Workspace
          </button>
          <button
            className={`btn ${activeTab === 'ripple' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
            onClick={() => setActiveTab('ripple')}
          >
            🕸️ Fact Ripple Board
          </button>
          <button
            className={`btn ${activeTab === 'debugger' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
            onClick={() => setActiveTab('debugger')}
          >
            🩺 Guideline Debugger
          </button>
          <button
            className={`btn ${activeTab === 'about_ai' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
            onClick={() => setActiveTab('about_ai')}
          >
            🛡️ About AI
          </button>
        </nav>

        {/* Supabase Authentication & Upload Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn btn-outline"
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.78rem',
              borderColor: authUser ? 'var(--color-verified-green)' : 'var(--color-docket-border)',
              color: authUser ? 'var(--color-verified-green)' : 'var(--color-paper-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            onClick={() => setIsAuthModalOpen(true)}
          >
            <span>⚡</span>
            <span>{authUser ? authUser.email.split('@')[0] : 'Sign In with Supabase'}</span>
          </button>

          <button
            className="btn btn-primary"
            style={{ padding: '0.45rem 0.95rem', fontSize: '0.8rem', fontWeight: 600 }}
            onClick={() => setIsUploadModalOpen(true)}
          >
            + Ingest Guidelines (.docx/.md)
          </button>

          {/* Quick Guide Info Icon Button */}
          <button
            title="Project Quick Guide"
            onClick={() => setIsQuickGuideOpen(true)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-ink-card)',
              border: '1px solid var(--color-highlighter)',
              color: 'var(--color-highlighter)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 800,
              boxShadow: '0 0 10px rgba(255, 214, 10, 0.2)'
            }}
          >
            ⓘ
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main style={{ flex: 1, padding: '1.5rem 0', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'review' && (
          <>
            {/* IF NO COPY IS UPLOADED YET: SHOW CLEAN UPLOAD & EVALUATION HUB */}
            {!currentDraft ? (
              <div
                style={{
                  width: '100%',
                  maxWidth: '780px',
                  margin: '1.5rem auto',
                  padding: '0 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                {/* Center Moving Interactive Graphic */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <GovernanceGyroscope status="active" size={180} />
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
