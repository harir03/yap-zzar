import { db } from '../db.js';
import { randomUUID } from 'node:crypto';
import { sendText, sendButtons } from './client.js';
import { createWallet } from '../gate/wallet.js';

// In-memory state for multi-step onboarding (no DB needed for temp state)
const pendingOnboarding = new Map<string, { step: string }>();

export async function handleOnboarding(phone: string, body: string) {
  const state = pendingOnboarding.get(phone);
  const cmd = body.toLowerCase().trim();

  // First contact
  if (!state) {
    pendingOnboarding.set(phone, { step: 'choose_role' });
    await sendText(phone,
      `👋 Welcome to *yap-zzar*!\n\nAI agents that help you buy and sell — right here on WhatsApp.\n\nAre you a:\n🏪 *Merchant* — grow your revenue with AI\n👤 *Buyer* — let AI find you deals\n\nReply with *merchant* or *buyer*`
    );
    return;
  }

  if (state.step === 'choose_role') {
    if (cmd.includes('merchant') || cmd.includes('🏪')) {
      const id = randomUUID();
      db.prepare(`INSERT INTO users (id, phone, role) VALUES (?, ?, 'merchant')`).run(id, phone);
      createWallet(id, 'campaign');
      db.prepare(`INSERT INTO mandates (id, user_id) VALUES (?, ?)`).run(randomUUID(), id);
      pendingOnboarding.delete(phone);

      await sendText(phone,
        `✅ You're registered as a *merchant*!\n\nYour AI growth agent is ready. Here's what you can do:\n\n📊 *status* — see campaign stats\n💰 *balance* — check campaign wallet\n💳 *load 5000* — add ₹5,000 to wallet\n⏸️ *pause* — pause the agent\n▶️ *resume* — resume the agent\n📋 *audit* — see recent activity\n📤 *withdraw 1000* — withdraw ₹1,000\n🔧 *max 200* — set max discount to ₹200\n\nStart by loading your campaign wallet!`
      );
    } else if (cmd.includes('buyer') || cmd.includes('👤')) {
      const id = randomUUID();
      db.prepare(`INSERT INTO users (id, phone, role) VALUES (?, ?, 'buyer')`).run(id, phone);
      createWallet(id, 'buyer');
      pendingOnboarding.delete(phone);

      await sendText(phone,
        `✅ You're registered as a *buyer*!\n\nYour AI shopping agent is ready. Here's what you can do:\n\n💰 *balance* — check wallet balance\n💳 *load 1000* — add ₹1,000 to wallet\n📋 *history* — see past transactions\n📤 *withdraw 500* — withdraw ₹500\n\nStart by loading your wallet!`
      );
    } else {
      await sendText(phone, `Please reply with *merchant* or *buyer* to get started.`);
    }
  }
}
