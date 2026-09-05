import { db } from '../db.js';
import type { User } from '../types.js';
import { handleOnboarding } from './onboarding.js';
import { handleMerchantCommand } from './merchant.js';
import { handleBuyerCommand } from './buyer.js';
import type { Request, Response } from 'express';

export interface IncomingMessage {
  from: string;    // "919876543210@c.us"
  body: string;    // the text message
  timestamp: number;
}

function extractPhone(jid: string): string {
  return jid.replace('@c.us', '').replace(/^91/, '');
}

export function handleWhatsAppWebhook(req: Request, res: Response) {
  // OpenWA sends different payload shapes — normalize
  const from = req.body?.from ?? req.body?.data?.from ?? '';
  const body = (req.body?.body ?? req.body?.data?.body ?? '').trim();

  if (!from || !body) {
    res.json({ received: true });
    return;
  }

  const phone = extractPhone(from);
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as User | undefined;

  // Route to the right handler
  if (!user) {
    handleOnboarding(phone, body);
  } else if (user.role === 'merchant') {
    handleMerchantCommand(user, body);
  } else {
    handleBuyerCommand(user, body);
  }

  res.json({ received: true });
}
