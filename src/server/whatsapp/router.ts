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
  return jid
    .replace(/@c\.us|@s\.whatsapp\.net|@lid/g, '')
    .replace(/^91/, '');
}

export async function handleWhatsAppWebhook(req: Request, res: Response) {
  const event = req.body?.event;
  // If event is specified, only process message events
  if (event && event !== 'message' && event !== 'message.any') {
    res.json({ received: true });
    return;
  }

  // WAHA sends payload inside req.body.payload or req.body.data
  const payload = req.body?.payload ?? req.body?.data ?? req.body;
  const from = payload?.from ?? payload?.chatId ?? req.body?.from ?? '';
  const body = (payload?.body ?? payload?.text ?? req.body?.body ?? '').trim();
  const fromMe = payload?.fromMe ?? req.body?.fromMe ?? false;

  console.log(`[WhatsApp Webhook] Received from: "${from}", fromMe: ${fromMe}, body: "${body}"`);

  if (!from || !body) {
    res.json({ received: true });
    return;
  }

  // Avoid reply loops if messaging self
  if (fromMe && (body.startsWith('👋') || body.startsWith('✅') || body.startsWith('🤖') || body.startsWith('💰') || body.startsWith('💳'))) {
    res.json({ received: true });
    return;
  }

  const phone = extractPhone(from);
  // Also pass the exact `from` JID so replies go to the exact conversation (including @lid)
  const replyTarget = from;

  try {
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as User | undefined;

    if (!user) {
      console.log(`[WhatsApp Webhook] New user onboarding for: ${phone} (target: ${replyTarget})`);
      await handleOnboarding(replyTarget, body);
    } else if (user.role === 'merchant') {
      console.log(`[WhatsApp Webhook] Merchant command from: ${phone}`);
      await handleMerchantCommand({ ...user, phone: replyTarget }, body);
    } else {
      console.log(`[WhatsApp Webhook] Buyer command from: ${phone}`);
      await handleBuyerCommand({ ...user, phone: replyTarget }, body);
    }
  } catch (err) {
    console.error('[WhatsApp Webhook Error]:', err);
  }

  res.json({ received: true });
}
