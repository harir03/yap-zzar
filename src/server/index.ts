import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { db } from './db.js';
import { evaluateRequest, onAudit } from './gate/index.js';
import { handleRazorpayWebhook } from './razorpay/webhooks.js';
import { handleWhatsAppWebhook } from './whatsapp/router.js';
import { runGrowthPipeline } from './agent/pipeline.js';
import type { AuditEvent } from './gate/audit.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: 'yap-zzar', version: '1.0.0' });
});

// Gate endpoint — what agents call to request approval
app.post('/gate/evaluate', (req, res) => {
  const result = evaluateRequest(req.body);
  res.status(result.approved ? 200 : 403).json(result);
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
  └─────────────────────────────────────────┘
  `);
});

export { app };
