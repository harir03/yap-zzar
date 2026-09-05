import { sendText } from './client.js';
import { getWalletByUser, withdrawWallet } from '../gate/index.js';
import { createPaymentLink } from '../razorpay/payment-link.js';
import { db } from '../db.js';
import type { User } from '../types.js';

export async function handleBuyerCommand(user: User, body: string) {
  const cmd = body.toLowerCase().trim();
  const wallet = getWalletByUser(user.id, 'buyer');

  // balance
  if (cmd === 'balance' || cmd === 'bal') {
    const bal = wallet ? (wallet.balance / 100).toFixed(2) : '0.00';
    await sendText(user.phone, `💰 Your wallet: *₹${bal}*`);
    return;
  }

  // load <amount>
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

  // withdraw <amount>
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

  // history
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

  // help
  await sendText(user.phone,
    `🤖 *Commands*\n\n💰 *balance* — wallet balance\n💳 *load 1000* — add ₹1,000\n📋 *history* — past transactions\n📤 *withdraw 500* — withdraw ₹500`
  );
}
