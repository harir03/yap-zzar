import React, { useState } from 'react';
import {
  tokens,
  label,
  input,
  primaryBtn,
  primaryBtnDisabled,
  errorBanner,
  badgeAccent,
  insetPanel,
  mutedText,
} from './theme';

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

async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text.slice(0, 200) || `HTTP ${res.status}` };
  }
}

export function BuyScout() {
  const [query, setQuery] = useState('wireless earbuds');
  const [needs, setNeeds] = useState('under 3k, good mic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuyScoutResult | null>(null);

  const runScout = async () => {
    const q = query.trim();
    if (!q) {
      setError('Query is required');
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/buy-scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, needs: needs.trim() }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        setError(
          typeof data.error === 'string'
            ? data.error
            : `Scout failed (HTTP ${res.status})`,
        );
        return;
      }
      if (!data || !Array.isArray(data.picks)) {
        setError('Unexpected scout response');
        return;
      }
      setResult(data as unknown as BuyScoutResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || !query.trim();

  return (
    <div style={styles.container}>
      <div style={styles.formGroup}>
        <label style={label}>What to buy</label>
        <input
          style={input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="wireless earbuds"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled) void runScout();
          }}
        />
      </div>
      <div style={styles.formGroup}>
        <label style={label}>Needs / constraints</label>
        <input
          style={input}
          value={needs}
          onChange={(e) => setNeeds(e.target.value)}
          placeholder="under 3k, good mic"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled) void runScout();
          }}
        />
      </div>
      <button
        type="button"
        onClick={() => void runScout()}
        disabled={disabled}
        style={{
          ...primaryBtn,
          ...(disabled ? primaryBtnDisabled : {}),
        }}
      >
        {loading ? 'Scouting…' : 'Run buy scout'}
      </button>

      {error && (
        <div style={errorBanner}>
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div style={styles.results}>
          <div style={styles.metaRow}>
            <span style={badgeAccent}>
              {result.mode === 'live' ? 'Live' : 'Demo'} mode
            </span>
            <span style={{ ...mutedText, fontSize: 12 }}>
              {result.picks.length} picks
            </span>
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
                <p style={styles.price}>{p.approxPriceInr}</p>
              )}
              {p.pros.length > 0 && (
                <p style={styles.pros}>{p.pros.slice(0, 3).join(' \u00b7 ')}</p>
              )}
              {p.cons.length > 0 && (
                <p style={styles.cons}>{p.cons.slice(0, 2).join(' \u00b7 ')}</p>
              )}
            </div>
          ))}

          {result.youtube.length > 0 && (
            <div style={styles.ytBlock}>
              <div style={styles.ytTitle}>YouTube</div>
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
  results: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 },
  metaRow: { display: 'flex', gap: 8, alignItems: 'center' },
  pick: { ...insetPanel },
  pickHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  rank: { fontSize: 12, fontWeight: 700, color: tokens.accentDim },
  pickName: { flex: 1, fontSize: 14, fontWeight: 600, color: tokens.text },
  score: { fontSize: 12, fontWeight: 600, color: tokens.accent },
  why: {
    margin: '0 0 6px',
    fontSize: 13,
    color: tokens.muted,
    lineHeight: 1.4,
  },
  price: { margin: '0 0 4px', fontSize: 12, color: tokens.text },
  pros: { margin: '0 0 2px', fontSize: 12, color: tokens.accentDim },
  cons: { margin: 0, fontSize: 12, color: tokens.warn },
  ytBlock: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 },
  ytTitle: { fontSize: 13, fontWeight: 600, color: tokens.text },
  ytLink: {
    fontSize: 12,
    color: tokens.accentDim,
    textDecoration: 'none',
    wordBreak: 'break-all',
  },
  disclaimer: {
    margin: 0,
    fontSize: 11,
    color: tokens.muted,
    lineHeight: 1.4,
    opacity: 0.85,
  },
};
