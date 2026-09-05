import { db } from '../db.js';
import { randomUUID } from 'node:crypto';

// Lock an amount from a wallet for N minutes. If not released, it auto-expires.
export function acquireLease(walletId: string, amountPaise: number, ttlMinutes = 5): string | null {
  const wallet = db.prepare('SELECT balance FROM wallets WHERE id = ?').get(walletId) as { balance: number } | undefined;
  if (!wallet || wallet.balance < amountPaise) return null;

  // Clean expired leases first
  db.prepare(`UPDATE leases SET released = 1 WHERE expires_at < datetime('now') AND released = 0`).run();

  // Check available balance (balance minus active leases)
  const activeLocked = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as locked
    FROM leases WHERE wallet_id = ? AND released = 0 AND expires_at > datetime('now')
  `).get(walletId) as { locked: number };

  const available = wallet.balance - activeLocked.locked;
  if (available < amountPaise) return null;

  const id = randomUUID();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO leases (id, wallet_id, amount, expires_at) VALUES (?, ?, ?, ?)`).run(id, walletId, amountPaise, expiresAt);

  return id;
}

export function releaseLease(leaseId: string): void {
  db.prepare('UPDATE leases SET released = 1 WHERE id = ?').run(leaseId);
}
