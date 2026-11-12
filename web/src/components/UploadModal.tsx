import React, { useState } from 'react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onDraftCreated: (newDraft: any) => void;
  onGuidelinesImported: (result: any) => void;
  onClientCreated: (client: { id: string; name: string }) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  onDraftCreated,
  onGuidelinesImported,
  onClientCreated
}) => {
  const [activeTab, setActiveTab] = useState<'draft' | 'guideline' | 'client'>('draft');

  // Draft form state
  const [draftTitle, setDraftTitle] = useState('');
  const [draftChannel, setDraftChannel] = useState('social');
  const [draftText, setDraftText] = useState('');
  const [draftAuthor, setDraftAuthor] = useState('Creator');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guideline form state
  const [guidelineText, setGuidelineText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // New Client Vault state
  const [newClientName, setNewClientName] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!draftTitle.trim() || !draftText.trim()) {
      setModalError('Please enter both title and draft copy.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('parakh_auth_token') || 'test-token:creator:client_kavach,client_vyapar,client_mitti:evaluator:eval@agency.com';
      const response = await fetch(`/api/review/clients/${clientId}/drafts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: draftTitle,
          channel: draftChannel,
          text: draftText,
          author: draftAuthor
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to submit draft: ${response.statusText}`);
      }

      const data = await response.json();
      onDraftCreated(data.draft);
      setDraftTitle('');
      setDraftText('');
      onClose();
    } catch (err: any) {
      setModalError(err.message || 'Error submitting draft for evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuidelineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('parakh_auth_token') || 'test-token:manager:client_kavach,client_vyapar,client_mitti:evaluator:eval@agency.com';
      let response: Response;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        response = await fetch(`/api/clients/${clientId}/knowledge`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      } else {
        if (!guidelineText.trim()) {
          setModalError('Please upload a guideline file (.docx/.md) or paste guideline text.');
          setIsSubmitting(false);
          return;
        }
        response = await fetch(`/api/clients/${clientId}/knowledge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ text: guidelineText })
        });
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to import guidelines: ${response.statusText}`);
      }

      const data = await response.json();
      setModalSuccess(`✓ Successfully imported ${data.imported.clausesCount} clauses, ${data.imported.termsCount} terms, and ${data.imported.factsCount} facts!`);
      onGuidelinesImported(data.imported);
      setGuidelineText('');
      setSelectedFile(null);
      setTimeout(onClose, 1200);
    } catch (err: any) {
      setModalError(err.message || 'Error importing guidelines');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newClientName.trim()) return;

    const id = `client_${newClientName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    try {
      const token = localStorage.getItem('parakh_auth_token') || 'test-token:manager:client_kavach,client_vyapar,client_mitti:evaluator:eval@agency.com';
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, name: newClientName })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to create client vault: ${response.statusText}`);
      }

      onClientCreated({ id, name: newClientName });
      setNewClientName('');
      onClose();
    } catch (err: any) {
      setModalError(err.message || 'Error creating client vault');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 11, 14, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="paper-sheet"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem 2.5rem',
          color: 'var(--color-ink)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <span className="docket-label" style={{ color: '#6A6F7B' }}>
              VAULT INGESTION PORTAL // {clientName}
            </span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', marginTop: '0.25rem' }}>
              Upload & Dynamic Docketing
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-steel)',
              fontSize: '1.8rem',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {modalError && (
          <div
            style={{
              backgroundColor: 'rgba(215, 38, 61, 0.12)',
              border: '1px solid var(--color-stamp-red)',
              color: 'var(--color-stamp-red)',
              padding: '0.65rem 1rem',
              borderRadius: '4px',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>⚠️ {modalError}</span>
            <button
              onClick={() => setModalError(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              ×
            </button>
          </div>
        )}

        {modalSuccess && (
          <div
            style={{
              backgroundColor: 'rgba(47, 191, 113, 0.12)',
              border: '1px solid var(--color-verified-green)',
              color: 'var(--color-verified-green)',
              padding: '0.65rem 1rem',
              borderRadius: '4px',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}
          >
            {modalSuccess}
          </div>
        )}

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #d8d2c6', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'draft' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, padding: '0.5rem', color: activeTab === 'draft' ? '#FFF' : '#333' }}
            onClick={() => setActiveTab('draft')}
          >
            📝 Submit Draft for Review
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'guideline' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, padding: '0.5rem', color: activeTab === 'guideline' ? '#FFF' : '#333' }}
            onClick={() => setActiveTab('guideline')}
          >
            📜 Upload Guidelines (.docx / .md)
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'client' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, padding: '0.5rem', color: activeTab === 'client' ? '#FFF' : '#333' }}
            onClick={() => setActiveTab('client')}
          >
            🏢 New Brand Vault
          </button>
        </div>

        {/* TAB 1: SUBMIT DRAFT FOR REAL-TIME COMPLIANCE REVIEW */}
        {activeTab === 'draft' && (
          <form onSubmit={handleDraftSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Draft Title / Campaign Headline
              </label>
              <input
                type="text"
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                placeholder="e.g. Diwali Flash Sale Announcement"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #c8c2b6',
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-sans)',
                  backgroundColor: '#FFF'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Channel
                </label>
                <select
                  value={draftChannel}
                  onChange={e => setDraftChannel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #c8c2b6',
                    fontSize: '0.9rem',
                    backgroundColor: '#FFF'
                  }}
                >
                  <option value="social">Social Media (Instagram / X / LinkedIn)</option>
                  <option value="email">Email Newsletter / Blast</option>
                  <option value="press_release">Press Release / PR</option>
                  <option value="web">Website Landing Page</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Author / Submitter
                </label>
                <input
                  type="text"
                  value={draftAuthor}
                  onChange={e => setDraftAuthor(e.target.value)}
                  placeholder="e.g. Agency Copywriter"
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #c8c2b6',
                    fontSize: '0.9rem',
                    backgroundColor: '#FFF'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Marketing Copy / Draft Content
              </label>
              <textarea
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                placeholder="Paste or type your creative draft content here to be evaluated against brand clauses, facts, and past precedents..."
                rows={6}
                required
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #c8c2b6',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  fontFamily: 'var(--font-sans)',
                  backgroundColor: '#FFF'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setDraftTitle('Monsoon Dengue Protection Campaign');
                    setDraftChannel('social');
                    setDraftText('DENGUE OUTBREAK IS KILLING HUNDREDS IN YOUR CITY! BUY NOW OR REGRET MISSING OUT ON COMPLETE HEALTH IMMUNITY!!! Book our miracle cure blood test at cheap rates for only ₹199 at all certified centres.');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-stamp-red)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  ⚡ Insert Sample Copy with Test Violations
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.9rem' }}
            >
              {isSubmitting ? '⚙️ Running Compliance Pipeline...' : '⚡ Submit & Run Real-Time Compliance Review'}
            </button>
          </form>
        )}

        {/* TAB 2: UPLOAD GUIDELINES */}
        {activeTab === 'guideline' && (
          <form onSubmit={handleGuidelineSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                border: '2px dashed #b8b2a6',
                borderRadius: 'var(--radius-md)',
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.5)'
              }}
            >
              <input
                type="file"
                accept=".docx,.pdf,.md,.txt"
                id="guidelineFileInput"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
              <label htmlFor="guidelineFileInput" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '2.5rem' }}>📄</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-stamp-red)' }}>
                  {selectedFile ? selectedFile.name : 'Click to Browse Brand Guidelines (.docx, .md, .txt)'}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  Automatically segments numbered clauses, banned terms, and facts.
                </span>
              </label>
            </div>

            <div style={{ textAlign: 'center', fontWeight: 700, color: '#888', fontSize: '0.8rem' }}>
              — OR PASTE GUIDELINE TEXT BELOW —
            </div>

            <textarea
              value={guidelineText}
              onChange={e => setGuidelineText(e.target.value)}
              placeholder="e.g.&#10;1.1 Always maintain an empathetic and calm tone.&#10;Banned: miracle cure -> scientifically studied&#10;Fact: Basic Health Checkup Price = ₹499"
              rows={5}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #c8c2b6',
                fontSize: '0.88rem',
                fontFamily: 'var(--font-mono)',
                backgroundColor: '#FFF'
              }}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem' }}
            >
              {isSubmitting ? '⚙️ Parsing & Ingesting Clauses...' : '📁 Ingest Guidelines into Client Vault'}
            </button>
          </form>
        )}

        {/* TAB 3: CREATE NEW BRAND VAULT */}
        {activeTab === 'client' && (
          <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Client Brand Name
              </label>
              <input
                type="text"
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                placeholder="e.g. Tata Neu or Swiggy Instamart"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #c8c2b6',
                  fontSize: '0.95rem',
                  backgroundColor: '#FFF'
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
              🔒 Create Partitioned Brand Vault
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
