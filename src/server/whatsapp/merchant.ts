import { db } from '../db.js';
import { sendText } from './client.js';
import { getWalletByUser, loadWallet, withdrawWallet, getRecentAudit } from '../gate/index.js';
import { createPaymentLink } from '../razorpay/payment-link.js';
import { runGrowthPipeline } from '../agent/pipeline.js';
import type { User, Mandate } from '../types.js';

export async function handleMerchantCommand(user: User, body: string) {
  const cmd = body.toLowerCase().trim();
  const wallet = getWalletByUser(user.id, 'campaign');
  const mandate = db.prepare('SELECT * FROM mandates WHERE user_id = ?').get(user.id) as Mandate | undefined;

  // balance
  if (cmd === 'balance' || cmd === 'bal') {
    const bal = wallet ? (wallet.balance / 100).toFixed(2) : '0.00';
    await sendText(user.phone, `💰 Campaign wallet: *₹${bal}*`);
    return;
  }

  // status
  if (cmd === 'status') {
    const bal = wallet ? (wallet.balance / 100).toFixed(2) : '0.00';
    const active = mandate?.is_active ? '▶️ Active' : '⏸️ Paused';
    const maxDisc = mandate ? (mandate.max_discount_paise / 100).toFixed(0) : '200';
    const todayOffers = db.prepare(`
      SELECT COUNT(*) as c FROM audit_log
      WHERE user_id = ? AND action = 'offer_sent' AND created_at > date('now')
    `).get(user.id) as { c: number };

    await sendText(user.phone,
      `📊 *Campaign Status*\n\n💰 Wallet: ₹${bal}\n🤖 Agent: ${active}\n🎯 Max discount: ₹${maxDisc}\n📨 Offers today: ${todayOffers.c}`
    );
    return;
  }

  // load <amount>
  const loadMatch = cmd.match(/^load\s+(\d+)$/);
  if (loadMatch && wallet) {
    const rupees = parseInt(loadMatch[1], 10);
    if (rupees < 100 || rupees > 100000) {
      await sendText(user.phone, '❌ Amount must be between ₹100 and ₹1,00,000');
      return;
    }
    try {
      const link = await createPaymentLink({
        amountPaise: rupees * 100,
        description: `yap-zzar campaign wallet load — ₹${rupees}`,
        customerName: 'Merchant',
        customerPhone: user.phone,
        referenceId: `wallet_load_${wallet.id}`,
      });
      await sendText(user.phone, `💳 Pay *₹${rupees}* to load your campaign wallet:\n\n${link.short_url}\n\n(UPI, Card, or NetBanking)`);
    } catch {
      await sendText(user.phone, `⚠️ Could not create payment link. Check if your Razorpay test keys are configured.`);
    }
    return;
  }

  // withdraw <amount>
  const withdrawMatch = cmd.match(/^withdraw\s+(\d+)$/);
  if (withdrawMatch && wallet) {
    const rupees = parseInt(withdrawMatch[1], 10);
    const ok = withdrawWallet(wallet.id, rupees * 100);
    if (ok) {
      await sendText(user.phone, `✅ Withdrawn *₹${rupees}* from campaign wallet.`);
    } else {
      await sendText(user.phone, `❌ Insufficient balance. Current: ₹${(wallet.balance / 100).toFixed(2)}`);
    }
    return;
  }

  // pause
  if (cmd === 'pause' && mandate) {
    db.prepare('UPDATE mandates SET is_active = 0 WHERE id = ?').run(mandate.id);
    await sendText(user.phone, `⏸️ Growth agent paused. No more offers will be sent until you *resume*.`);
    return;
  }

  // resume
  if (cmd === 'resume' && mandate) {
    db.prepare('UPDATE mandates SET is_active = 1 WHERE id = ?').run(mandate.id);
    await sendText(user.phone, `▶️ Growth agent resumed! Offers will be sent to eligible lapsed customers.`);
    return;
  }

  // max <amount> — set max discount
  const maxMatch = cmd.match(/^max\s+(\d+)$/);
  if (maxMatch && mandate) {
    const rupees = parseInt(maxMatch[1], 10);
    if (rupees < 10 || rupees > 5000) {
      await sendText(user.phone, '❌ Max discount must be between ₹10 and ₹5,000');
      return;
    }
    db.prepare('UPDATE mandates SET max_discount_paise = ? WHERE id = ?').run(rupees * 100, mandate.id);
    await sendText(user.phone, `🔧 Max discount per offer updated to *₹${rupees}*`);
    return;
  }

  // audit
  if (cmd === 'audit') {
    const entries = getRecentAudit(user.id, 5);
    if (entries.length === 0) {
      await sendText(user.phone, '📋 No activity yet.');
      return;
    }
    const lines = entries.map(e => {
      const icon = e.result === 'approved' ? '🟢' : '🔴';
      return `${icon} ${e.action}: ${e.reason}`;
    });
    await sendText(user.phone, `📋 *Recent Activity*\n\n${lines.join('\n')}`);
    return;
  }

  // run — trigger growth pipeline manually
  if (cmd === 'run') {
    await sendText(user.phone, '🚀 Running growth agent... finding lapsed customers.');
    const result = await runGrowthPipeline(user.id);
    await sendText(user.phone, `✅ Done!\n\n📨 Sent: ${result.sent}\n🚫 Blocked: ${result.blocked}\n❌ Errors: ${result.errors}`);
    return;
  }

  // help
  await sendText(user.phone,
    `🤖 *Commands*\n\n📊 *status* — campaign stats\n💰 *balance* — wallet balance\n💳 *load 5000* — add ₹5,000\n🚀 *run* — run growth agent now\n⏸️ *pause* — pause agent\n▶️ *resume* — resume agent\n📤 *withdraw 1000* — withdraw ₹1,000\n🔧 *max 200* — max discount ₹200\n📋 *audit* — recent activity`
  );
}
