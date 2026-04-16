import { describe, it, expect } from 'vitest';
import { getPredictionStats, PREDICTION_WEEKS } from './predictionTracker';

describe('getPredictionStats', () => {
  const stats = getPredictionStats();

  it('returns correct total matchups (6 per week * 11 weeks)', () => {
    expect(stats.totalMatchups).toBe(66);
  });

  it('hex and proj totals match sum of weekly data', () => {
    const expectedHex = PREDICTION_WEEKS.reduce((s, w) => s + w.hexCorrect, 0);
    const expectedProj = PREDICTION_WEEKS.reduce((s, w) => s + w.projCorrect, 0);
    expect(stats.hexTotal).toBe(expectedHex);
    expect(stats.projTotal).toBe(expectedProj);
  });

  it('percentages are mathematically correct', () => {
    expect(stats.hexPct).toBeCloseTo((stats.hexTotal / stats.totalMatchups) * 100, 5);
    expect(stats.projPct).toBeCloseTo((stats.projTotal / stats.totalMatchups) * 100, 5);
  });

  it('percentages are in valid range (0-100)', () => {
    expect(stats.hexPct).toBeGreaterThanOrEqual(0);
    expect(stats.hexPct).toBeLessThanOrEqual(100);
    expect(stats.projPct).toBeGreaterThanOrEqual(0);
    expect(stats.projPct).toBeLessThanOrEqual(100);
  });

  it('leader matches whichever method has more correct picks', () => {
    if (stats.hexTotal > stats.projTotal) expect(stats.leader).toBe('hex');
    else if (stats.projTotal > stats.hexTotal) expect(stats.leader).toBe('proj');
    else expect(stats.leader).toBe('tied');
  });

  it('gap equals absolute difference between totals', () => {
    expect(stats.gap).toBe(Math.abs(stats.hexTotal - stats.projTotal));
  });

  it('cumulative array has one entry per week', () => {
    expect(stats.cumulative.length).toBe(stats.weeksPlayed);
  });

  it('cumulative accuracy is monotonically recalculated', () => {
    let hexRunning = 0, projRunning = 0, total = 0;
    for (const w of stats.cumulative) {
      hexRunning += w.hexCorrect;
      projRunning += w.projCorrect;
      total += w.total;
      expect(w.hexPct).toBeCloseTo((hexRunning / total) * 100, 5);
      expect(w.projPct).toBeCloseTo((projRunning / total) * 100, 5);
    }
  });

  it('user accuracy counts match filtered weeks', () => {
    const expectedUserHex = PREDICTION_WEEKS.filter(w => w.userHex === 'correct').length;
    const expectedUserProj = PREDICTION_WEEKS.filter(w => w.userProj === 'correct').length;
    expect(stats.userHexCorrect).toBe(expectedUserHex);
    expect(stats.userProjCorrect).toBe(expectedUserProj);
  });

  it('upset totals sum correctly', () => {
    const expectedUpsets = PREDICTION_WEEKS.reduce((s, w) => s + w.upsetCount, 0);
    const expectedHexUpsets = PREDICTION_WEEKS.reduce((s, w) => s + w.hexUpsets, 0);
    const expectedProjUpsets = PREDICTION_WEEKS.reduce((s, w) => s + w.projUpsets, 0);
    expect(stats.totalUpsets).toBe(expectedUpsets);
    expect(stats.hexUpsetsCaught).toBe(expectedHexUpsets);
    expect(stats.projUpsetsCaught).toBe(expectedProjUpsets);
  });

  it('upset percentages are correct', () => {
    expect(stats.hexUpsetPct).toBeCloseTo((stats.hexUpsetsCaught / stats.totalUpsets) * 100, 5);
    expect(stats.projUpsetPct).toBeCloseTo((stats.projUpsetsCaught / stats.totalUpsets) * 100, 5);
  });

  it('confidence calibration totals sum correctly', () => {
    const expectedHexHC = PREDICTION_WEEKS.reduce((s, w) => s + w.hexHighConf, 0);
    const expectedHexHCR = PREDICTION_WEEKS.reduce((s, w) => s + w.hexHCRight, 0);
    expect(stats.hexHighConfTotal).toBe(expectedHexHC);
    expect(stats.hexHighConfCorrect).toBe(expectedHexHCR);
  });

  it('calibration percentages are correct', () => {
    expect(stats.hexCalibration).toBeCloseTo((stats.hexHighConfCorrect / stats.hexHighConfTotal) * 100, 5);
    expect(stats.projCalibration).toBeCloseTo((stats.projHighConfCorrect / stats.projHighConfTotal) * 100, 5);
  });

  it('no week has more correct picks than total matchups', () => {
    for (const w of PREDICTION_WEEKS) {
      expect(w.hexCorrect).toBeLessThanOrEqual(w.total);
      expect(w.projCorrect).toBeLessThanOrEqual(w.total);
      expect(w.hexUpsets).toBeLessThanOrEqual(w.upsetCount);
      expect(w.projUpsets).toBeLessThanOrEqual(w.upsetCount);
    }
  });
});
