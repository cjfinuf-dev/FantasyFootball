import { describe, it, expect, beforeEach } from 'vitest';
import { gameState, clearGameState } from '../data/gameState';
import { computeLiveTeamScore, isPlayerActive } from './liveScoring';

const PLAYER_MAP = {
  p1: { id: 'p1', name: 'A', pos: 'QB', proj: 20 },
  p2: { id: 'p2', name: 'B', pos: 'RB', proj: 15 },
  p3: { id: 'p3', name: 'C', pos: 'WR', proj: 10 },
};

describe('computeLiveTeamScore', () => {
  beforeEach(() => clearGameState());

  it('returns pure projections when no gameState (pre-game)', () => {
    const r = computeLiveTeamScore(['p1', 'p2', 'p3'], PLAYER_MAP);
    expect(r.actual).toBe(0);
    expect(r.projected).toBe(45);
    expect(r.playing).toBe(0);
    expect(r.final).toBe(0);
    expect(r.scheduled).toBe(3);
  });

  it('mixes actual + remaining when a player is playing', () => {
    gameState.p1 = { status: 'playing', actual: 12 };
    const r = computeLiveTeamScore(['p1', 'p2', 'p3'], PLAYER_MAP);
    expect(r.actual).toBe(12);
    // p1: actual 12 + remaining (20-12)=8; p2: 15 proj; p3: 10 proj
    expect(r.projected).toBe(12 + 8 + 15 + 10);
    expect(r.playing).toBe(1);
    expect(r.scheduled).toBe(2);
  });

  it('locks final points without any remaining contribution', () => {
    gameState.p1 = { status: 'final', actual: 28 };
    const r = computeLiveTeamScore(['p1', 'p2', 'p3'], PLAYER_MAP);
    expect(r.actual).toBe(28);
    expect(r.final).toBe(1);
    // p1 locked at 28; p2 15 proj; p3 10 proj
    expect(r.projected).toBe(28 + 15 + 10);
  });

  it('ignores players missing from the player map', () => {
    const r = computeLiveTeamScore(['p1', 'unknown'], PLAYER_MAP);
    expect(r.projected).toBe(20);
  });

  it('treats bye players as zero contribution', () => {
    gameState.p1 = { status: 'bye', actual: 0 };
    const r = computeLiveTeamScore(['p1', 'p2'], PLAYER_MAP);
    // p1 bye = 0; p2 = 15 proj
    expect(r.projected).toBe(15);
    expect(r.playing).toBe(0);
    expect(r.final).toBe(0);
    expect(r.scheduled).toBe(1); // only p2 is counted as scheduled; bye is its own state
  });
});

describe('isPlayerActive', () => {
  beforeEach(() => clearGameState());

  it('returns false when gameState is empty', () => {
    expect(isPlayerActive('p1')).toBe(false);
  });

  it('returns true for playing status', () => {
    gameState.p1 = { status: 'playing', actual: 5 };
    expect(isPlayerActive('p1')).toBe(true);
  });

  it('returns false for final status', () => {
    gameState.p1 = { status: 'final', actual: 18 };
    expect(isPlayerActive('p1')).toBe(false);
  });
});
