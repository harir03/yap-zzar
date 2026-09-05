import { db } from '../db.js';

interface RFMScore {
  recencyDays: number;
  frequency: number;
  monetaryPaise: number;
  eligible: boolean;
  reason?: string;
}

export function scoreCustomer(merchantId: string, customerPhone: string): RFMScore {
  const row = db.prepare(`
    SELECT order_count, total_spent, last_order_at
    FROM customer_history
    WHERE merchant_id = ? AND customer_phone = ?
  `).get(merchantId, customerPhone) as { order_count: number; total_spent: number; last_order_at: string | null } | undefined;

  if (!row || !row.last_order_at) {
    return { recencyDays: Infinity, frequency: 0, monetaryPaise: 0, eligible: false, reason: 'No purchase history' };
  }

  const lastOrder = new Date(row.last_order_at);
  const now = new Date();
  const recencyDays = Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24));

  // Rule 1: fewer than 2 orders → no discount (first-timer protection)
  if (row.order_count < 2) {
    return { recencyDays, frequency: row.order_count, monetaryPaise: row.total_spent, eligible: false, reason: 'First-timer — needs at least 2 past orders' };
  }

  // Rule 2: bought within last 7 days → no discount (prevent discount addiction)
  if (recencyDays < 7) {
    return { recencyDays, frequency: row.order_count, monetaryPaise: row.total_spent, eligible: false, reason: 'Recent buyer — last purchase was only ' + recencyDays + ' days ago' };
  }

  return { recencyDays, frequency: row.order_count, monetaryPaise: row.total_spent, eligible: true };
}

// Cap discount at 5% of customer's average order value
export function maxDiscount(monetaryPaise: number, frequency: number, merchantCapPaise: number): number {
  if (frequency === 0) return 0;
  const avgOrder = Math.floor(monetaryPaise / frequency);
  const fivePercent = Math.floor(avgOrder * 0.05);
  return Math.min(fivePercent, merchantCapPaise);
}
