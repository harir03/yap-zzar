<p align="center">
  <img src="https://em-content.zobj.net/source/apple/391/speech-balloon_1f4ac.png" width="80" />
</p>

<h1 align="center">yap-zzar</h1>

<p align="center">
  <em>AI agents that buy and sell — right inside WhatsApp.</em><br/>
  <em>You set the rules. We enforce them. Every rupee is accounted for.</em>
</p>

<p align="center">
  <strong>Live demo:</strong> <a href="https://yap-zzar.vercel.app">yap-zzar.vercel.app</a><br/>
  <strong>Buy scout:</strong> YouTube + review signals → ranked picks (research only — never auto-pays)
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-WhatsApp-25D366?style=flat-square&logo=whatsapp&logoColor=white" />
  <img src="https://img.shields.io/badge/payments-Razorpay_Test-0C2451?style=flat-square&logo=razorpay&logoColor=white" />
  <img src="https://img.shields.io/badge/ai-Gemini_2.5-4285F4?style=flat-square&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/lang-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
</p>

---

## Buy scout (live on the dashboard)

Rank shopping picks from **YouTube + review/retail signals**, then confirm on WhatsApp.

| | |
| :--- | :--- |
| **Dashboard** | Buy Scout panel → `POST /api/buy-scout` |
| **WhatsApp** | `buy <thing> needs: ...` then `buy confirm 1` |
| **Safety** | Research only — **never auto-pays** |
| **Demo** | [yap-zzar.vercel.app](https://yap-zzar.vercel.app) |

Optional: `YOUTUBE_API_KEY` for live YouTube Data API v3 (demo mode works without it).

---

## The Problem

AI agents are getting good at finding things, recommending things, even negotiating.
But the moment they need to **spend money** — everything breaks.

The global solutions assume credit cards and US banking. That doesn't work in India where **70% of payments are UPI** and the average ticket size is ₹200, not $200.

So we built yap-zzar.

---

## The Idea

What if your AI agent had its own **pocket money**?

You load ₹5,000 into a wallet. You set the rules — max ₹200 per discount, only for customers who've ordered twice before, no more than 10 offers an hour. Then you go to sleep.

The AI finds lapsed customers, writes them a personalized WhatsApp message in Hindi-English, and sends a discount. If it tries to break the rules — overspend, target a first-timer, inject a prompt — it gets blocked. Not by another AI. By **math**.

```
One rule: if it can't be done in a WhatsApp chat, we don't build it.
```

---

## Two Sides, One Chat App

| | Buyer | Merchant |
| :--- | :--- | :--- |
| **Wallet** | Personal pocket money | Campaign budget |
| **AI does** | Finds deals, compares prices | Finds lapsed customers, writes offers |
| **Human does** | Confirms purchase on WhatsApp | Sets rules, loads budget, sleeps |
| **Safety** | 30-min hold → auto-refund | RFM gating, budget cap, velocity limit |

---

## The Gate

This is the actual product. Everything else is plumbing.

The gate sits between the AI and the money. The AI proposes, the gate decides. No AI model has write access to any wallet. Ever.

**8 checks. All deterministic. Zero AI in the money path.** Sanitize → Idempotency → RFM → Policy → Anomaly → Lease.

---

## Quick Start

```bash
git clone https://github.com/harir03/yap-zzar.git
cd yap-zzar
npm install
cp .env.example .env
npm run dev          # server (3001) + dashboard (5173)
npm test
```

Live demo dashboard: https://yap-zzar.vercel.app

---

## Stack

WhatsApp (OpenWA) · Razorpay Test · Gemini 2.5 Flash · SQLite · Express + TypeScript · Zod · Vitest

---

<p align="center">
  <em>Built for the Razorpay Hackathon 2025</em><br/>
  <strong>yap-zzar</strong> — because the best UI is no UI.
</p>
