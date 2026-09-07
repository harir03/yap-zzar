/**
 * Buyer shopping scout — YouTube + multi-source review signals → ranked picks.
 * Gate stays out of this path (research only). Purchase still needs human confirm on WhatsApp.
 */
import { generateText } from './gemini.js';
import { config } from '../config.js';

export interface ScoutSource {
  kind: 'youtube' | 'review' | 'retail' | 'synthesis';
  title: string;
  url: string;
  snippet: string;
  scoreHint?: number;
}

export interface ScoutPick {
  rank: number;
  name: string;
  why: string;
  approxPriceInr?: string;
  matchScore: number; // 0-100
  pros: string[];
  cons: string[];
  sources: ScoutSource[];
}

export interface BuyScoutResult {
  query: string;
  needs: string;
  picks: ScoutPick[];
  youtube: ScoutSource[];
  disclaimer: string;
  mode: 'live' | 'demo';
}

function youtubeSearchUrl(q: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' review')}`;
}

/** YouTube Data API v3 when key present; otherwise structured demo seeds + Gemini ranking. */
async function fetchYouTubeReviews(query: string): Promise<ScoutSource[]> {
  const key = process.env.YOUTUBE_API_KEY || '';
  if (key) {
    try {
      const url =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=6&q=${encodeURIComponent(query + ' review India')}&key=${key}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`YouTube API ${res.status}`);
      const data = (await res.json()) as {
        items?: Array<{ id: { videoId: string }; snippet: { title: string; description: string; channelTitle: string } }>;
      };
      return (data.items ?? []).map((item) => ({
        kind: 'youtube' as const,
        title: `${item.snippet.title} — ${item.snippet.channelTitle}`,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        snippet: item.snippet.description.slice(0, 220),
      }));
    } catch (err) {
      console.warn('[buyScout] YouTube API failed, falling back:', err);
    }
  }

  // Deterministic demo sources (always available for hackathon / offline)
  const q = query.trim() || 'product';
  return [
    {
      kind: 'youtube',
      title: `${q} — in-depth review (India 2025)`,
      url: youtubeSearchUrl(q),
      snippet: `Search cluster: long-form reviews, battery/build/value for money angles for "${q}".`,
      scoreHint: 82,
    },
    {
      kind: 'youtube',
      title: `${q} vs alternatives — comparison`,
      url: youtubeSearchUrl(`${q} vs`),
      snippet: `Comparison videos covering mid-range rivals and common buyer regrets.`,
      scoreHint: 78,
    },
    {
      kind: 'youtube',
      title: `${q} — 30-day real usage`,
      url: youtubeSearchUrl(`${q} long term review`),
      snippet: `Durability, after-sales, and day-to-day friction from Indian reviewers.`,
      scoreHint: 75,
    },
  ];
}

async function fetchReviewSignals(query: string): Promise<ScoutSource[]> {
  const q = encodeURIComponent(query);
  return [
    {
      kind: 'review',
      title: `Reddit / forums — "${query}" experiences`,
      url: `https://www.reddit.com/search/?q=${q}`,
      snippet: 'Crowd sentiment: reliability complaints, hidden costs, “would buy again” patterns.',
    },
    {
      kind: 'retail',
      title: `Amazon.in listings — "${query}"`,
      url: `https://www.amazon.in/s?k=${q}`,
      snippet: 'Price bands, star distribution, recent 1★ themes (delivery/QC).',
    },
    {
      kind: 'retail',
      title: `Flipkart — "${query}"`,
      url: `https://www.flipkart.com/search?q=${q}`,
      snippet: 'Exchange offers, bank discounts, return friction notes.',
    },
  ];
}

