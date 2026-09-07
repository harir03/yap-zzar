import React, { useState, useEffect, useCallback } from 'react';
import {
  tokens,
  primaryBtn,
  primaryBtnDisabled,
  errorBanner,
  badgeWhatsApp,
  insetPanel,
  mutedText,
} from './theme';

export function WhatsAppPanel() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
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
        setError(
          typeof data?.error === 'string' ? data.error : 'Failed to fetch status',
        );
        setStatus(null);
      } else {
        setStatus(data);
      }
      setQrKey((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const statusLabel =
    (status?.status as string | undefined) ||
    (status?.state as string | undefined) ||
    ((status?.session as { status?: string } | undefined)?.status) ||
    (status ? 'connected / unknown' : 'unavailable');

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <span style={{ ...mutedText }}>Session status</span>
        <span style={badgeWhatsApp}>{String(statusLabel)}</span>
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
        <p style={styles.hint}>
          Scan with WhatsApp → Linked devices. QR may be blank if already linked.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void refresh()}
        disabled={loading}
        style={{
          ...primaryBtn,
          ...(loading ? primaryBtnDisabled : {}),
        }}
      >
        {loading ? 'Refreshing…' : 'Refresh QR / status'}
      </button>

      {error && (
        <div style={errorBanner}>
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 12 },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrWrap: {
    ...insetPanel,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  qr: {
    width: 180,
    height: 180,
    objectFit: 'contain',
    background: '#fff',
    borderRadius: 4,
  },
  hint: {
    margin: 0,
    fontSize: 11,
    color: tokens.muted,
    textAlign: 'center',
  },
};
