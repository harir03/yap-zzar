import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/server/config.js', () => ({
  config: {
    PORT: 3001,
    NODE_ENV: 'test',
    RAZORPAY_KEY_ID: 'rzp_test',
    RAZORPAY_KEY_SECRET: 'secret',
    OPENWA_URL: 'http://localhost:2785',
    OPENWA_API_KEY: '',
    OPENWA_SESSION: 'test',
    GEMINI_API_KEY: '',
    YOUTUBE_API_KEY: '',
    DATABASE_PATH: ':memory:',
  },
}));

vi.mock('../src/server/agent/gemini.js', () => ({
  generateText: vi.fn(),
}));

const { runBuyScout, formatScoutWhatsApp } = await import('../src/server/agent/buyScout.js');

describe('runBuyScout', () => {
  beforeEach(() => {
    delete process.env.YOUTUBE_API_KEY;
  });

  it('returns demo picks with youtube sources when no API keys', async () => {
    const result = await runBuyScout('wireless earbuds', 'under 3k');

    expect(result.query).toBe('wireless earbuds');
    expect(result.needs).toBe('under 3k');
    expect(result.mode).toBe('demo');
    expect(result.picks).toHaveLength(3);
    expect(result.picks[0].rank).toBe(1);
    expect(result.picks[0].matchScore).toBeGreaterThan(0);
    expect(result.youtube.length).toBeGreaterThan(0);
    expect(result.youtube[0].kind).toBe('youtube');
    expect(result.youtube[0].url).toContain('youtube.com');
    expect(result.disclaimer).toMatch(/Research only/i);
  });

  it('trims long query and needs', async () => {
    const longQ = 'x'.repeat(200);
    const longN = 'y'.repeat(400);
    const result = await runBuyScout(longQ, longN);
    expect(result.query.length).toBeLessThanOrEqual(120);
    expect(result.needs.length).toBeLessThanOrEqual(240);
  });

  it('formatScoutWhatsApp includes ranks and youtube', async () => {
    const result = await runBuyScout('phone', 'camera');
    const text = formatScoutWhatsApp(result);
    expect(text).toContain('Buy scout');
    expect(text).toContain('#1');
    expect(text).toContain('YouTube');
    expect(text).toContain('buy confirm');
  });
});
