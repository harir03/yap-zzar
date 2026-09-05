import { db } from '../db.js';

interface AnomalyResult {
  safe: boolean;
  code?: string;
  message?: string;
}

export function detectAnomaly(merchantId: string, walletBalance: number): AnomalyResult {
  // Pattern: wallet drain — more than 50% spent in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const hourSpend = db.prepare(`
    SELECT COALESCE(SUM(t.amount), 0) as total
    FROM transactions t
    JOIN wallets w ON t.wallet_id = w.id
    WHERE w.user_id = ? AND t.kind = 'debit' AND t.created_at > ?
  `).get(merchantId, oneHourAgo) as { total: number };

  const totalBudget = walletBalance + hourSpend.total;
  if (totalBudget > 0 && hourSpend.total > totalBudget * 0.5) {
    return {
      safe: false,
      code: 'E_ANOMALY_WALLET_DRAIN',
      message: `Over 50% of budget spent in the last hour (₹${(hourSpend.total / 100).toFixed(2)} of ₹${(totalBudget / 100).toFixed(2)})`,
    };
  }

  return { safe: true };
}
