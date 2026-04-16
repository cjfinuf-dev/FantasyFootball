import { describe, it, expect } from 'vitest';
import { calcWinProb, getStarterIds, getStarterProjection, getHexWinProb } from './winProb';

// ─── calcWinProb ───

describe('calcWinProb', () => {
  it('returns 1 when game is over and home won', () => {
    expect(calcWinProb(120, 0, 100, 0)).toBe(1);
  });

  it('returns 0 when game is over and away won', () => {
    expect(calcWinProb(100, 0, 120, 0)).toBe(0);
  });

  it('returns 0.5 when game is over and tied', () => {
    expect(calcWinProb(100, 0, 100, 0)).toBe(0.5);
  });

  it('returns > 0.5 when home is projected to win', () => {
    const prob = calcWinProb(0, 130, 0, 100, 9, 9, 0);
    expect(prob).toBeGreaterThan(0.5);
  });

  it('returns < 0.5 when away is projected to win', () => {
    const prob = calcWinProb(0, 100, 0, 130, 9, 9, 0);
    expect(prob).toBeLessThan(0.5);
  });

  it('caps at 0.9999 max', () => {
    const prob = calcWinProb(0, 200, 0, 50, 1, 1, 10);
    expect(prob).toBeLessThanOrEqual(0.9999);
  });

  it('caps at 0.0001 min', () => {
    const prob = calcWinProb(0, 50, 0, 200, 1, 1, 10);
    expect(prob).toBeGreaterThanOrEqual(0.0001);
  });

  it('returns ~0.5 when both teams are equal', () => {
    const prob = calcWinProb(0, 110, 0, 110, 9, 9, 0);
    expect(prob).toBeCloseTo(0.5, 1);
  });

  it('uses varianceSum when provided (mid-game)', () => {
    // Mid-game (some actuals on the board) is when the variance model kicks in.
    const withVariance = calcWinProb(50, 60, 40, 60, 5, 5, 2000);
    const withoutVariance = calcWinProb(50, 60, 40, 60, 5, 5, 0);
    expect(withVariance).not.toBeCloseTo(withoutVariance, 3);
  });

  it('pre-game returns simple projection share', () => {
    // 8-point spread on ~120 total should yield modest favorite, not 90%+.
    expect(calcWinProb(0, 124, 0, 116, 9, 9, 800)).toBeCloseTo(124 / 240, 3);
    expect(calcWinProb(0, 70, 0, 70, 9, 9, 0)).toBeCloseTo(0.5, 3);
  });
});

// ─── getStarterIds ───

describe('getStarterIds', () => {
  const playerMap = {
    qb1: { pos: 'QB', proj: 20 },
    rb1: { pos: 'RB', proj: 18 },
    rb2: { pos: 'RB', proj: 14 },
    rb3: { pos: 'RB', proj: 10 },
    wr1: { pos: 'WR', proj: 22 },
    wr2: { pos: 'WR', proj: 16 },
    wr3: { pos: 'WR', proj: 8 },
    te1: { pos: 'TE', proj: 12 },
    k1:  { pos: 'K',  proj: 9 },
    def1:{ pos: 'DEF', proj: 7 },
  };
  const roster = Object.keys(playerMap);

  it('selects correct number of starters (9 + 1 flex = 10)', () => {
    const starters = getStarterIds(roster, playerMap);
    // QB:1 + RB:2 + WR:2 + TE:1 + K:1 + DEF:1 + FLEX:1 = 9
    expect(starters.length).toBe(9);
  });

  it('includes the top QB', () => {
    const starters = getStarterIds(roster, playerMap);
    expect(starters).toContain('qb1');
  });

  it('includes both top RBs', () => {
    const starters = getStarterIds(roster, playerMap);
    expect(starters).toContain('rb1');
    expect(starters).toContain('rb2');
  });

  it('fills FLEX with best remaining RB/WR/TE', () => {
    const starters = getStarterIds(roster, playerMap);
    // After filling slots: rb3 (10) or wr3 (8) should be flex
    // rb3 has higher proj, so it should be the flex
    expect(starters).toContain('rb3');
  });

  it('returns empty array for empty roster', () => {
    expect(getStarterIds([], playerMap)).toEqual([]);
  });
});

// ─── getStarterProjection ───

