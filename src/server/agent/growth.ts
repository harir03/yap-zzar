import { db } from '../db.js';
import { scoreCustomer, maxDiscount } from '../gate/rfm.js';
import type { Mandate } from '../types.js';

interface LapsedCustomer {
  phone: string;
  recencyDays: number;
  frequency: number;
  monetaryPaise: number;
  maxDiscountPaise: number;
}

// Find customers who haven't ordered in a while but have enough history
export function findLapsedCustomers(merchantId: string, limit = 10): LapsedCustomer[] {
  const mandate = db.prepare('SELECT * FROM mandates WHERE user_id = ? LIMIT 1').get(merchantId) as Mandate | undefined;
  if (!mandate || !mandate.is_active) return [];

  const candidates = db.prepare(`
    SELECT customer_phone, order_count, total_spent, last_order_at
    FROM customer_history
    WHERE merchant_id = ?
    ORDER BY last_order_at ASC
    LIMIT ?
  `).all(merchantId, limit * 3) as Array<{
    customer_phone: string;
    order_count: number;
    total_spent: number;
    last_order_at: string;
  }>;

  const results: LapsedCustomer[] = [];

  for (const c of candidates) {
    const rfm = scoreCustomer(merchantId, c.customer_phone);
    if (!rfm.eligible) continue;

    const maxDisc = maxDiscount(rfm.monetaryPaise, rfm.frequency, mandate.max_discount_paise);
    if (maxDisc <= 0) continue;

    results.push({
      phone: c.customer_phone,
      recencyDays: rfm.recencyDays,
      frequency: rfm.frequency,
      monetaryPaise: rfm.monetaryPaise,
      maxDiscountPaise: maxDisc,
    });

    if (results.length >= limit) break;
  }

  return results;
}
