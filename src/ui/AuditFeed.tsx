import React, { useState, useEffect, useRef } from 'react';
import { tokens, mutedText } from './theme';

interface AuditEntry {
  id: string;
  action: string;
  reason: string;
  result: 'approved' | 'blocked' | 'error';
  error_code?: string;
  created_at: string;
}

export function AuditFeed() {
  const [events, setEvents] = useState<AuditEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const source = new EventSource('/events');

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'connected') return;
        setEvents((prev) => [data, ...prev].slice(0, 50));
      } catch {
        /* ignore parse errors */
      }
    };

    return () => source.close();
  }, []);

  if (events.length === 0) {
    return (
      <p style={{ ...mutedText, margin: 0 }}>
        Waiting for events… trigger a scenario above
      </p>
    );
  }

  return (
    <div ref={containerRef} style={{ maxHeight: 400, overflowY: 'auto' }}>
      {events.map((e) => {
        const ok = e.result === 'approved';
        return (
          <div key={e.id} style={styles.row}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                marginTop: 5,
                flexShrink: 0,
                background: ok ? tokens.success : tokens.danger,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: ok ? tokens.success : tokens.danger,
                }}
              >
                {e.action} {e.error_code ? `(${e.error_code})` : ''}
              </div>
              <div style={{ fontSize: 12, color: tokens.muted, marginTop: 2 }}>
                {e.reason}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: tokens.muted,
                  marginTop: 2,
                  opacity: 0.8,
                }}
              >
                {new Date(e.created_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '8px 0',
    borderBottom: `1px solid ${tokens.border}`,
  },
};
