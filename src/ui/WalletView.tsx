import React, { useState } from 'react';

export function WalletView() {
  const [wallets, setWallets] = useState<Array<{ id: string; type: string; balance: number }>>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      // ponytail: simple fetch, endpoint added below
      const res = await fetch('http://localhost:3001/wallets');
      const data = await res.json();
      setWallets(data);
    } catch { setWallets([]); }
    setLoading(false);
  }

  return (
    <div>
      <button onClick={refresh} disabled={loading} style={btnStyle}>
        {loading ? 'Loading...' : '🔄 Refresh Wallets'}
      </button>
      {wallets.length === 0 ? (
        <p style={{ color: '#52525b', fontSize: 13, marginTop: 8 }}>No wallets found. Register a merchant or buyer first.</p>
      ) : (
        <div style={{ marginTop: 12 }}>
          {wallets.map(w => (
            <div key={w.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #27272a',
            }}>
              <span style={{ fontSize: 13, color: '#a1a1aa' }}>
                {w.type === 'campaign' ? '🏪' : '👤'} {w.type} wallet
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#4ade80' }}>
                ₹{(w.balance / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: '#27272a',
  color: '#e4e4e7',
  border: '1px solid #3f3f46',
  borderRadius: 8,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
};
