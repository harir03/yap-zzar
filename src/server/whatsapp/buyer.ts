import { sendText } from './client.js';
import { getWalletByUser, withdrawWallet } from '../gate/index.js';
import { createPaymentLink } from '../razorpay/payment-link.js';
import { db } from '../db.js';
import { runBuyScout, formatScoutWhatsApp } from '../agent/buyScout.js';
import type { User } from '../types.js';
import { parseBuyerCommand } from './buyerCommands.js';

const pendingScouts = new Map<string, Awaited<ReturnType<typeof runBuyScout>>>();

export async function handleBuyerCommand(user: User, body: string) {
  const parsed = parseBuyerCommand(body);
  const wallet = getWalletByUser(user.id, 'buyer');

  if (parsed.type === 'balance') {
    const bal = wallet ? (wallet.balance / 100).toFixed(2) : '0.00';
    await sendText(user.phone, `💰 Your wallet: *₹${bal}*`);
    return;
  }

  if (parsed.type === 'load' && wallet) {
    const rupees = parsed.rupees;
    if (rupees < 50 || rupees > 50000) {
      await sendText(user.phone, '❌ Amount must be between ₹50 and ₹50,000');
      return;
    }
    try {
      const link = await createPaymentLink({
        amountPaise: rupees * 100,
        description: `yap-zzar wallet load — ₹${rupees}`,
        customerName: 'Buyer',
        customerPhone: user.phone,
        referenceId: `wallet_load_${wallet.id}`,
      });
      await sendText(user.phone, `💳 Pay *₹${rupees}* to load your wallet:\n\n${link.short_url}\n\n(UPI, Card, or NetBanking)`);
    } catch {
      await sendText(user.phone, `⚠️ Could not create payment link.`);
    }
    return;
  }

  if (parsed.type === 'withdraw' && wallet) {
    const rupees = parsed.rupees;
    const ok = withdrawWallet(wallet.id, rupees * 100);
    if (ok) {
      await sendText(user.phone, `✅ Withdrawn *₹${rupees}*. It'll be in your bank within 2-3 business days.`);
    } else {
      await sendText(user.phone, `❌ Insufficient balance. Current: ₹${(wallet.balance / 100).toFixed(2)}`);
    }
    return;
  }

  if (parsed.type === 'history') {
    if (!wallet) { await sendText(user.phone, 'No wallet found.'); return; }
    const txns = db.prepare(`
      SELECT kind, amount, description, created_at FROM transactions
      WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 5
    `).all(wallet.id) as Array<{ kind: string; amount: number; description: string; created_at: string }>;

    if (txns.length === 0) {
      await sendText(user.phone, '📋 No transactions yet.');
      return;
    }
    const lines = txns.map(t => {
      const sign = t.kind === 'load' || t.kind === 'credit' ? '+' : '-';
      return `${sign}₹${(t.amount / 100).toFixed(2)} — ${t.description}`;
    });
    await sendText(user.phone, `📋 *Recent Transactions*\n\n${lines.join('\n')}`);
    return;
  }

  if (parsed.type === 'buy') {
    await sendText(user.phone, '🔍 Scouting YouTube + reviews… hang tight.');
    try {
      const result = await runBuyScout(parsed.query, parsed.needs);
      pendingScouts.set(user.id, result);
      await sendText(user.phone, formatScoutWhatsApp(result));
    } catch (err: any) {
      await sendText(user.phone, `⚠️ Scout failed: ${err?.message ?? 'unknown error'}`);
    }
    return;
  }

  if (parsed.type === 'buy_confirm') {
    const scout = pendingScouts.get(user.id);
    if (!scout) {
      await sendText(user.phone, 'No active scout. Try `buy wireless earbuds needs: under 3k bass` first.');
      return;
    }
    const pick = scout.picks.find(p => p.rank === parsed.rank) ?? scout.picks[0];
    await sendText(
      user.phone,
      `✅ *Human confirm logged` for #${pick.rank} ${pick.name}\n\n` +
        `yap-zzar will *not* auto-pay. Next: load wallet if needed, then complete checkout when the merchant link arrives.\n\n` +
        `_${scout.disclaimer}_`,
    );
    return;
  }

  await sendText(user.phone,
    `🤖 *Buyer commands*\n\n` +
      `🛒 *buy <thing>* — scout YouTube + reviews\n` +
      `   e.g. buy wireless earbuds needs: under 3k, good mic\n` +
      `✅ *buy confirm 1* — confirm pick (no auto-pay)\n` +
      `💰 *balance* — wallet balance\n` +
      `💳 *load 1000* — add ₹1,000\n` +
      `📋 *history* — past transactions\n` +
      `📤 *withdraw 500* — withdraw ₹500`,
  );
}
