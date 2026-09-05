import { db } from '../db.js';
import { randomUUID } from 'node:crypto';
import type { AuditResult } from '../types.js';

// In-memory subscribers for SSE (Phase 6 will use this)
type AuditListener = (entry: AuditEvent) => void;
const listeners: AuditListener[] = [];

export interface AuditEvent {
  id: string;
  agent_id: string;
  user_id: string;
  action: string;
  reason: string;
  result: AuditResult;
  error_code?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export function logAudit(
  agentId: string,
  userId: string,
  action: string,
  reason: string,
  result: AuditResult,
  errorCode?: string,
  metadata?: Record<string, unknown>,
): AuditEvent {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const metaJson = metadata ? JSON.stringify(metadata) : null;

  db.prepare(`
    INSERT INTO audit_log (id, agent_id, user_id, action, reason, result, error_code, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, agentId, userId, action, reason, result, errorCode ?? null, metaJson, createdAt);

  const entry: AuditEvent = { id, agent_id: agentId, user_id: userId, action, reason, result, error_code: errorCode, metadata, created_at: createdAt };

  // Notify SSE subscribers
  for (const fn of listeners) fn(entry);

  return entry;
}

export function onAudit(fn: AuditListener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function getRecentAudit(userId: string, limit = 20): AuditEvent[] {
  return db.prepare(`
    SELECT * FROM audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(userId, limit) as AuditEvent[];
}
