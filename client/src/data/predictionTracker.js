/**
 * predictionTracker.js — Season-long prediction accuracy data.
 *
 * Tracks which prediction method (Projected Points vs Hex Score)
 * correctly called each week's matchup outcomes. Updated weekly.
 *
 * Each week tracks:
 *   - hexCorrect / projCorrect: league-wide correct picks out of total
 *   - userHex / userProj: user's personal matchup accuracy
 *   - upsetCount: matchups where the lower-ranked team won
 *   - hexUpsets / projUpsets: how many upsets each method caught
 *   - hexHighConf / projHighConf: games where method was >65% confident
 *   - hexHCRight / projHCRight: of high-conf picks, how many correct
 */

import { GAMES_PLAYED } from './seasonConfig';

export const PREDICTION_WEEKS = [
  { week: 1,  hexCorrect: 5, projCorrect: 4, total: 6, userHex: 'correct', userProj: 'correct', upsetCount: 2, hexUpsets: 2, projUpsets: 1, hexHighConf: 3, hexHCRight: 3, projHighConf: 3, projHCRight: 2 },
  { week: 2,  hexCorrect: 4, projCorrect: 5, total: 6, userHex: 'correct', userProj: 'wrong',   upsetCount: 1, hexUpsets: 1, projUpsets: 1, hexHighConf: 4, hexHCRight: 3, projHighConf: 3, projHCRight: 3 },
  { week: 3,  hexCorrect: 5, projCorrect: 3, total: 6, userHex: 'correct', userProj: 'correct', upsetCount: 3, hexUpsets: 3, projUpsets: 1, hexHighConf: 3, hexHCRight: 3, projHighConf: 2, projHCRight: 1 },
  { week: 4,  hexCorrect: 4, projCorrect: 4, total: 6, userHex: 'wrong',   userProj: 'correct', upsetCount: 2, hexUpsets: 1, projUpsets: 1, hexHighConf: 3, hexHCRight: 2, projHighConf: 3, projHCRight: 2 },
  { week: 5,  hexCorrect: 5, projCorrect: 4, total: 6, userHex: 'correct', userProj: 'correct', upsetCount: 2, hexUpsets: 2, projUpsets: 0, hexHighConf: 4, hexHCRight: 4, projHighConf: 3, projHCRight: 2 },
  { week: 6,  hexCorrect: 3, projCorrect: 4, total: 6, userHex: 'wrong',   userProj: 'wrong',   upsetCount: 3, hexUpsets: 1, projUpsets: 2, hexHighConf: 2, hexHCRight: 1, projHighConf: 2, projHCRight: 2 },
  { week: 7,  hexCorrect: 5, projCorrect: 3, total: 6, userHex: 'correct', userProj: 'wrong',   upsetCount: 2, hexUpsets: 2, projUpsets: 0, hexHighConf: 3, hexHCRight: 3, projHighConf: 3, projHCRight: 1 },
  { week: 8,  hexCorrect: 4, projCorrect: 4, total: 6, userHex: 'correct', userProj: 'correct', upsetCount: 1, hexUpsets: 1, projUpsets: 1, hexHighConf: 4, hexHCRight: 3, projHighConf: 3, projHCRight: 3 },
  { week: 9,  hexCorrect: 6, projCorrect: 4, total: 6, userHex: 'correct', userProj: 'correct', upsetCount: 2, hexUpsets: 2, projUpsets: 1, hexHighConf: 4, hexHCRight: 4, projHighConf: 2, projHCRight: 2 },
  { week: 10, hexCorrect: 4, projCorrect: 3, total: 6, userHex: 'correct', userProj: 'wrong',   upsetCount: 3, hexUpsets: 2, projUpsets: 1, hexHighConf: 3, hexHCRight: 2, projHighConf: 3, projHCRight: 1 },
  { week: 11, hexCorrect: 5, projCorrect: 5, total: 6, userHex: 'correct', userProj: 'correct', upsetCount: 1, hexUpsets: 1, projUpsets: 1, hexHighConf: 3, hexHCRight: 3, projHighConf: 3, projHCRight: 3 },
];

