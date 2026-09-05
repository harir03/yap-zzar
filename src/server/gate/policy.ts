import { db } from '../db.js';
import type { Mandate } from '../types.js';

interface PolicyResult {
  pass: boolean;
  code?: string;
  message?: string;
}

export function checkPolicy(
  mandate: Mandate,
  walletBalance: number,
  discountPaise: number,
  customerPhone: string,
  maxAllowedDiscount: number,
): PolicyResult {
  // 1. Is the mandate active?
  if (!mandate.is_active) {
    return { pass: false, code: 'E_MANDATE_PAUSED', message: 'Agent is paused by merchant' };
  }

  // 2. Budget check — is there enough in the wallet?
  if (walletBalance < discountPaise) {
    return { pass: false, code: 'E_BUDGET_EXCEEDED', message: `Wallet has ₹${(walletBalance / 100).toFixed(2)} but discount needs ₹${(discountPaise / 100).toFixed(2)}` };
  }

  // 3. Discount cap — is the discount within RFM-computed max?
  if (discountPaise > maxAllowedDiscount) {
    return { pass: false, code: 'E_DISCOUNT_TOO_HIGH', message: `Max allowed discount is ₹${(maxAllowedDiscount / 100).toFixed(2)}` };
  }

  // 4. Cooldown — was this customer offered something recently?
  const recentOffer = db.prepare(`
    SELECT created_at FROM audit_log
    WHERE user_id = ? AND action = 'offer_sent' AND result = 'approved'
    AND json_extract(metadata, '$.customer_phone') = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(mandate.user_id, customerPhone) as { created_at: string } | undefined;

  if (recentOffer) {
    const daysSince = Math.floor((Date.now() - new Date(recentOffer.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < mandate.cooldown_days) {
      return { pass: false, code: 'E_CUSTOMER_COOLDOWN', message: `Customer was offered ${daysSince} days ago, cooldown is ${mandate.cooldown_days} days` };
    }
  }

  // 5. Velocity — too many offers this hour?
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const hourCount = db.prepare(`
    SELECT COUNT(*) as count FROM audit_log
    WHERE user_id = ? AND action = 'offer_sent' AND created_at > ?
  `).get(mandate.user_id, oneHourAgo) as { count: number };

  if (hourCount.count >= mandate.max_offers_per_hour) {
    return { pass: false, code: 'E_VELOCITY_EXCEEDED', message: `Already sent ${hourCount.count} offers this hour, limit is ${mandate.max_offers_per_hour}` };
  }

  return { pass: true };
}
