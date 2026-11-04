import { useState, useEffect } from 'react';
import { ReviewWorkspace, FindingUI } from './scenes/ReviewWorkspace.tsx';
import { FactRippleBoard } from './scenes/FactRippleBoard.tsx';
import { GuidelineDebuggerView } from './scenes/GuidelineDebuggerView.tsx';
import { AboutAiView } from './pages/AboutAiView.tsx';
import { GovernanceGyroscope } from './components/GovernanceGyroscope.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { JudgePitchModal } from './components/JudgePitchModal.tsx';
import { getSupabase } from './lib/supabaseClient.ts';

interface ClientItem {
  id: string;
  name: string;
  industry?: string;
  tagline?: string;
}

interface DraftItem {
  id: string;
  version_id?: string;
  title: string;
  channel: string;
  text: string;
  findings: FindingUI[];
}

// Fallback seed clients metadata
const DEFAULT_CLIENTS: ClientItem[] = [
  {
    id: 'client_kavach',
    name: 'Kavach Health',
    industry: 'Preventive Healthtech & Diagnostics',
    tagline: 'Evidence-backed preventive diagnostics across India'
  },
  {
    id: 'client_vyapar',
    name: 'VyaparSetu Fintech',
    industry: 'MSME Working Capital & B2B SaaS',
    tagline: 'Transparent invoice discounting and credit rails for Indian retailers'
  },
  {
    id: 'client_mitti',
    name: 'Mitti & Moon Botanical',
    industry: 'Organic D2C Ayurvedic Skincare',
    tagline: 'Pure botanicals cold-pressed from Uttarakhand herb growers'
  }
];

