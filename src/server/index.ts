import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import './db.js'; // ponytail: import for side-effect (runs migrations)

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: 'yap-zzar', version: '1.0.0' });
});

// Webhook stubs — filled in Phase 3 and 4
app.post('/webhook/razorpay', (_req, res) => {
  res.json({ received: true });
});

app.post('/webhook/whatsapp', (_req, res) => {
  res.json({ received: true });
});

// SSE endpoint stub — filled in Phase 6
app.get('/events', (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write('data: {"type":"connected"}\n\n');
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
