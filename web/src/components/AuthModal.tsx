import React, { useState, useEffect } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient';

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
  const isConfigured = isSupabaseConfigured();

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

  const handleDemoSignIn = () => {
    const demoUser = {
      id: 'demo-reviewer-01',
      email: 'lead.reviewer@agency.com',
      user_metadata: { role: 'reviewer', name: 'Lead Brand Reviewer' }
    };
    setCurrentUser(demoUser);
    if (onAuthStateChange) onAuthStateChange(demoUser);
    setSuccessMessage('✓ Logged in as Demo Lead Reviewer!');
    setTimeout(onClose, 800);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const client = getSupabase();

    if (!client) {
      setErrorMessage('Supabase Cloud is not configured on this instance. Click "Continue as Demo Reviewer" below to test authenticated workflows.');
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

              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '1.5rem' }}>
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}
              >
                {loading ? 'Authenticating...' : isSignUp ? 'Register with Supabase' : 'Sign In with Supabase'}
              </button>

              <div style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-docket-border)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--color-steel)', fontFamily: 'var(--font-mono)' }}>OR QUICK DEMO</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-docket-border)' }} />
              </div>

              <button
                type="button"
                onClick={handleDemoSignIn}
                className="btn"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(255, 214, 10, 0.1)',
                  border: '1px solid var(--color-highlighter)',
                  color: 'var(--color-highlighter)'
                }}
              >
                ⚡ Continue as Demo Reviewer (No Password Needed)
              </button>
            </form>
          )}

          {!isConfigured && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '0.85rem 1rem',
                border: '1px solid var(--color-docket-border)',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)'
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-highlighter)', marginBottom: '0.25rem', letterSpacing: '1px' }}>
                🔒 ZERO-SECRETS PRODUCTION ENVIRONMENT
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-steel)', margin: 0, lineHeight: '1.4' }}>
                Supabase credentials must be configured via environment variables (<code style={{ color: 'var(--color-paper-light)' }}>VITE_SUPABASE_URL</code> and <code style={{ color: 'var(--color-paper-light)' }}>VITE_SUPABASE_ANON_KEY</code>). Client storage of API keys is disabled for security.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
