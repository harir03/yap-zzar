import { razorpay } from './client.js';

interface CreateOrderOptions {
  amountPaise: number;
  receipt: string;
  notes: {
    agent_id: string;
    merchant_id: string;
    customer_phone: string;
    campaign_reason: string;
    lease_id: string;
    discount_paise: number;
  };
}

interface OrderResult {
  id: string;
  amount: number;
  status: string;
  receipt: string;
}

export async function createOrder(opts: CreateOrderOptions): Promise<OrderResult> {
  const order = await razorpay.orders.create({
    amount: opts.amountPaise,
    currency: 'INR',
    receipt: opts.receipt,
    notes: {
      source: 'yap-zzar',
      agent_id: opts.notes.agent_id,
      merchant_id: opts.notes.merchant_id,
      customer_phone: opts.notes.customer_phone,
      campaign_reason: opts.notes.campaign_reason,
      lease_id: opts.notes.lease_id,
      discount_paise: String(opts.notes.discount_paise),
    },
  });

  return {
    id: order.id,
    amount: order.amount,
    status: order.status,
    receipt: order.receipt ?? opts.receipt,
  };
}

// Create an order with settlement on hold (for buyer confirmation flow)
export async function createHeldOrder(opts: CreateOrderOptions): Promise<OrderResult> {
  const order = await razorpay.orders.create({
    amount: opts.amountPaise,
    currency: 'INR',
    receipt: opts.receipt,
    notes: {
      source: 'yap-zzar',
      ...opts.notes,
      discount_paise: String(opts.notes.discount_paise),
    },
    // ponytail: Razorpay Route API — hold settlement until buyer confirms
    transfers: [{
      account: 'acc_placeholder', // merchant's connected account
      amount: opts.amountPaise,
      currency: 'INR',
      on_hold: true,
      on_hold_until: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min hold
    }],
  });

  return {
    id: order.id,
    amount: order.amount,
    status: order.status,
    receipt: order.receipt ?? opts.receipt,
  };
}
