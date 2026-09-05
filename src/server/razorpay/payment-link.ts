import { razorpay } from './client.js';

interface PaymentLinkOptions {
  amountPaise: number;
  description: string;
  customerName: string;
  customerPhone: string;
  referenceId: string;
  callbackUrl?: string;
}

interface PaymentLinkResult {
  id: string;
  short_url: string;
  amount: number;
  status: string;
}

export async function createPaymentLink(opts: PaymentLinkOptions): Promise<PaymentLinkResult> {
  const link = await razorpay.paymentLink.create({
    amount: opts.amountPaise,
    currency: 'INR',
    description: opts.description,
    customer: {
      name: opts.customerName,
      contact: `+91${opts.customerPhone}`,
    },
    notify: { sms: false, email: false }, // we notify via WhatsApp
    callback_url: opts.callbackUrl ?? '',
    callback_method: 'get',
    reference_id: opts.referenceId,
    notes: {
      source: 'yap-zzar',
      reference_id: opts.referenceId,
    },
  });

  return {
    id: link.id,
    short_url: link.short_url,
    amount: Number(link.amount),
    status: link.status,
  };
}
