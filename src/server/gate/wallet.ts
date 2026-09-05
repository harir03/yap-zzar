import { db } from '../db.js';
import { randomUUID } from 'node:crypto';
import type { Wallet, WalletType } from '../types.js';

export function createWallet(userId: string, type: WalletType): Wallet {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO wallets (id, user_id, type, balance) VALUES (?, ?, ?, 0)
  `).run(id, userId, type);
  return getWallet(id)!;
}

export function getWallet(id: string): Wallet | undefined {
  return db.prepare('SELECT * FROM wallets WHERE id = ?').get(id) as Wallet | undefined;
}

export function getWalletByUser(userId: string, type: WalletType): Wallet | undefined {
  return db.prepare('SELECT * FROM wallets WHERE user_id = ? AND type = ?').get(userId, type) as Wallet | undefined;
}

export function loadWallet(walletId: string, amountPaise: number, description: string, referenceId?: string): void {
  const txn = db.transaction(() => {
    db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(amountPaise, walletId);
    db.prepare(`
      INSERT INTO transactions (id, wallet_id, kind, amount, description, reference_id)
      VALUES (?, ?, 'load', ?, ?, ?)
    `).run(randomUUID(), walletId, amountPaise, description, referenceId ?? null);
  });
  txn();
}

export function debitWallet(walletId: string, amountPaise: number, description: string, referenceId?: string): boolean {
  const wallet = getWallet(walletId);
  if (!wallet || wallet.balance < amountPaise) return false;

  const txn = db.transaction(() => {
    db.prepare('UPDATE wallets SET balance = balance - ? WHERE id = ?').run(amountPaise, walletId);
    db.prepare(`
      INSERT INTO transactions (id, wallet_id, kind, amount, description, reference_id)
      VALUES (?, ?, 'debit', ?, ?, ?)
    `).run(randomUUID(), walletId, amountPaise, description, referenceId ?? null);
  });
  txn();
  return true;
}

export function creditWallet(walletId: string, amountPaise: number, description: string): void {
  const txn = db.transaction(() => {
    db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(amountPaise, walletId);
    db.prepare(`
      INSERT INTO transactions (id, wallet_id, kind, amount, description, reference_id)
      VALUES (?, ?, 'credit', ?, ?, ?)
    `).run(randomUUID(), walletId, amountPaise, description, null);
  });
  txn();
}

export function withdrawWallet(walletId: string, amountPaise: number): boolean {
  const wallet = getWallet(walletId);
  if (!wallet || wallet.balance < amountPaise) return false;

  const txn = db.transaction(() => {
    db.prepare('UPDATE wallets SET balance = balance - ? WHERE id = ?').run(amountPaise, walletId);
    db.prepare(`
      INSERT INTO transactions (id, wallet_id, kind, amount, description, reference_id)
      VALUES (?, ?, 'withdraw', ?, 'Withdrawal to bank', ?)
    `).run(randomUUID(), walletId, amountPaise, null);
  });
  txn();
  return true;
}
