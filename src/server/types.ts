// Shared types for yap-zzar. Every module imports from here.

export type UserRole = 'buyer' | 'merchant';
export type WalletType = 'buyer' | 'campaign';
export type TransactionKind = 'load' | 'debit' | 'credit' | 'withdraw';
export type AuditResult = 'approved' | 'blocked' | 'error';

export interface User {
  id: string;
  phone: string;
  role: UserRole;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  type: WalletType;
  balance: number; // in paise (₹1 = 100 paise)
  created_at: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  kind: TransactionKind;
  amount: number; // paise
  description: string;
  reference_id?: string;
  created_at: string;
}

export interface Mandate {
  id: string;
  user_id: string;
  max_discount_paise: number;
  min_order_frequency: number;   // minimum past orders to qualify
  min_lapse_days: number;        // days inactive before eligible
  cooldown_days: number;         // days between offers to same customer
  max_offers_per_hour: number;
  is_active: boolean;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  agent_id: string;
  user_id: string;
  action: string;
  reason: string;
  result: AuditResult;
  error_code?: string;
  metadata?: string; // JSON blob
  created_at: string;
}

// Gate request — what an agent sends to the gate
export interface GateRequest {
  agent_id: string;
  merchant_id: string;
  customer_phone: string;
  discount_paise: number;
  product_name: string;
  product_price_paise: number;
  reason: string;
  idempotency_key: string;
}

// Gate response — what the gate returns
export interface GateResponse {
  approved: boolean;
  code?: string;
  message?: string;
  lease_id?: string;
  remaining_budget_paise?: number;
}
