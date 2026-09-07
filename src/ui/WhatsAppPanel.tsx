import React, { useState, useEffect, useCallback } from 'react';

export function WhatsAppPanel() {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrKey, setQrKey] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch status');
        setStatus(null);
      } else {
        setStatus(data);
      }
      setQrKey((k) => k + 1);
    } catch (err: any) {
      setError(err?.message || 'Network error');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const statusLabel =
    status?.status ||
    status?.state ||
    status?.session?.status ||
    (status ? 'connected / unknown' : 'unavailable');

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <span style={styles.label}>Session status</span>
        <span style={styles.statusPill}>{String(statusLabel)}</span>
      </div>

      <div style={styles.qrWrap}>
        <img
          key={qrKey}
          src={`/api/whatsapp/qr?t=${qrKey}`}
          alt="WhatsApp QR code"
          style={styles.qr}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
          onLoad={(e) => {
            (e.target as HTMLImageElement).style.display = 'block';
          }}
        />
        <p style={styles.hint}>Scan with WhatsApp → Linked devices. QR may be blank if already linked.</p>
      </div>

      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        style={{
          ...styles.button,
          ...(loading ? styles.buttonDisabled : {}),
        }}
      >
        {loading ? 'Refreshing…' : '🔄 Refresh QR / status'}
      </button>

      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 12 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, color: '#a1a1aa' },
  statusPill: {
    fontSize: 11, padding: '3px 8px', borderRadius: 6, background: '#27272a',
    color: '#a1a1aa', fontWeight: 600, maxWidth: '60%', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  qrWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    background: '#09090b', border: '1px solid #27272a', borderRadius: 8, padding: 12,
  },
  qr: { width: 180, height: 180, objectFit: 'contain', background: '#fff', borderRadius: 4 },
  hint: { margin: 0, fontSize: 11, color: '#71717a', textAlign: 'center' },
  button: {
    padding: '10px 16px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    border: 'none', borderRadius: 8, color: '#ffffff', fontSize: 13,
    fontWeight: 600, cursor: 'pointer',
  },
  buttonDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 8, padding: '10px 12px', color: '#fca5a5', fontSize: 13,
    display: 'flex', gap: 8, alignItems: 'center',
  },
};
