import { randomUUID } from 'node:crypto';
import { findLapsedCustomers } from './growth.js';
import { generateOfferMessage } from './gemini.js';
import { evaluateRequest, logAudit, debitWallet, getWalletByUser } from '../gate/index.js';
import { releaseLease } from '../gate/lease.js';
import { sendText } from '../whatsapp/client.js';

interface PipelineResult {
  sent: number;
  blocked: number;
  errors: number;
  details: Array<{ phone: string; status: string; reason?: string }>;
}

// The full loop: find lapsed → gate check → generate message → send on whatsapp
export async function runGrowthPipeline(merchantId: string, agentId?: string): Promise<PipelineResult> {
  const aid = agentId ?? randomUUID();
  const result: PipelineResult = { sent: 0, blocked: 0, errors: 0, details: [] };

  const lapsed = findLapsedCustomers(merchantId);
  if (lapsed.length === 0) {
    result.details.push({ phone: '-', status: 'skip', reason: 'No eligible lapsed customers found' });
    return result;
  }

  for (const customer of lapsed) {
    // Step 1: Ask the gate
    const gateResponse = evaluateRequest({
      agent_id: aid,
      merchant_id: merchantId,
      customer_phone: customer.phone,
      discount_paise: customer.maxDiscountPaise,
      product_name: 'Win-back offer',
      product_price_paise: customer.monetaryPaise,
      reason: `Lapsed ${customer.recencyDays} days, F=${customer.frequency}`,
      idempotency_key: `growth_${merchantId}_${customer.phone}_${new Date().toISOString().slice(0, 10)}`,
    });

    if (!gateResponse.approved) {
      result.blocked++;
      result.details.push({ phone: customer.phone, status: 'blocked', reason: gateResponse.message });
      continue;
    }

    // Step 2: Generate personalized message via Gemini
    let message: string;
    try {
      message = await generateOfferMessage(
        customer.phone, // ponytail: using phone as name placeholder
        'Win-back offer',
        customer.maxDiscountPaise / 100,
        customer.recencyDays,
      );
    } catch {
      // Fallback if Gemini is down
      message = `Hi! We miss you 🥺 Here's ₹${(customer.maxDiscountPaise / 100).toFixed(0)} off on your next order. Come back and shop!`;
    }

    // Step 3: Debit wallet and send
    try {
      const wallet = getWalletByUser(merchantId, 'campaign');
      if (wallet) {
        debitWallet(wallet.id, customer.maxDiscountPaise, `Offer to ${customer.phone}`, gateResponse.lease_id);
      }
      if (gateResponse.lease_id) releaseLease(gateResponse.lease_id);

      await sendText(customer.phone, message);

      result.sent++;
      result.details.push({ phone: customer.phone, status: 'sent' });
    } catch (err) {
      result.errors++;
      result.details.push({ phone: customer.phone, status: 'error', reason: String(err) });
      // Release the lease if sending failed
      if (gateResponse.lease_id) releaseLease(gateResponse.lease_id);
    }
  }

  logAudit(aid, merchantId, 'growth_pipeline_run', `Sent ${result.sent}, blocked ${result.blocked}, errors ${result.errors}`, result.errors > 0 ? 'error' : 'approved');

  return result;
}
