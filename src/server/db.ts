import Database from 'better-sqlite3';
import { config } from './config.js';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Ensure the data directory exists
mkdirSync(dirname(config.DATABASE_PATH), { recursive: true });

export const db = new Database(config.DATABASE_PATH);

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ponytail: one migration block, no ORM, no migration framework
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    phone       TEXT UNIQUE NOT NULL,
    role        TEXT NOT NULL CHECK (role IN ('buyer', 'merchant')),
    razorpay_key_id     TEXT,
    razorpay_key_secret TEXT,
    state       TEXT DEFAULT '{}',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wallets (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    type        TEXT NOT NULL CHECK (type IN ('buyer', 'campaign')),
    balance     INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id            TEXT PRIMARY KEY,
    wallet_id     TEXT NOT NULL REFERENCES wallets(id),
    kind          TEXT NOT NULL CHECK (kind IN ('load', 'debit', 'credit', 'withdraw')),
    amount        INTEGER NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    reference_id  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mandates (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id),
    max_discount_paise  INTEGER NOT NULL DEFAULT 20000,
    min_order_frequency INTEGER NOT NULL DEFAULT 2,
    min_lapse_days      INTEGER NOT NULL DEFAULT 30,
    cooldown_days       INTEGER NOT NULL DEFAULT 14,
    max_offers_per_hour INTEGER NOT NULL DEFAULT 10,
    is_active           INTEGER NOT NULL DEFAULT 1,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id          TEXT PRIMARY KEY,
    agent_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    action      TEXT NOT NULL,
    reason      TEXT NOT NULL DEFAULT '',
    result      TEXT NOT NULL CHECK (result IN ('approved', 'blocked', 'error')),
    error_code  TEXT,
    metadata    TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customer_history (
    id              TEXT PRIMARY KEY,
    merchant_id     TEXT NOT NULL REFERENCES users(id),
    customer_phone  TEXT NOT NULL,
    order_count     INTEGER NOT NULL DEFAULT 0,
    total_spent     INTEGER NOT NULL DEFAULT 0,
    last_order_at   TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(merchant_id, customer_phone)
  );

  CREATE TABLE IF NOT EXISTS leases (
    id          TEXT PRIMARY KEY,
    wallet_id   TEXT NOT NULL REFERENCES wallets(id),
    amount      INTEGER NOT NULL,
    expires_at  TEXT NOT NULL,
    released    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS idempotency_keys (
    key_hash    TEXT PRIMARY KEY,
    response    TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

console.log(`📦 Database ready: ${config.DATABASE_PATH}`);