describe('getStarterProjection', () => {
  const playerMap = {
    qb1: { pos: 'QB', proj: 20 },
    rb1: { pos: 'RB', proj: 15 },
    rb2: { pos: 'RB', proj: 12 },
    wr1: { pos: 'WR', proj: 18 },
    wr2: { pos: 'WR', proj: 14 },
    te1: { pos: 'TE', proj: 10 },
    k1:  { pos: 'K',  proj: 8 },
    def1:{ pos: 'DEF', proj: 6 },
  };

  it('returns sum of starter projections', () => {
    const total = getStarterProjection(Object.keys(playerMap), playerMap);
    expect(total).toBeGreaterThan(0);
  });

  it('returns 0 for empty roster', () => {
    expect(getStarterProjection([], playerMap)).toBe(0);
  });

  it('returns 0 for null roster', () => {
    expect(getStarterProjection(null, playerMap)).toBe(0);
  });
});

// ─── getHexWinProb ───

describe('getHexWinProb', () => {
  const playerMap = {
    qb1: { pos: 'QB', proj: 20 },
    rb1: { pos: 'RB', proj: 15 },
    rb2: { pos: 'RB', proj: 12 },
    wr1: { pos: 'WR', proj: 18 },
    wr2: { pos: 'WR', proj: 14 },
    te1: { pos: 'TE', proj: 10 },
    k1:  { pos: 'K',  proj: 8 },
    def1:{ pos: 'DEF', proj: 6 },
  };
  const homeRoster = Object.keys(playerMap);
  const awayRoster = Object.keys(playerMap);

  it('returns 0.5 when both teams have identical hex scores', () => {
    const hexFn = () => 70;
    const prob = getHexWinProb(homeRoster, awayRoster, playerMap, hexFn);
    expect(prob).toBeCloseTo(0.5, 2);
  });

  it('returns > 0.5 when home has higher hex scores', () => {
    const hexFn = (pid) => homeRoster.includes(pid) ? 80 : 60;
    // Both rosters are the same IDs, so we need separate rosters
    const away2 = ['aqb1', 'arb1', 'arb2', 'awr1', 'awr2', 'ate1', 'ak1', 'adef1'];
    const pm2 = { ...playerMap };
    away2.forEach((id, i) => { pm2[id] = Object.values(playerMap)[i]; });
    const hexFn2 = (pid) => pid.startsWith('a') ? 60 : 80;
    const prob = getHexWinProb(homeRoster, away2, pm2, hexFn2);
    expect(prob).toBeGreaterThan(0.5);
  });

  it('returns 0.5 when rosters are empty', () => {
    const hexFn = () => 70;
    expect(getHexWinProb([], [], playerMap, hexFn)).toBe(0.5);
  });

  it('returns between 0.0001 and 0.9999', () => {
    const hexFn = () => 90;
    const prob = getHexWinProb(homeRoster, awayRoster, playerMap, hexFn);
    expect(prob).toBeGreaterThanOrEqual(0.0001);
    expect(prob).toBeLessThanOrEqual(0.9999);
  });

  it('returns simple share of total for hex averages', () => {
    const away2 = ['aqb1', 'arb1', 'arb2', 'awr1', 'awr2', 'ate1', 'ak1', 'adef1'];
    const pm2 = { ...playerMap };
    away2.forEach((id, i) => { pm2[id] = Object.values(playerMap)[i]; });
    const hexFn = (pid) => pid.startsWith('a') ? 65 : 70;
    const prob = getHexWinProb(homeRoster, away2, pm2, hexFn);
    // 70 / (70 + 65) ≈ 0.519
    expect(prob).toBeCloseTo(70 / 135, 3);
  });

  it('treats small hex spreads as near coin flips', () => {
    const away2 = ['aqb1', 'arb1', 'arb2', 'awr1', 'awr2', 'ate1', 'ak1', 'adef1'];
    const pm2 = { ...playerMap };
    away2.forEach((id, i) => { pm2[id] = Object.values(playerMap)[i]; });
    const hexFn = (pid) => pid.startsWith('a') ? 68.3 : 70;
    const prob = getHexWinProb(homeRoster, away2, pm2, hexFn);
    // 70 / (70 + 68.3) ≈ 0.506
    expect(prob).toBeCloseTo(70 / 138.3, 3);
    expect(prob).toBeLessThan(0.55);
  });
});
