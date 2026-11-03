import React, { useState, useEffect } from 'react';
import { getSupabase, configureSupabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthStateChange?: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthStateChange }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Supabase connection settings
  const [showConfig, setShowConfig] = useState(!isSupabaseConfigured());
  const [supabaseUrl, setSupabaseUrl] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('parakh_supabase_url') || '' : ''
  );
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('parakh_supabase_key') || '' : ''
  );

  useEffect(() => {
    const client = getSupabase();
    if (client) {
      client.auth.getSession().then(({ data: { session } }) => {
        setCurrentUser(session?.user ?? null);
        if (onAuthStateChange) onAuthStateChange(session?.user ?? null);
      });

      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user ?? null);
        if (onAuthStateChange) onAuthStateChange(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setErrorMessage('Please provide both Supabase Project URL and Anon API Key.');
      return;
    }
    const client = configureSupabase(supabaseUrl.trim(), supabaseAnonKey.trim());
    if (client) {
      setSuccessMessage('✓ Supabase connection successfully configured!');
      setShowConfig(false);
      setErrorMessage('');
    } else {
      setErrorMessage('Failed to connect to Supabase with provided credentials.');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const client = getSupabase();

    if (!client) {
      setErrorMessage('Supabase is not configured yet. Please enter your project keys below.');
      setShowConfig(true);
      return;
    }

    if (!email || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await client.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        setSuccessMessage('✓ Registration submitted! Please check your email or sign in.');
        if (data.user) {
          setCurrentUser(data.user);
          if (onAuthStateChange) onAuthStateChange(data.user);
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        setSuccessMessage('✓ Signed in successfully!');
        setCurrentUser(data.user);
        if (onAuthStateChange) onAuthStateChange(data.user);
        setTimeout(onClose, 800);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const client = getSupabase();
    if (client) {
      await client.auth.signOut();
    }
    setCurrentUser(null);
    if (onAuthStateChange) onAuthStateChange(null);
    setSuccessMessage('Signed out.');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 11, 14, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--color-ink-surface)',
          border: '1px solid var(--color-docket-border)',
          borderRadius: '8px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-docket-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--color-ink-card)'
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-highlighter)', letterSpacing: '1px' }}>
              ⚡ SUPABASE AUTH & CLOUD VAULT
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-paper-light)', margin: '0.2rem 0 0 0' }}>
              {currentUser ? 'User Session Active' : isSignUp ? 'Create Parakh Account' : 'Sign In to Brand Vault'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-steel)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {errorMessage && (
            <div
              style={{
                backgroundColor: 'rgba(215, 38, 61, 0.15)',
                border: '1px solid var(--color-stamp-red)',
                color: 'var(--color-stamp-red)',
                padding: '0.65rem 1rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              style={{
                backgroundColor: 'rgba(47, 191, 113, 0.15)',
                border: '1px solid var(--color-verified-green)',
                color: 'var(--color-verified-green)',
                padding: '0.65rem 1rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}
            >
              {successMessage}
            </div>
          )}

          {currentUser ? (
            <div>
              <div style={{ backgroundColor: 'var(--color-ink-card)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--color-docket-border)', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-steel)', textTransform: 'uppercase' }}>Authenticated As:</div>
                <div style={{ fontSize: '1.1rem', color: 'var(--color-paper-light)', fontWeight: 600, marginTop: '0.25rem' }}>
                  {currentUser.email}
                </div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-verified-green)', marginTop: '0.5rem' }}>
                  ID: {currentUser.id}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowConfig(!showConfig)}
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                >
                  ⚙️ {showConfig ? 'Hide Supabase Keys' : 'Connection Keys'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleSignOut}
                  style={{ backgroundColor: 'var(--color-stamp-red)', color: '#fff', fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-steel)', marginBottom: '0.4rem' }}>
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="reviewer@agency.com"
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

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-steel)', marginBottom: '0.4rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-highlighter)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    textDecoration: 'underline'
                  }}
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Need an account? Register"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-steel)',
                    cursor: 'pointer',
                    fontSize: '0.82rem'
                  }}
                >
                  ⚙️ {showConfig ? 'Hide Setup' : 'Supabase Setup'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}
              >
                {loading ? 'Authenticating...' : isSignUp ? 'Register with Supabase' : 'Sign In with Supabase'}
              </button>
            </form>
          )}

          {/* Collapsible Supabase Keys Configuration Form */}
          {showConfig && (
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px dashed var(--color-docket-border)'
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-steel)', marginBottom: '0.5rem', letterSpacing: '1px' }}>
                SUPABASE INSTANCE SETTINGS
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-steel)', marginBottom: '1rem', lineHeight: '1.4' }}>
                Connect your hosted Supabase PostgreSQL project. Enter your project URL and public Anon key below:
              </p>

              <form onSubmit={handleSaveConfig}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-steel)', marginBottom: '0.3rem' }}>
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={supabaseUrl}
                    onChange={e => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyzproject.supabase.co"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--color-ink)',
                      border: '1px solid var(--color-docket-border)',
                      borderRadius: '4px',
                      padding: '0.5rem 0.75rem',
                      color: 'var(--color-paper-light)',
                      fontSize: '0.82rem',
                      fontFamily: 'var(--font-mono)',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-steel)', marginBottom: '0.3rem' }}>
                    Supabase Anon API Key
                  </label>
                  <input
                    type="password"
                    value={supabaseAnonKey}
                    onChange={e => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--color-ink)',
                      border: '1px solid var(--color-docket-border)',
                      borderRadius: '4px',
                      padding: '0.5rem 0.75rem',
                      color: 'var(--color-paper-light)',
                      fontSize: '0.82rem',
                      fontFamily: 'var(--font-mono)',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-outline"
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.82rem' }}
                >
                  Save Supabase Settings
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