function demoPicks(query: string, needs: string): ScoutPick[] {
  const base = query || 'option';
  return [
    {
      rank: 1,
      name: `${base} — Best overall match`,
      why: `Balances your needs (${needs || 'general use'}) with review consensus and value.`,
      approxPriceInr: 'Check live listings',
      matchScore: 91,
      pros: ['Strong review consensus', 'Good support footprint in India', 'Sensible price band'],
      cons: ['Popular SKU — verify seller'],
      sources: [],
    },
    {
      rank: 2,
      name: `${base} — Value pick`,
      why: 'Slightly fewer bells; reviewers praise reliability per rupee.',
      approxPriceInr: 'Usually lower tier',
      matchScore: 84,
      pros: ['Better ₹/perf', 'Fewer regret comments'],
      cons: ['Skips premium extras'],
      sources: [],
    },
    {
      rank: 3,
      name: `${base} — Premium / future-proof`,
      why: 'If budget stretches, this is what long-term reviewers keep.',
      approxPriceInr: 'Upper band',
      matchScore: 79,
      pros: ['Longevity', 'Better build'],
      cons: ['Overkill if budget-tight'],
      sources: [],
    },
  ];
}

export async function runBuyScout(query: string, needs = ''): Promise<BuyScoutResult> {
  const cleanQuery = query.trim().slice(0, 120);
  const cleanNeeds = needs.trim().slice(0, 240);
  const youtube = await fetchYouTubeReviews(cleanQuery);
  const reviews = await fetchReviewSignals(cleanQuery);
  const mode: 'live' | 'demo' = process.env.YOUTUBE_API_KEY && config.GEMINI_API_KEY ? 'live' : 'demo';

  let picks: ScoutPick[] = demoPicks(cleanQuery, cleanNeeds);

  if (config.GEMINI_API_KEY) {
    try {
      const prompt = `You are yap-zzar's shopping scout for Indian WhatsApp buyers.
User wants to buy: "${cleanQuery}"
Needs / constraints: "${cleanNeeds || 'not specified'}"

YouTube signals:
${youtube.map((y, i) => `${i + 1}. ${y.title} — ${y.snippet} (${y.url})`).join('\n')}

Other review/retail signals:
${reviews.map((r, i) => `${i + 1}. ${r.title} — ${r.snippet} (${r.url})`).join('\n')}

Return ONLY valid JSON (no markdown) with shape:
{"picks":[{"rank":1,"name":"string","why":"string","approxPriceInr":"string","matchScore":0-100,"pros":["..."],"cons":["..."]}]}
Give exactly 3 picks ranked for THIS user's needs. Prefer India price/availability. Be concrete, not hype.`;

      const raw = await generateText(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { picks: ScoutPick[] };
        if (Array.isArray(parsed.picks) && parsed.picks.length > 0) {
          picks = parsed.picks.slice(0, 3).map((p, idx) => ({
            ...p,
            rank: idx + 1,
            sources: [...youtube.slice(0, 2), ...reviews.slice(0, 1)],
            matchScore: Math.max(0, Math.min(100, Number(p.matchScore) || 70)),
            pros: p.pros ?? [],
            cons: p.cons ?? [],
          }));
        }
      }
    } catch (err) {
      console.warn('[buyScout] Gemini ranking failed, using demo picks:', err);
      picks = picks.map((p) => ({ ...p, sources: [...youtube.slice(0, 2), reviews[0]] }));
    }
  } else {
    picks = picks.map((p) => ({ ...p, sources: [...youtube.slice(0, 2), reviews[0]] }));
  }

  return {
    query: cleanQuery,
    needs: cleanNeeds,
    picks,
    youtube,
    disclaimer:
      'Research only — yap-zzar never auto-pays. Confirm on WhatsApp before any purchase. Sources may be search links when API keys are unset.',
    mode,
  };
}

export function formatScoutWhatsApp(result: BuyScoutResult): string {
  const lines = [
    `🛒 *Buy scout* — ${result.query}`,
    result.needs ? `Needs: ${result.needs}` : '',
    '',
    ...result.picks.map(
      (p) =>
        `*#${p.rank} ${p.name}* (${p.matchScore}/100)\n${p.why}\n💰 ${p.approxPriceInr ?? '—'}\n✅ ${p.pros.slice(0, 2).join(' · ')}\n⚠️ ${p.cons.slice(0, 1).join(' · ')}`,
    ),
    '',
    '📺 YouTube:',
    ...result.youtube.slice(0, 3).map((y) => `• ${y.title}\n  ${y.url}`),
    '',
    `_${result.disclaimer}_`,
    '',
    'Reply *buy confirm 1* when you want to proceed (human confirm — no auto-pay).',
  ].filter(Boolean);
  return lines.join('\n');
}
