import React, { useState } from 'react';
import { tokens, secondaryBtn, mutedText } from './theme';

export function WalletView() {
  const [wallets, setWallets] = useState<
    Array<{ id: string; type: string; balance: number }>
  >([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/wallets');
      const data = await res.json();
      setWallets(Array.isArray(data) ? data : []);
    } catch {
      setWallets([]);
    }
    setLoading(false);
  }

  return (
    <div>
      <button onClick={() => void refresh()} disabled={loading} style={secondaryBtn}>
        {loading ? 'Loading…' : 'Refresh Wallets'}
      </button>
      {wallets.length === 0 ? (
        <p style={{ ...mutedText, marginTop: 8 }}>
          No wallets found. Register a merchant or buyer first.
        </p>
      ) : (
        <div style={{ marginTop: 12 }}>
          {wallets.map((w) => (
            <div key={w.id} style={styles.row}>
              <span style={{ fontSize: 13, color: tokens.muted }}>
                {w.type === 'campaign' ? '🏪' : '👤'} {w.type} wallet
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: tokens.accent,
                }}
              >
                ₹{(w.balance / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: `1px solid ${tokens.border}`,
  },
};
