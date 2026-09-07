/**
 * Pure buyer WhatsApp command parsing (no I/O) — unit-tested.
 */

export type BuyerCommand =
  | { type: 'balance' }
  | { type: 'history' }
  | { type: 'help' }
  | { type: 'load'; rupees: number }
  | { type: 'withdraw'; rupees: number }
  | { type: 'buy'; query: string; needs: string }
  | { type: 'buy_confirm'; rank: 1 | 2 | 3 };

export function parseBuyerCommand(body: string): BuyerCommand {
  const raw = body.trim();
  const cmd = raw.toLowerCase();

  if (cmd === 'balance' || cmd === 'bal') return { type: 'balance' };
  if (cmd === 'history') return { type: 'history' };

  const loadMatch = cmd.match(/^load\s+(\d+)$/);
  if (loadMatch) return { type: 'load', rupees: parseInt(loadMatch[1], 10) };

  const withdrawMatch = cmd.match(/^withdraw\s+(\d+)$/);
  if (withdrawMatch) {
    return { type: 'withdraw', rupees: parseInt(withdrawMatch[1], 10) };
  }

  const confirmMatch = cmd.match(/^buy\s+confirm\s+([123])$/);
  if (confirmMatch) {
    return { type: 'buy_confirm', rank: Number(confirmMatch[1]) as 1 | 2 | 3 };
  }

  const buyMatch = raw.match(/^(?:buy|find|scout)\s+(.+)$/i);
  if (buyMatch) {
    const rest = buyMatch[1].trim();
    const needsSplit = rest.split(/\bneeds?:\s*/i);
    return {
      type: 'buy',
      query: needsSplit[0].trim(),
      needs: needsSplit[1]?.trim() ?? '',
    };
  }

  return { type: 'help' };
}
