import React, { useState, useEffect } from 'react';
import { AuditFeed } from './AuditFeed';
import { WalletView } from './WalletView';
import { Simulator } from './Simulator';
import { Checkout } from './Checkout';

export default function App() {
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>yap-zzar</h1>
        <p style={styles.subtitle}>AI agents buy and sell on WhatsApp. You set the rules. We enforce them.</p>
      </header>

      <div style={styles.grid}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>💳 Razorpay Web Checkout</h2>
          <p style={styles.cardDesc}>Standard Checkout with HMAC verification</p>
          <Checkout />
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>🎯 Agent Simulator</h2>
          <p style={styles.cardDesc}>Trigger scenarios to see the gate in action</p>
          <Simulator />
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>💰 Wallets</h2>
          <p style={styles.cardDesc}>Real-time wallet balances</p>
          <WalletView />
        </section>
      </div>

      <section style={{ ...styles.card, marginTop: 24 }}>
        <h2 style={styles.cardTitle}>📋 Live Audit Feed</h2>
        <p style={styles.cardDesc}>Every gate decision in real-time</p>
        <AuditFeed />
      </section>

      <footer style={styles.footer}>
        <p>Built for Razorpay Hackathon · WhatsApp-native · Gemini AI · Test mode only</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#e4e4e7',
    background: '#09090b',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  subtitle: {
    color: '#71717a',
    fontSize: 14,
    marginTop: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: 20,
  },
  card: {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: 12,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    margin: '0 0 4px',
  },
  cardDesc: {
    fontSize: 13,
    color: '#71717a',
    margin: '0 0 16px',
  },
  footer: {
    textAlign: 'center',
    marginTop: 40,
    color: '#52525b',
    fontSize: 12,
  },
};
