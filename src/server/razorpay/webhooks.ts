import { createHash } from 'node:crypto';
import { config } from '../config.js';
import { loadWallet, logAudit } from '../gate/index.js';
import { db } from '../db.js';
import type { Request, Response } from 'express';

// Verify Razorpay webhook signature
function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = createHash('sha256').update(body + '|' + secret).digest('hex');
  // ponytail: timing-safe comparison not critical for test mode
  return expected === signature;
}

export function handleRazorpayWebhook(req: Request, res: Response) {
  const event = req.body?.event;
  const payload = req.body?.payload;

  if (!event || !payload) {
    res.status(400).json({ error: 'Missing event or payload' });
    return;
  }

  switch (event) {
    case 'payment_link.paid': {
      // Wallet load completed — credit the wallet
      const entity = payload.payment_link?.entity;
      if (!entity) break;

      const referenceId = entity.reference_id;
      const amountPaise = entity.amount;

      // Find wallet by reference_id pattern: "wallet_load_{walletId}"
      const walletId = referenceId?.replace('wallet_load_', '');
      if (walletId) {
        loadWallet(walletId, amountPaise, `Payment link ${entity.id}`, entity.id);
        logAudit('system', walletId, 'wallet_loaded', `₹${(amountPaise / 100).toFixed(2)} loaded via payment link`, 'approved', undefined, { payment_link_id: entity.id });
      }
      break;
    }

    case 'payment.captured': {
      const payment = payload.payment?.entity;
      if (!payment) break;
      logAudit('system', payment.notes?.merchant_id ?? 'unknown', 'payment_captured', `₹${(payment.amount / 100).toFixed(2)} captured`, 'approved', undefined, { payment_id: payment.id, order_id: payment.order_id });
      break;
    }

    case 'payment.failed': {
      const payment = payload.payment?.entity;
      if (!payment) break;
      logAudit('system', payment.notes?.merchant_id ?? 'unknown', 'payment_failed', payment.error_description ?? 'Payment failed', 'error', 'PAYMENT_FAILED', { payment_id: payment.id });
      break;
    }
  }

  res.json({ received: true });
}