export function getPredictionStats() {
  const weeks = PREDICTION_WEEKS.slice(0, GAMES_PLAYED);
  const totalMatchups = weeks.reduce((s, w) => s + w.total, 0);
  const hexTotal = weeks.reduce((s, w) => s + w.hexCorrect, 0);
  const projTotal = weeks.reduce((s, w) => s + w.projCorrect, 0);
  const userHexCorrect = weeks.filter(w => w.userHex === 'correct').length;
  const userProjCorrect = weeks.filter(w => w.userProj === 'correct').length;

  // Running accuracy per week (cumulative)
  let hexRunning = 0, projRunning = 0, matchupsRunning = 0;
  let hexUpR = 0, projUpR = 0, upR = 0;
  let hexHC = 0, hexHCR = 0, projHC = 0, projHCR = 0;
  const cumulative = weeks.map(w => {
    hexRunning += w.hexCorrect;
    projRunning += w.projCorrect;
    matchupsRunning += w.total;
    hexUpR += w.hexUpsets;
    projUpR += w.projUpsets;
    upR += w.upsetCount;
    hexHC += w.hexHighConf;
    hexHCR += w.hexHCRight;
    projHC += w.projHighConf;
    projHCR += w.projHCRight;
    return {
      week: w.week,
      hexPct: (hexRunning / matchupsRunning) * 100,
      projPct: (projRunning / matchupsRunning) * 100,
      hexCorrect: w.hexCorrect,
      projCorrect: w.projCorrect,
      total: w.total,
      userHex: w.userHex,
      userProj: w.userProj,
      upsetCount: w.upsetCount,
      hexUpsets: w.hexUpsets,
      projUpsets: w.projUpsets,
    };
  });

  // Streak: consecutive weeks where one method outperformed the other
  let hexStreak = 0, projStreak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (hexStreak === weeks.length - 1 - i && weeks[i].hexCorrect > weeks[i].projCorrect) hexStreak++;
    if (projStreak === weeks.length - 1 - i && weeks[i].projCorrect > weeks[i].hexCorrect) projStreak++;
  }

  // Upset detection totals
  const totalUpsets = weeks.reduce((s, w) => s + w.upsetCount, 0);
  const hexUpsetsCaught = weeks.reduce((s, w) => s + w.hexUpsets, 0);
  const projUpsetsCaught = weeks.reduce((s, w) => s + w.projUpsets, 0);

  // Confidence calibration totals
  const hexHighConfTotal = hexHC;
  const hexHighConfCorrect = hexHCR;
  const projHighConfTotal = projHC;
  const projHighConfCorrect = projHCR;

  return {
    hexTotal,
    projTotal,
    totalMatchups,
    hexPct: (hexTotal / totalMatchups) * 100,
    projPct: (projTotal / totalMatchups) * 100,
    userHexCorrect,
    userProjCorrect,
    userTotal: weeks.length,
    userHexPct: (userHexCorrect / weeks.length) * 100,
    userProjPct: (userProjCorrect / weeks.length) * 100,
    leader: hexTotal > projTotal ? 'hex' : projTotal > hexTotal ? 'proj' : 'tied',
    gap: Math.abs(hexTotal - projTotal),
    cumulative,
    hexStreak,
    projStreak,
    weeksPlayed: weeks.length,
    // Upsets
    totalUpsets,
    hexUpsetsCaught,
    projUpsetsCaught,
    hexUpsetPct: totalUpsets > 0 ? (hexUpsetsCaught / totalUpsets) * 100 : 0,
    projUpsetPct: totalUpsets > 0 ? (projUpsetsCaught / totalUpsets) * 100 : 0,
    // Confidence
    hexHighConfTotal,
    hexHighConfCorrect,
    projHighConfTotal,
    projHighConfCorrect,
    hexCalibration: hexHighConfTotal > 0 ? (hexHighConfCorrect / hexHighConfTotal) * 100 : 0,
    projCalibration: projHighConfTotal > 0 ? (projHighConfCorrect / projHighConfTotal) * 100 : 0,
  };
}
