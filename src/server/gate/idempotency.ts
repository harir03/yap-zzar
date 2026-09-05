import { db } from '../db.js';
import { createHash } from 'node:crypto';

export function checkIdempotency(key: string): string | null {
  const hash = createHash('sha256').update(key).digest('hex');
  const row = db.prepare('SELECT response FROM idempotency_keys WHERE key_hash = ?').get(hash) as { response: string } | undefined;
  return row?.response ?? null;
}

export function saveIdempotency(key: string, response: string): void {
  const hash = createHash('sha256').update(key).digest('hex');
  db.prepare('INSERT OR IGNORE INTO idempotency_keys (key_hash, response) VALUES (?, ?)').run(hash, response);
}
