import { sendText } from './client.js';
import { getWalletByUser, withdrawWallet } from '../gate/index.js';
import { createPaymentLink } from '../razorpay/payment-link.js';
import { db } from '../db.js';
import { runBuyScout, formatScoutWhatsApp } from '../agent/buyScout.js';
import type { User } from '../types.js';

const pendingScouts = new Map<string, Awaited<ReturnType<typeof runBuyScout>>>();

export async function handleBuyerCommand(user: User, body: string) {
  const cmd = body.toLowerCase().trim();
  const wallet = getWalletByUser(user.id, 'buyer');

  if (cmd === 'balance' || cmd === 'bal') {
    const bal = wallet ? (wallet.balance / 100).toFixed(2) : '0.00';
    await sendText(user.phone, `💰 Your wallet: *₹${bal}*`);
    return;
  }

  const loadMatch = cmd.match(/^load\s+(\d+)$/);
  if (loadMatch && wallet) {
    const rupees = parseInt(loadMatch[1], 10);
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

  const withdrawMatch = cmd.match(/^withdraw\s+(\d+)$/);
  if (withdrawMatch && wallet) {
    const rupees = parseInt(withdrawMatch[1], 10);
    const ok = withdrawWallet(wallet.id, rupees * 100);
    if (ok) {
      await sendText(user.phone, `✅ Withdrawn *₹${rupees}*. It'll be in your bank within 2-3 business days.`);
    } else {
      await sendText(user.phone, `❌ Insufficient balance. Current: ₹${(wallet.balance / 100).toFixed(2)}`);
    }
    return;
  }

  if (cmd === 'history') {
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

  // buy / find / scout <query> [needs: ...]
  const buyMatch = body.trim().match(/^(?:buy|find|scout)\s+(.+)$/i);
  if (buyMatch) {
    await sendText(user.phone, '🔎 Scouting YouTube + reviews… hang tight.');
    const raw = buyMatch[1].trim();
    const needsSplit = raw.split(/\bneeds?:\s*/i);
    const query = needsSplit[0].trim();
    const needs = needsSplit[1]?.trim() ?? '';
    try {
      const result = await runBuyScout(query, needs);
      pendingScouts.set(user.id, result);
      await sendText(user.phone, formatScoutWhatsApp(result));
    } catch (err: any) {
      await sendText(user.phone, `⚠️ Scout failed: ${err?.message ?? 'unknown error'}`);
    }
    return;
  }

  const confirmMatch = cmd.match(/^buy\s+confirm\s+([123])$/);
  if (confirmMatch) {
    const scout = pendingScouts.get(user.id);
    if (!scout) {
      await sendText(user.phone, 'No active scout. Try `buy wireless earbuds needs: under 3k bass` first.');
      return;
    }
    const pick = scout.picks.find(p => p.rank === Number(confirmMatch[1])) ?? scout.picks[0];
    await sendText(
      user.phone,
      `✅ *Human confirm logged* for #${pick.rank} ${pick.name}\n\n` +
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
