import { useState } from 'react';
import { ReviewWorkspace, FindingUI } from './scenes/ReviewWorkspace.tsx';
import { FactRippleBoard } from './scenes/FactRippleBoard.tsx';
import { GuidelineDebuggerView } from './scenes/GuidelineDebuggerView.tsx';
import { AboutAiView } from './pages/AboutAiView.tsx';

// 3 Indian Client Brands from Seed Data
interface ClientConfig {
  id: string;
  name: string;
  industry: string;
  tagline: string;
  demoDrafts: Array<{
    id: string;
    title: string;
    channel: string;
    text: string;
    findings: FindingUI[];
  }>;
}

const CLIENT_VAULTS: ClientConfig[] = [
  {
    id: 'client_kavach',
    name: 'Kavach Health',
    industry: 'Preventive Healthtech & Diagnostics',
    tagline: 'Evidence-backed preventive diagnostics across India',
    demoDrafts: [
      {
        id: 'draft_kav_01',
        title: 'Monsoon Dengue Awareness Campaign',
        channel: 'social',
        text: 'DENGUE OUTBREAK IS KILLING HUNDREDS IN YOUR CITY! BUY NOW OR REGRET MISSING OUT ON COMPLETE HEALTH IMMUNITY!!! Book our miracle cure blood test at cheap tests rates for only ₹199 at all certified centres.',
        findings: [
          {
            id: 'f_kav_01',
            type: 'tone',
            severity: 'critical',
            span_start: 0,
            span_end: 49,
            span_text: 'DENGUE OUTBREAK IS KILLING HUNDREDS IN YOUR CITY!',
            source_type: 'ai',
            source_id: 'C-1.1',
            source_text: 'Never use fear-mongering or alarmist headlines.',
            model_name: 'groq/llama-3.3-70b-versatile',
            explanation: 'Headline employs catastrophic life-threatening fear-mongering that violates brand calm guidelines.',
            suggested_fix: 'Stay protected against seasonal dengue risks with early diagnostic screening.',
            word_diff: [
              { value: 'DENGUE OUTBREAK IS KILLING HUNDREDS IN YOUR CITY!', removed: true },
              { value: 'Stay protected against seasonal dengue risks with early diagnostic screening.', added: true }
            ],
            status: 'pending'
          },
          {
            id: 'f_kav_02',
            type: 'tone',
            severity: 'high',
            span_start: 50,
            span_end: 111,
            span_text: 'BUY NOW OR REGRET MISSING OUT ON COMPLETE HEALTH IMMUNITY!!!',
            source_type: 'rule',
            source_id: 'C-1.2',
            source_text: "Avoid aggressive sales hyperbole such as 'BUY NOW OR REGRET' or excessive exclamation marks.",
            model_name: 'rule_engine',
            explanation: 'Aggressive sales FOMO and triple exclamation marks violate tone clause C-1.2.',
            suggested_fix: 'Schedule your comprehensive preventive checkup today.',
            word_diff: [
              { value: 'BUY NOW OR REGRET MISSING OUT ON COMPLETE HEALTH IMMUNITY!!!', removed: true },
              { value: 'Schedule your comprehensive preventive checkup today.', added: true }
            ],
            status: 'pending'
          },
          {
            id: 'f_kav_03',
            type: 'terminology',
            severity: 'high',
            span_start: 121,
            span_end: 133,
            span_text: 'miracle cure',
            source_type: 'rule',
            source_id: 'T-KAV-01',
            source_text: 'miracle cure',
            model_name: 'rule_engine',
            explanation: 'Banned term used. Brand guidelines strictly prohibit unsubstantiated clinical claims.',
            suggested_fix: 'scientifically studied care',
            word_diff: [
              { value: 'miracle cure', removed: true },
              { value: 'scientifically studied care', added: true }
            ],
            status: 'pending'
          },
          {
            id: 'f_kav_04',
            type: 'fact_mismatch',
            severity: 'critical',
            span_start: 184,
            span_end: 188,
            span_text: '₹199',
            source_type: 'rule',
            source_id: 'F-KAV-01',
            source_text: 'Basic Health Checkup Price = ₹499',
            model_name: 'rule_engine',
            explanation: "Fact mismatch: Basic full body checkup package is ₹499 in approved fact sheet, not ₹199.",
            suggested_fix: '₹499',
            word_diff: [
              { value: '₹199', removed: true },
              { value: '₹499', added: true }
            ],
            status: 'pending'
          }
        ]
      },
      {
        id: 'draft_kav_02',
        title: 'Festive Season Wellness Newsletter',
        channel: 'email',
        text: 'Celebrate Diwali with Kavach Health! Our Basic Health Checkup Price starts at ₹499 with 24 hours teleconsultation across India.',
        findings: []
      }
    ]
  },
  {
    id: 'client_vyapar',
    name: 'VyaparSetu Fintech',
    industry: 'MSME Working Capital & B2B SaaS',
    tagline: 'Transparent invoice discounting and credit rails for Indian retailers',
    demoDrafts: [
      {
        id: 'draft_vya_01',
        title: 'Diwali Merchant Credit Scheme',
        channel: 'social',
        text: 'Get instant cash no kyc required in your account today! 100% guaranteed approval with cheap pos terminal for your retail store.',
        findings: [
          {
            id: 'f_vya_01',
            type: 'terminology',
            severity: 'high',
            span_start: 4,
            span_end: 26,
            span_text: 'instant cash no kyc',
            source_type: 'rule',
            source_id: 'T-VYA-01',
            source_text: 'instant cash no kyc',
            model_name: 'rule_engine',
            explanation: 'Banned terminology. Regulatory standards require verified digital KYC.',
            suggested_fix: 'streamlined digital KYC verification',
            word_diff: [
              { value: 'instant cash no kyc', removed: true },
              { value: 'streamlined digital KYC verification', added: true }
            ],
            status: 'pending'
          },
          {
            id: 'f_vya_02',
            type: 'claims',
            severity: 'critical',
            span_start: 56,
            span_end: 80,
            span_text: '100% guaranteed approval',
            source_type: 'rule',
            source_id: 'C-2.1',
            source_text: 'Absolute outcome claims are forbidden by RBI lending guidelines.',
            model_name: 'rule_engine',
            explanation: 'Absolute loan approval guarantee violates fintech compliance rules.',
            suggested_fix: 'transparent, paperless eligibility check',
            word_diff: [
              { value: '100% guaranteed approval', removed: true },
              { value: 'transparent, paperless eligibility check', added: true }
            ],
            status: 'pending'
          }
        ]
      }
    ]
  },
  {
    id: 'client_mitti',
    name: 'Mitti & Moon Botanical',
    industry: 'Organic D2C Ayurvedic Skincare',
    tagline: 'Pure botanicals cold-pressed from Uttarakhand herb growers',
    demoDrafts: [
      {
        id: 'draft_mit_01',
        title: 'Saffron Night Elixir Launch',
        channel: 'social',
        text: 'Our 100% chemical-free serum guarantees instant whitening and fair skin in 3 days! Priced at ₹1,200 available until Christmas 2026.',
        findings: [
          {
            id: 'f_mit_01',
            type: 'terminology',
            severity: 'high',
            span_start: 9,
            span_end: 22,
            span_text: 'chemical-free',
            source_type: 'rule',
            source_id: 'T-MIT-01',
            source_text: 'chemical-free',
            model_name: 'rule_engine',
            explanation: 'Banned term. All physical matter consists of chemicals; use botanical extracts.',
            suggested_fix: 'cold-pressed botanical extracts',
            word_diff: [
              { value: 'chemical-free', removed: true },
              { value: 'cold-pressed botanical extracts', added: true }
            ],
            status: 'pending'
          },
          {
            id: 'f_mit_02',
            type: 'terminology',
            severity: 'critical',
            span_start: 40,
            span_end: 57,
            span_text: 'instant whitening',
            source_type: 'rule',
            source_id: 'T-MIT-03',
            source_text: 'instant whitening',
            model_name: 'rule_engine',
            explanation: 'Banned clinical hyperbole. Brand guidelines require honest, non-discriminatory beauty standards.',
            suggested_fix: 'natural brightening glow',
            word_diff: [
              { value: 'instant whitening', removed: true },
              { value: 'natural brightening glow', added: true }
            ],
            status: 'pending'
          }
        ]
      }
    ]
  }
];