export default function App() {
  const [clients, setClients] = useState<ClientItem[]>(DEFAULT_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState<string>('client_kavach');
  const [clientDrafts, setClientDrafts] = useState<DraftItem[]>([]);
  const [currentDraftIndex, setCurrentDraftIndex] = useState<number>(0);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'review' | 'ripple' | 'debugger' | 'about_ai'>('review');
  const [userRole, setUserRole] = useState<'reviewer' | 'manager' | 'creator' | 'client_viewer'>('reviewer');
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [isVaultTransitioning, setIsVaultTransitioning] = useState<boolean>(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState<boolean>(false);
  const [isSeedingShowcase, setIsSeedingShowcase] = useState<boolean>(false);
  const [authUser, setAuthUser] = useState<any>(null);

  // Check Supabase session on load
  useEffect(() => {
    const client = getSupabase();
    if (client) {
      client.auth.getSession().then(({ data: { session } }) => {
        setAuthUser(session?.user ?? null);
      });
    }
  }, []);

  // Fetch client list from API
  useEffect(() => {
    fetch('/api/clients')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.clients && data.clients.length > 0) {
          setClients(prev => {
            const merged = [...prev];
            data.clients.forEach((c: any) => {
              if (!merged.some(m => m.id === c.id)) {
                merged.push({ id: c.id, name: c.name, industry: 'Brand Vault', tagline: '' });
              }
            });
            return merged;
          });
        }
      })
      .catch(() => {
        // Fallback to default clients
      });
  }, []);

  // Dynamically fetch drafts for the selected client vault
  const loadClientDrafts = async (clientId: string) => {
    setIsLoadingDrafts(true);
    try {
      const res = await fetch(`/api/review/clients/${clientId}/drafts`);
      if (res.ok) {
        const data = await res.json();
        if (data.drafts && data.drafts.length > 0) {
          const formatted: DraftItem[] = data.drafts.map((d: any) => ({
            id: d.id,
            version_id: d.version_id,
            title: d.title,
            channel: d.channel,
            text: d.text_content || d.text || '',
            findings: d.findings || []
          }));
          setClientDrafts(formatted);
          setCurrentDraftIndex(0);
        } else {
          setClientDrafts([]);
        }
      } else {
        setClientDrafts([]);
      }
    } catch {
      setClientDrafts([]);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  useEffect(() => {
    loadClientDrafts(selectedClientId);
  }, [selectedClientId]);

  // Load Judge Evaluation Showcase
  const handleLoadJudgeShowcase = async () => {
    setIsSeedingShowcase(true);
    try {
      const res = await fetch('/api/review/seed-showcase', { method: 'POST' });
      if (res.ok) {
        setSelectedClientId('client_kavach');
        await loadClientDrafts('client_kavach');
        setActiveTab('review');
      }
    } catch (err) {
      console.error('Error seeding showcase:', err);
    } finally {
      setIsSeedingShowcase(false);
    }
  };

  const currentClient = clients.find(c => c.id === selectedClientId) || clients[0];
  const currentDraft = clientDrafts[currentDraftIndex] || null;

  const handleClientSwitch = (newId: string) => {
    if (newId === selectedClientId) return;
    setIsVaultTransitioning(true);
    setTimeout(() => {
      setSelectedClientId(newId);
      setCurrentDraftIndex(0);
      setIsVaultTransitioning(false);
    }, 300);
  };

  const handleDraftCreated = (newDraft: any) => {
    setClientDrafts(prev => [newDraft, ...prev]);
    setCurrentDraftIndex(0);
    setActiveTab('review');
  };

  const handleClientCreated = (newClient: { id: string; name: string }) => {
    setClients(prev => [...prev, { ...newClient, industry: 'Custom Vault', tagline: 'Isolated tenant partition' }]);
    setSelectedClientId(newClient.id);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-ink)' }}>
      {/* Mechanical Vault Door Shutter Transition */}
      {isVaultTransitioning && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#0A0B0D',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'vaultShutter 0.3s ease-in-out'
          }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: 'var(--color-stamp-red)', letterSpacing: '4px' }}>
            🔒 CLIENT VAULT PARTITIONING...
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-steel)', marginTop: '0.5rem' }}>
            Resetting session cache & isolating tenant boundary for {currentClient.name}
          </div>
        </div>
      )}

      {/* TOP HACKATHON JUDGE EVALUATION BAR */}
      <div
        style={{
          backgroundColor: '#1E1905',
          borderBottom: '1px solid var(--color-highlighter)',
          padding: '0.45rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.78rem',
          color: 'var(--color-paper-light)',
          zIndex: 110
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span
            style={{
              backgroundColor: 'var(--color-highlighter)',
              color: '#101114',
              padding: '2px 8px',
              borderRadius: '3px',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem'
            }}
          >
            ⚖️ JUDGE EVALUATION GUIDE
          </span>
          <span style={{ color: 'var(--color-paper-light)' }}>
            Parakh (परख) is the <strong>Memory of Every Brand Decision</strong> — enforcing Citation Gating, Brand Case Law (precedents), and Fact Ripple.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn"
            onClick={() => setIsJudgeModalOpen(true)}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--color-highlighter)',
              color: 'var(--color-highlighter)',
              padding: '0.25rem 0.65rem',
              fontSize: '0.72rem',
              fontWeight: 700
            }}
          >
            📖 System Pitch & Architecture
          </button>
          <button
            className="btn"
            onClick={handleLoadJudgeShowcase}
            disabled={isSeedingShowcase}
            style={{
              backgroundColor: 'var(--color-highlighter)',
              color: '#101114',
              border: 'none',
              padding: '0.25rem 0.75rem',
              fontSize: '0.72rem',
              fontWeight: 800
            }}
          >
            {isSeedingShowcase ? '⚙️ Loading Showcase...' : '▶ Load Live Judge Showcase'}
          </button>
        </div>
      </div>

      {/* MAIN TOP HEADER */}
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
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-stamp-red)', fontSize: '0.72rem', letterSpacing: '2px', fontWeight: 700 }}>
              PRK-GOV // CASE FILE SYSTEM
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-paper-light)' }}>
                Parakh
              </span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', color: 'var(--color-steel)' }}>
                (परख)
              </span>
            </div>
          </div>

          {/* Client Vault Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-ink-card)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--color-docket-border)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-steel)', textTransform: 'uppercase' }}>Vault:</span>
            <select
              value={selectedClientId}
              onChange={e => handleClientSwitch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-paper-light)',
                fontWeight: 700,
                fontSize: '0.88rem',
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

        {/* Action Controls: Dynamic Upload, Supabase Auth & Compact Tour */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Dynamic Ingest / Upload Button */}
          <button
            className="btn btn-outline"
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.78rem',
              borderColor: 'var(--color-highlighter)',
              color: 'var(--color-highlighter)'
            }}
            onClick={() => setIsUploadModalOpen(true)}
          >
            + Ingest Guidelines / Copy
          </button>

          {/* Supabase Auth Indicator / Button */}
          <button
            className="btn btn-outline"
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.78rem',
              borderColor: authUser ? 'var(--color-verified-green)' : 'var(--color-docket-border)',
              color: authUser ? 'var(--color-verified-green)' : 'var(--color-paper-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            onClick={() => setIsAuthModalOpen(true)}
          >
            <span>⚡</span>
            <span>{authUser ? authUser.email.split('@')[0] : 'Supabase Auth'}</span>
          </button>

          {/* User Role Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--color-steel)' }}>
            <span>Role:</span>
            <select
              value={userRole}
              onChange={e => setUserRole(e.target.value as any)}
              style={{
                backgroundColor: 'var(--color-ink-card)',
                color: 'var(--color-paper-light)',
                border: '1px solid var(--color-docket-border)',
                borderRadius: '3px',
                padding: '3px 6px',
                fontSize: '0.78rem',
                outline: 'none'
              }}
            >
              <option value="reviewer">Reviewer</option>
              <option value="manager">Manager</option>
              <option value="creator">Creator</option>
              <option value="client_viewer">Client</option>
            </select>
          </div>

          {/* Compact Demo Tour Toggle */}
          <button
            className="btn"
            style={{
              backgroundColor: tourStep !== null ? 'var(--color-highlighter)' : 'rgba(255, 214, 10, 0.15)',
              color: tourStep !== null ? '#101114' : 'var(--color-highlighter)',
              border: '1px solid var(--color-highlighter)',
              padding: '0.4rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
            onClick={() => setTourStep(tourStep === null ? 1 : null)}
          >
            {tourStep !== null ? `Tour: Step ${tourStep}/5` : '⭐ Tour'}
          </button>
        </div>
      </header>

      {/* TAB CONTEXT BANNER (Judge Contextual Guide) */}
      <div
        style={{
          backgroundColor: 'rgba(26, 28, 35, 0.65)',
          borderBottom: '1px solid var(--color-docket-border)',
          padding: '0.45rem 2rem',
          fontSize: '0.78rem',
          color: 'var(--color-steel)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div>
          {activeTab === 'review' && (
            <span>
              📋 <strong>Review Workspace:</strong> Evaluating marketing copy. Every critique quotes the exact clause (Citation Gate). Click <em>"Accept Fix"</em> to apply word diffs or <em>"Dismiss / File Precedent"</em> to record client exceptions.
            </span>
          )}
          {activeTab === 'ripple' && (
            <span>
              🕸️ <strong>Fact Ripple Board:</strong> Living commercial dependency graph. Modify a diagnostic price or promo date below to see affected marketing campaigns flag <em>"Needs Update"</em> automatically.
            </span>
          )}
          {activeTab === 'debugger' && (
            <span>
              🩺 <strong>Guideline Debugger:</strong> Diagnosing the brand handbook itself. Review clauses ranked by dispute frequency and accept clearer, AI-recommended rewrites.
            </span>
          )}
          {activeTab === 'about_ai' && (
            <span>
              🛡️ <strong>About AI & Transparency:</strong> Disclosure of Groq Llama 3.3 70B models, PII masking shield, local deterministic checks, and zero-retention governance.
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-highlighter)' }}>
          MODE: {userRole.toUpperCase()}
        </div>
      </div>

      {/* DYNAMIC DRAFT SELECTOR SUB-BAR (If drafts exist) */}
      {clientDrafts.length > 0 && activeTab === 'review' && (
        <div
          style={{
            backgroundColor: 'var(--color-ink-card)',
            borderBottom: '1px solid var(--color-docket-border)',
            padding: '0.5rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--color-steel)', textTransform: 'uppercase', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
              Active Case File:
            </span>
            <select
              value={currentDraftIndex}
              onChange={e => setCurrentDraftIndex(Number(e.target.value))}
              style={{
                backgroundColor: 'var(--color-ink)',
                color: 'var(--color-paper-light)',
                border: '1px solid var(--color-docket-border)',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '0.82rem',
                outline: 'none',
                maxWidth: '420px'
              }}
            >
              {clientDrafts.map((d, idx) => (
                <option key={d.id} value={idx}>
                  📄 {d.title} ({d.channel.toUpperCase()}) — {d.findings.length} issues
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-steel)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <span>TOTAL DRAFTS: {clientDrafts.length}</span>
            <span>FINDINGS DETECTED: {currentDraft?.findings?.length ?? 0}</span>
          </div>
        </div>
      )}

      {/* COMPACT FLOATING 5-STEP DEMO TOUR WIDGET */}
      {tourStep !== null && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 2500,
            width: '340px',
            backgroundColor: 'rgba(26, 28, 35, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1.5px solid var(--color-highlighter)',
            borderRadius: '8px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)',
            padding: '1rem',
            color: 'var(--color-paper-light)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span
              style={{
                backgroundColor: 'var(--color-highlighter)',
                color: '#101114',
                padding: '2px 8px',
                borderRadius: '3px',
                fontWeight: 800,
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)'
              }}
            >
              STEP {tourStep} OF 5
            </span>
            <button
              onClick={() => setTourStep(null)}
              style={{ background: 'none', border: 'none', color: 'var(--color-steel)', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          <div style={{ fontSize: '0.84rem', lineHeight: '1.4', marginBottom: '0.85rem' }}>
            {tourStep === 1 && (
              <>
                <strong>Citation Gate:</strong> Inspect flagged text with exact clause citation. "No source, no flag" ensures zero hallucinated compliance rules.
              </>
            )}
            {tourStep === 2 && (
              <>
                <strong>Brand Case Law:</strong> Click <em>"Dismiss / File Precedent"</em> on a finding to log a client exception with reason chips.
              </>
            )}
            {tourStep === 3 && (
              <>
                <strong>Precedent Memory:</strong> Future reviews recognize similar exceptions via 64-dim embeddings and require human confirmation.
              </>
            )}
            {tourStep === 4 && (
              <>
                <strong>Fact Ripple:</strong> Switch to <em>"Fact Ripple Board"</em> and edit a product price to see live dependency ripples across campaigns.
              </>
            )}
            {tourStep === 5 && (
              <>
                <strong>Guideline Debugger:</strong> Open <em>"Guideline Debugger"</em> to see ambiguous clauses ranked by conflict frequency and accept rewrites.
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn btn-outline"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
              disabled={tourStep <= 1}
              onClick={() => setTourStep(prev => Math.max(1, (prev || 1) - 1))}
            >
              ← Prev
            </button>

            {/* Dots */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map(step => (
                <div
                  key={step}
                  onClick={() => setTourStep(step)}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: tourStep === step ? 'var(--color-highlighter)' : 'var(--color-steel)',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>

            <button
              className="btn btn-primary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
              onClick={() => {
                if (tourStep < 5) setTourStep(prev => (prev || 1) + 1);
                else setTourStep(null);
              }}
            >
              {tourStep === 5 ? 'Done ✓' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <main style={{ flex: 1, padding: '1.5rem 0', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'review' && (
          <>
            {isLoadingDrafts ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
                <GovernanceGyroscope status="active" size={180} />
                <div style={{ marginTop: '1.5rem', fontFamily: 'var(--font-mono)', color: 'var(--color-highlighter)', fontSize: '0.9rem' }}>
                  FETCHING VAULT CASE FILES...
                </div>
              </div>
            ) : clientDrafts.length === 0 ? (
              /* DYNAMIC EMPTY STATE (When no draft is uploaded yet) */
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3rem 2rem',
                  textAlign: 'center'
                }}
              >
                {/* Center Moving Interactive Graphic */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <GovernanceGyroscope status="active" size={240} />
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-highlighter)',
                    fontSize: '0.78rem',
                    letterSpacing: '2px',
                    marginBottom: '0.5rem'
                  }}
                >
                  VAULT ISOLATION: {currentClient.name.toUpperCase()} // NO ACTIVE DRAFTS
                </div>

                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.8rem',
                    color: 'var(--color-paper-light)',
                    maxWidth: '580px',
                    margin: '0 auto 0.75rem auto'
                  }}
                >
                  Brand Vault Awaiting Knowledge & Draft Copy
                </h2>

                <p
                  style={{
                    fontSize: '0.92rem',
                    color: 'var(--color-steel)',
                    maxWidth: '540px',
                    lineHeight: '1.6',
                    margin: '0 auto 1.5rem auto'
                  }}
                >
                  Parakh operates strictly on dynamic client data. Are you evaluating as a Hackathon Judge? Click <strong>"Load Live Judge Showcase"</strong> to test immediately with real-world Indian brand campaigns, or upload your own guidelines (.docx, .md) to test custom drafts.
                </p>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 700 }}
                    onClick={handleLoadJudgeShowcase}
                    disabled={isSeedingShowcase}
                  >
                    {isSeedingShowcase ? '⚙️ Seeding...' : '▶ Load Live Judge Showcase'}
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem' }}
                    onClick={() => setIsUploadModalOpen(true)}
                  >
                    + Upload Brand Guidelines / Copy
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem', borderColor: 'var(--color-highlighter)', color: 'var(--color-highlighter)' }}
                    onClick={() => setIsJudgeModalOpen(true)}
                  >
                    📖 System Pitch & Architecture
                  </button>
                </div>
              </div>
            ) : (
              <ReviewWorkspace
                clientId={currentClient.id}
                clientName={currentClient.name}
                draftId={currentDraft.id}
                title={currentDraft.title}
                channel={currentDraft.channel}
                initialText={currentDraft.text}
                initialFindings={currentDraft.findings}
                onDraftApproved={() => {
                  alert(`✓ Draft "${currentDraft.title}" officially approved with sealed compliance docket.`);
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
          <strong>Parakh (परख)</strong> — The Memory of Every Brand Decision. Built for the Inkloom AI Hackathon.
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', fontFamily: 'var(--font-mono)' }}>
          <span>VAULT: {currentClient.name}</span>
          <span>DATABASE: {authUser ? 'SUPABASE POSTGRES' : 'SQLITE / SUPABASE READY'}</span>
          <span>CITATION GATE: ENFORCED</span>
        </div>
      </footer>

      {/* Upload & Dynamic Ingest Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        clientId={currentClient.id}
        clientName={currentClient.name}
        onDraftCreated={handleDraftCreated}
        onGuidelinesImported={() => {
          loadClientDrafts(currentClient.id);
        }}
        onClientCreated={handleClientCreated}
      />

      {/* Supabase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthStateChange={user => setAuthUser(user)}
      />

      {/* Hackathon Judge Briefing & Pitch Modal */}
      <JudgePitchModal
        isOpen={isJudgeModalOpen}
        onClose={() => setIsJudgeModalOpen(false)}
        onLoadShowcase={handleLoadJudgeShowcase}
      />
    </div>
  );
}
