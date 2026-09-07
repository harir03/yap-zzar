import React from 'react';
import { AuditFeed } from './AuditFeed';
import { WalletView } from './WalletView';
import { Simulator } from './Simulator';
import { Checkout } from './Checkout';
import { BuyScout } from './BuyScout';
import { WhatsAppPanel } from './WhatsAppPanel';
import { tokens, appShell, card, cardTitle, cardDesc } from './theme';

export default function App() {
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>yap-zzar</h1>
        <p style={styles.subtitle}>
          AI agents buy and sell on WhatsApp. You set the rules. We enforce them.
        </p>
      </header>

      <div style={styles.grid}>
        <section style={card}>
          <h2 style={cardTitle}>Razorpay Web Checkout</h2>
          <p style={cardDesc}>Standard Checkout with HMAC verification</p>
          <Checkout />
        </section>

        <section style={card}>
          <h2 style={cardTitle}>Agent Simulator</h2>
          <p style={cardDesc}>Trigger scenarios to see the gate in action</p>
          <Simulator />
        </section>

        <section style={card}>
          <h2 style={cardTitle}>Buy Scout</h2>
          <p style={cardDesc}>YouTube + reviews → ranked picks (research only)</p>
          <BuyScout />
        </section>

        <section style={card}>
          <h2 style={cardTitle}>WhatsApp</h2>
          <p style={cardDesc}>Link session via OpenWA QR</p>
          <WhatsAppPanel />
        </section>

        <section style={card}>
          <h2 style={cardTitle}>Wallets</h2>
          <p style={cardDesc}>Real-time wallet balances</p>
          <WalletView />
        </section>
      </div>

      <section style={{ ...card, marginTop: 24 }}>
        <h2 style={cardTitle}>Live Audit Feed</h2>
        <p style={cardDesc}>Every gate decision in real-time</p>
        <AuditFeed />
      </section>

      <footer style={styles.footer}>
        <p>Built for Razorpay Hackathon · WhatsApp-native · Gemini AI · Test mode only</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: appShell,
  header: { textAlign: 'center', marginBottom: 28 },
  title: {
    fontSize: 34,
    fontWeight: 750,
    letterSpacing: '-0.03em',
    margin: 0,
    color: tokens.text,
  },
  subtitle: {
    color: tokens.muted,
    fontSize: 14,
    marginTop: 6,
    lineHeight: 1.45,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: 18,
  },
  footer: {
    textAlign: 'center',
    marginTop: 36,
    color: tokens.muted,
    fontSize: 12,
    opacity: 0.85,
  },
};
