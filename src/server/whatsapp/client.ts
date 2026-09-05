import { config } from '../config.js';

const baseUrl = `${config.OPENWA_URL}/api/sessions/${config.OPENWA_SESSION}`;

async function openwaFetch(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.OPENWA_API_KEY ? { 'X-API-Key': config.OPENWA_API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`OpenWA error ${res.status}: ${text}`);
  }
  return res;
}

// Format Indian phone to WhatsApp JID
function toJid(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const withCountry = digits.startsWith('91') ? digits : `91${digits}`;
  return `${withCountry}@c.us`;
}

export async function sendText(phone: string, text: string) {
  return openwaFetch('/messages/send', { to: toJid(phone), text });
}

export async function sendButtons(phone: string, text: string, buttons: Array<{ id: string; text: string }>) {
  // ponytail: OpenWA supports buttons via the standard send endpoint
  return openwaFetch('/messages/send', {
    to: toJid(phone),
    text,
    buttons: buttons.map(b => ({ id: b.id, text: b.text })),
  });
}

export async function sendPaymentLink(phone: string, description: string, url: string) {
  return sendText(phone, `${description}\n\n💳 Pay here: ${url}`);
}
