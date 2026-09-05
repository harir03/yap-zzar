import React, { useState, useEffect, useRef } from 'react';

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
    const source = new EventSource('http://localhost:3001/events');

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'connected') return;
        setEvents(prev => [data, ...prev].slice(0, 50));
      } catch { /* ignore parse errors */ }
    };

    return () => source.close();
  }, []);

  if (events.length === 0) {
    return <p style={{ color: '#52525b', fontSize: 13 }}>Waiting for events... trigger a scenario above ☝️</p>;
  }

  return (
    <div ref={containerRef} style={{ maxHeight: 400, overflowY: 'auto' }}>
      {events.map(e => (
        <div key={e.id} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '8px 0',
          borderBottom: '1px solid #27272a',
          animation: 'fadeIn 0.3s ease-in',
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>
            {e.result === 'approved' ? '🟢' : '🔴'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: e.result === 'approved' ? '#4ade80' : '#f87171' }}>
              {e.action} {e.error_code ? `(${e.error_code})` : ''}
            </div>
            <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>{e.reason}</div>
            <div style={{ fontSize: 11, color: '#52525b', marginTop: 2 }}>{new Date(e.created_at).toLocaleTimeString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
