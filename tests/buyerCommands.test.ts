import { describe, it, expect } from 'vitest';
import { parseBuyerCommand } from '../src/server/whatsapp/buyerCommands.js';

describe('parseBuyerCommand', () => {
  it('parses balance aliases', () => {
    expect(parseBuyerCommand('balance')).toEqual({ type: 'balance' });
    expect(parseBuyerCommand(' BAL ')).toEqual({ type: 'balance' });
  });

  it('parses load and withdraw amounts', () => {
    expect(parseBuyerCommand('load 1000')).toEqual({ type: 'load', rupees: 1000 });
    expect(parseBuyerCommand('withdraw 500')).toEqual({
      type: 'withdraw',
      rupees: 500,
    });
  });

  it('parses buy with needs', () => {
    expect(
      parseBuyerCommand('buy wireless earbuds needs: under 3k, good mic'),
    ).toEqual({
      type: 'buy',
      query: 'wireless earbuds',
      needs: 'under 3k, good mic',
    });
  });

  it('parses find/scout aliases without needs', () => {
    expect(parseBuyerCommand('find phone')).toEqual({
      type: 'buy',
      query: 'phone',
      needs: '',
    });
    expect(parseBuyerCommand('scout headphones')).toEqual({
      type: 'buy',
      query: 'headphones',
      needs: '',
    });
  });

  it('parses buy confirm ranks', () => {
    expect(parseBuyerCommand('buy confirm 2')).toEqual({
      type: 'buy_confirm',
      rank: 2,
    });
  });

  it('falls back to help', () => {
    expect(parseBuyerCommand('wat')).toEqual({ type: 'help' });
  });
});
