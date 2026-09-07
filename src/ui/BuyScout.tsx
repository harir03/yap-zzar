import React, { useState } from 'react';

interface ScoutSource {
  kind: string;
  title: string;
  url: string;
  snippet: string;
}

interface ScoutPick {
  rank: number;
  name: string;
  why: string;
  approxPriceInr?: string;
  matchScore: number;
  pros: string[];
  cons: string[];
  sources: ScoutSource[];
}

interface BuyScoutResult {
  query: string;
  needs: string;
  picks: ScoutPick[];
  youtube: ScoutSource[];
  disclaimer: string;
  mode: 'live' | 'demo';
}

export function BuyScout() {
  const [query, setQuery] = useState('wireless earbuds');
  const [needs, setNeeds] = useState('under 3k, good mic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuyScoutResult | null>(null);

  const runScout = async () => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/buy-scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, needs }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Scout failed');
        return;
      }
      setResult(data as BuyScoutResult);
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formGroup}>
        <label style={styles.label}>What to buy</label>
        <input
          style={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="wireless earbuds"
          disabled={loading}
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Needs / constraints</label>
        <input
          style={styles.input}
          value={needs}
          onChange={(e) => setNeeds(e.target.value)}
          placeholder="under 3k, good mic"
          disabled={loading}
        />
      </div>
      <button
        type="button"
        onClick={runScout}
        disabled={loading || !query.trim()}
        style={{
          ...styles.button,
          ...(loading || !query.trim() ? styles.buttonDisabled : {}),
        }}
      >
        {loading ? '🔍 Scouting…' : '🛒 Run buy scout'}
      </button>

      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div style={styles.results}>
          <div style={styles.metaRow}>
            <span style={styles.badge}>{result.mode === 'live' ? 'Live' : 'Demo'} mode</span>
            <span style={styles.metaText}>{result.picks.length} picks</span>
          </div>

          {result.picks.map((p) => (
            <div key={p.rank} style={styles.pick}>
              <div style={styles.pickHeader}>
                <span style={styles.rank}>#{p.rank}</span>
                <span style={styles.pickName}>{p.name}</span>
                <span style={styles.score}>{p.matchScore}/100</span>
              </div>
              <p style={styles.why}>{p.why}</p>
              {p.approxPriceInr && (
                <p style={styles.price}>💰 {p.approxPriceInr}</p>
              )}
              {p.pros.length > 0 && (
                <p style={styles.pros}>✅ {p.pros.slice(0, 3).join(' · ')}</p>
              )}
              {p.cons.length > 0 && (
                <p style={styles.cons}>⚠️ {p.cons.slice(0, 2).join(' · ')}</p>
              )}
            </div>
          ))}

          {result.youtube.length > 0 && (
            <div style={styles.ytBlock}>
              <div style={styles.ytTitle}>📺 YouTube</div>
              {result.youtube.map((y, i) => (
                <a
                  key={i}
                  href={y.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.ytLink}
                >
                  {y.title}
                </a>
              ))}
            </div>
          )}

          <p style={styles.disclaimer}>{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 12 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, color: '#a1a1aa', fontWeight: 500 },
  input: {
    width: '100%', padding: '10px 12px', background: '#09090b',
    border: '1px solid #3f3f46', borderRadius: 8, color: '#f4f4f5',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  },
  button: {
    padding: '12px 20px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    border: 'none', borderRadius: 8, color: '#ffffff', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
  },
  buttonDisabled: { opacity: 0.6, cursor: 'not-allowed', boxShadow: 'none' },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 8, padding: '10px 12px', color: '#fca5a5', fontSize: 13,
    display: 'flex', gap: 8, alignItems: 'center',
  },
  results: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 },
  metaRow: { display: 'flex', gap: 8, alignItems: 'center' },
  badge: {
    fontSize: 11, padding: '3px 8px', borderRadius: 6,
    background: '#1e3a8a', color: '#93c5fd', fontWeight: 600,
  },
  metaText: { fontSize: 12, color: '#71717a' },
  pick: { background: '#09090b', border: '1px solid #27272a', borderRadius: 8, padding: 12 },
  pickHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  rank: { fontSize: 12, fontWeight: 700, color: '#a78bfa' },
  pickName: { flex: 1, fontSize: 14, fontWeight: 600, color: '#f4f4f5' },
  score: { fontSize: 12, fontWeight: 600, color: '#34d399' },
  why: { margin: '0 0 6px', fontSize: 13, color: '#a1a1aa', lineHeight: 1.4 },
  price: { margin: '0 0 4px', fontSize: 12, color: '#d4d4d8' },
  pros: { margin: '0 0 2px', fontSize: 12, color: '#6ee7b7' },
  cons: { margin: 0, fontSize: 12, color: '#fde047' },
  ytBlock: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 },
  ytTitle: { fontSize: 13, fontWeight: 600, color: '#e4e4e7' },
  ytLink: { fontSize: 12, color: '#818cf8', textDecoration: 'none', wordBreak: 'break-all' },
  disclaimer: { margin: 0, fontSize: 11, color: '#52525b', lineHeight: 1.4 },
};
