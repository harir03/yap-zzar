import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { db } from './db.js';
import { evaluateRequest, onAudit } from './gate/index.js';
import { handleRazorpayWebhook } from './razorpay/webhooks.js';
import { createOrderHandler, verifyPaymentHandler, getKeyIdHandler } from './razorpay/checkout.js';
import { handleWhatsAppWebhook } from './whatsapp/router.js';
import { runGrowthPipeline } from './agent/pipeline.js';
import { runBuyScout } from './agent/buyScout.js';
import type { AuditEvent } from './gate/audit.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: 'yap-zzar', version: '1.0.0' });
});

// Razorpay Standard Checkout endpoints
app.post('/api/create-order', createOrderHandler);
app.post('/create-order', createOrderHandler);
app.post('/api/verify-payment', verifyPaymentHandler);
app.post('/verify-payment', verifyPaymentHandler);
app.get('/api/razorpay-key', getKeyIdHandler);

// WhatsApp session & QR code endpoints
app.get('/api/whatsapp/qr', async (_req, res) => {
  try {
    const qrRes = await fetch(`${config.OPENWA_URL}/api/${config.OPENWA_SESSION}/auth/qr`, {
      headers: {
        ...(config.OPENWA_API_KEY ? { 'X-API-Key': config.OPENWA_API_KEY } : {}),
      },
    });
    if (!qrRes.ok) {
      res.status(qrRes.status).send('QR not available or session already connected');
      return;
    }
    res.setHeader('Content-Type', 'image/png');
    const arrayBuffer = await qrRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/whatsapp/status', async (_req, res) => {
  try {
    const statusRes = await fetch(`${config.OPENWA_URL}/api/sessions/${config.OPENWA_SESSION}`, {
      headers: {
        ...(config.OPENWA_API_KEY ? { 'X-API-Key': config.OPENWA_API_KEY } : {}),
      },
    });
    const data = await statusRes.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gate endpoint — what agents call to request approval
app.post('/gate/evaluate', (req, res) => {
  const result = evaluateRequest(req.body);
  res.status(result.approved ? 200 : 403).json(result);
});


// Buyer shopping scout — YouTube + reviews → ranked picks (research only)
app.post('/api/buy-scout', async (req, res) => {
  const query = String(req.body?.query ?? '').trim();
  const needs = String(req.body?.needs ?? '').trim();
  if (!query) { res.status(400).json({ error: 'query required' }); return; }
  try {
    const result = await runBuyScout(query, needs);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'scout failed' });
  }
});

app.get('/api/buy-scout', async (req, res) => {
  const query = String(req.query.query ?? '').trim();
  const needs = String(req.query.needs ?? '').trim();
  if (!query) { res.status(400).json({ error: 'query required' }); return; }
  try {
    const result = await runBuyScout(query, needs);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'scout failed' });
  }
});

// Run the growth pipeline for a merchant (dashboard trigger)
app.post('/agent/run', async (req, res) => {
  const { merchant_id } = req.body;
  if (!merchant_id) { res.status(400).json({ error: 'merchant_id required' }); return; }
  const result = await runGrowthPipeline(merchant_id);
  res.json(result);
});

// Razorpay webhook
app.post('/webhook/razorpay', handleRazorpayWebhook);

// WhatsApp webhook (OpenWA)
app.post('/webhook/whatsapp', handleWhatsAppWebhook);

// Dashboard data endpoints
app.get('/wallets', (_req, res) => {
  const wallets = db.prepare('SELECT * FROM wallets').all();
  res.json(wallets);
});

app.get('/audit', (_req, res) => {
  const entries = db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 50').all();
  res.json(entries);
});

// SSE for live audit feed (dashboard)
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write('data: {"type":"connected"}\n\n');

  const unsub = onAudit((entry: AuditEvent) => {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  });

  req.on('close', unsub);
});

app.listen(config.PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │                                         │
  │   yap-zzar is running                   │
  │                                         │
  │   API:      http://localhost:${config.PORT}     │
  │   Health:   http://localhost:${config.PORT}/health │
  │   Mode:     ${config.NODE_ENV.padEnd(24)}│
  │                                         │
  │                                         │
  └─────────────────────────────────────────┘
  `);
});

export { app };
