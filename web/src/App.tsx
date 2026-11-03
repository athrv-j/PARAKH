export default function App() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#F4EFE6', padding: '2rem' }}>
      <header style={{ textAlign: 'center', maxWidth: '720px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-stamp-red)', fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          CASE FILE // PRK-0001
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', fontWeight: 700, marginBottom: '1rem', color: '#FAF7F2' }}>
          Parakh <span style={{ fontSize: '1.8rem', opacity: 0.8 }}>(परख)</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--color-steel)', lineHeight: 1.6, marginBottom: '2rem' }}>
          Every brand decision, remembered. An intelligent brand-governance platform for multi-client agencies.
        </p>
        <div style={{ display: 'inline-block', border: '1px dashed var(--color-steel)', padding: '0.75rem 1.5rem', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--color-highlighter)' }}>
          Status: Monorepo & Vault Core Initialized (Phases 0 & 1)
        </div>
      </header>
    </main>
  );
}
