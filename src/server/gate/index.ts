import { sanitize } from './sanitize.js';
import { scoreCustomer, maxDiscount } from './rfm.js';
import { checkPolicy } from './policy.js';
import { detectAnomaly } from './anomaly.js';
import { acquireLease } from './lease.js';
import { checkIdempotency, saveIdempotency } from './idempotency.js';
import { getWalletByUser } from './wallet.js';
import { logAudit } from './audit.js';
import { db } from '../db.js';
import type { GateResponse, Mandate } from '../types.js';

// The single entry point. Every agent request flows through here.
// Chain: sanitize → dedup → RFM → policy → anomaly → lease → audit
export function evaluateRequest(raw: unknown): GateResponse {
  // 1. Sanitize input
  const sanitized = sanitize(raw);
  if (!sanitized.valid || !sanitized.data) {
    logAudit('unknown', 'unknown', 'gate_request', sanitized.message ?? '', 'blocked', sanitized.code);
    return { approved: false, code: sanitized.code, message: sanitized.message };
  }

  const req = sanitized.data;

  // 2. Idempotency check
  const cached = checkIdempotency(req.idempotency_key);
  if (cached) {
    return JSON.parse(cached) as GateResponse;
  }

  // 3. Get merchant's wallet and mandate
  const wallet = getWalletByUser(req.merchant_id, 'campaign');
  if (!wallet) {
    const resp: GateResponse = { approved: false, code: 'E_NO_WALLET', message: 'Merchant has no campaign wallet' };
    logAudit(req.agent_id, req.merchant_id, 'gate_request', req.reason, 'blocked', 'E_NO_WALLET');
    return resp;
  }

  const mandate = db.prepare('SELECT * FROM mandates WHERE user_id = ? LIMIT 1').get(req.merchant_id) as Mandate | undefined;
  if (!mandate) {
    const resp: GateResponse = { approved: false, code: 'E_NO_MANDATE', message: 'Merchant has no active mandate' };
    logAudit(req.agent_id, req.merchant_id, 'gate_request', req.reason, 'blocked', 'E_NO_MANDATE');
    return resp;
  }

  // 4. RFM scoring
  const rfm = scoreCustomer(req.merchant_id, req.customer_phone);
  if (!rfm.eligible) {
    const resp: GateResponse = { approved: false, code: 'E_RFM_INELIGIBLE', message: rfm.reason };
    logAudit(req.agent_id, req.merchant_id, 'gate_request', req.reason, 'blocked', 'E_RFM_INELIGIBLE', { customer_phone: req.customer_phone, rfm });
    saveIdempotency(req.idempotency_key, JSON.stringify(resp));
    return resp;
  }

  // 5. Compute max allowed discount
  const maxDisc = maxDiscount(rfm.monetaryPaise, rfm.frequency, mandate.max_discount_paise);

  // 6. Policy engine
  const policy = checkPolicy(mandate, wallet.balance, req.discount_paise, req.customer_phone, maxDisc);
  if (!policy.pass) {
    const resp: GateResponse = { approved: false, code: policy.code, message: policy.message };
    logAudit(req.agent_id, req.merchant_id, 'gate_request', req.reason, 'blocked', policy.code, { customer_phone: req.customer_phone, discount: req.discount_paise });
    saveIdempotency(req.idempotency_key, JSON.stringify(resp));
    return resp;
  }

  // 7. Anomaly detection
  const anomaly = detectAnomaly(req.merchant_id, wallet.balance);
  if (!anomaly.safe) {
    const resp: GateResponse = { approved: false, code: anomaly.code, message: anomaly.message };
    logAudit(req.agent_id, req.merchant_id, 'gate_request', req.reason, 'blocked', anomaly.code, { customer_phone: req.customer_phone });
    saveIdempotency(req.idempotency_key, JSON.stringify(resp));
    return resp;
  }

  // 8. Acquire lease (atomic budget lock)
  const leaseId = acquireLease(wallet.id, req.discount_paise);
  if (!leaseId) {
    const resp: GateResponse = { approved: false, code: 'E_LEASE_FAILED', message: 'Could not lock budget — likely concurrent requests' };
    logAudit(req.agent_id, req.merchant_id, 'gate_request', req.reason, 'blocked', 'E_LEASE_FAILED');
    return resp;
  }

  // All checks passed
  const remaining = wallet.balance - req.discount_paise;
  const resp: GateResponse = { approved: true, lease_id: leaseId, remaining_budget_paise: remaining };
  logAudit(req.agent_id, req.merchant_id, 'offer_sent', req.reason, 'approved', undefined, {
    customer_phone: req.customer_phone,
    discount_paise: req.discount_paise,
    product: req.product_name,
    lease_id: leaseId,
  });
  saveIdempotency(req.idempotency_key, JSON.stringify(resp));

  return resp;
}

// Re-export everything gate-related for convenience
export { logAudit, onAudit, getRecentAudit } from './audit.js';
export { createWallet, getWallet, getWalletByUser, loadWallet, debitWallet, creditWallet, withdrawWallet } from './wallet.js';
export { scoreCustomer, maxDiscount } from './rfm.js';
export { releaseLease } from './lease.js';