export default function App() {
  const [selectedClientIndex, setSelectedClientIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'review' | 'ripple' | 'debugger' | 'about_ai'>('review');
  const [currentDraftIndex, setCurrentDraftIndex] = useState(0);
  const [userRole, setUserRole] = useState<'reviewer' | 'manager' | 'creator' | 'client_viewer'>('reviewer');
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [isVaultTransitioning, setIsVaultTransitioning] = useState(false);

  const currentClient = CLIENT_VAULTS[selectedClientIndex];
  const currentDraft = currentClient.demoDrafts[currentDraftIndex] || currentClient.demoDrafts[0];

  const handleClientSwitch = (newIndex: number) => {
    if (newIndex === selectedClientIndex) return;
    setIsVaultTransitioning(true);
    setTimeout(() => {
      setSelectedClientIndex(newIndex);
      setCurrentDraftIndex(0);
      setIsVaultTransitioning(false);
    }, 300);
  };

  const startDemoTour = () => {
    setTourStep(1);
    setActiveTab('review');
    setSelectedClientIndex(0);
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
            Resetting session cache & isolating tenant boundary
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header
        style={{
          borderBottom: '1px solid var(--color-docket-border)',
          backgroundColor: 'var(--color-ink-surface)',
          padding: '0.75rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
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
              value={selectedClientIndex}
              onChange={e => handleClientSwitch(Number(e.target.value))}
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
              {CLIENT_VAULTS.map((c, i) => (
                <option key={c.id} value={i} style={{ backgroundColor: 'var(--color-ink)' }}>
                  🏢 {c.name} ({c.industry.split('&')[0]})
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

        {/* User Role Selector & 5-Step Demo Tour Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--color-steel)' }}>
            <span>Role:</span>
            <select
              value={userRole}
              onChange={e => setUserRole(e.target.value as any)}
              style={{
                backgroundColor: 'var(--color-ink-card)',
                color: 'var(--color-paper-light)',
                border: '1px solid var(--color-docket-border)',
                borderRadius: '3px',
                padding: '3px 8px',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="reviewer">Reviewer (Sign-off)</option>
              <option value="manager">Manager</option>
              <option value="creator">Creator</option>
              <option value="client_viewer">Client Viewer (Read)</option>
            </select>
          </div>

          <button
            className="btn"
            style={{
              backgroundColor: 'var(--color-highlighter)',
              color: '#101114',
              padding: '0.45rem 0.85rem',
              fontSize: '0.78rem',
              fontWeight: 700
            }}
            onClick={startDemoTour}
          >
            ⭐ 5-Step Demo Tour
          </button>
        </div>
      </header>

      {/* DEMO TOUR PROMPT BANNER */}
      {tourStep !== null && (
        <div
          style={{
            backgroundColor: '#1E1905',
            borderBottom: '2px solid var(--color-highlighter)',
            padding: '0.75rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'var(--color-paper-light)',
            fontSize: '0.88rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ backgroundColor: 'var(--color-highlighter)', color: '#101114', padding: '2px 8px', borderRadius: '3px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              DEMO STEP {tourStep}/5
            </span>
            <span>
              {tourStep === 1 && 'Step 1 (Review Workspace): Inspect findings caught by Citation Gate ("No source, no flag"). Notice quoted clause text.'}
              {tourStep === 2 && 'Step 2 (Brand Case Law): Click "Dismiss / File Precedent" on a finding to save a verbal client exception with reason chips.'}
              {tourStep === 3 && 'Step 3 (Precedent Memory): Future reviews will now display "Precedent Applies" requiring human confirmation.'}
              {tourStep === 4 && 'Step 4 (Fact Ripple): Switch to "Fact Ripple Board" and modify a price or date to see red strings ripple outward.'}
              {tourStep === 5 && 'Step 5 (Guideline Debugger): Open "Guideline Debugger" to view ranked ambiguous clauses and accept an AI rewrite.'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-outline"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
              onClick={() => setTourStep(prev => (prev! < 5 ? prev! + 1 : 1))}
            >
              Next Step →
            </button>
            <button
              style={{ background: 'none', border: 'none', color: 'var(--color-steel)', cursor: 'pointer', fontSize: '1.1rem' }}
              onClick={() => setTourStep(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <main style={{ flex: 1, padding: '1.5rem 0' }}>
        {activeTab === 'review' && (
          <ReviewWorkspace
            clientId={currentClient.id}
            clientName={currentClient.name}
            draftId={currentDraft.id}
            title={currentDraft.title}
            channel={currentDraft.channel}
            initialText={currentDraft.text}
            initialFindings={currentDraft.findings}
          />
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
          <span>VAULT ISOLATION: ACTIVE</span>
          <span>CITATION GATE: ENFORCED</span>
          <span>LOCAL EMBEDDINGS: 64-DIM</span>
        </div>
      </footer>
    </div>
  );
}
