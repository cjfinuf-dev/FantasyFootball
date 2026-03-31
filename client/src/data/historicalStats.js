/**
 * Historical Stats — 3-Year Player Production Data
 *
 * Generated algorithmically from current player data with manual overrides
 * for known breakout/decline/injury trajectories.
 *
 * Weighted production: (2025 * 0.60) + (2024 * 0.30) + (2023 * 0.10)
 * Rookies with 1 season: 100% that season
 * Players with 2 seasons: 60% recent, 40% prior
 */

import { PLAYERS } from './players';

// Deterministic pseudo-random from player ID (consistent across runs)
function seedRand(id) {
  let hash = 0;
  const str = id + 'hex';
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return () => {
    hash = (hash * 16807 + 0) % 2147483647;
    return (hash % 10000) / 10000;
  };
}

// ─── Manual overrides for known trajectories ───
// Format: playerId → { s2024Mult, s2023Mult, rookieYear }
// Multipliers are applied to the generated averages
const OVERRIDES = {
  // Breakout players (2024/2023 much lower)
  p6:   { s2024Mult: 0.55, s2023Mult: 0.0, rookieYear: 2024 },  // CJ Stroud — rookie 2024
  p11:  { s2024Mult: 0.70, s2023Mult: 0.0, rookieYear: 2024 },  // Jahmyr Gibbs — rookie 2024
  p26:  { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Sam LaPorta — rookie 2025 in our data
  p49:  { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Jayden Daniels — rookie 2025
  p52:  { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Bo Nix — rookie 2025
  p59:  { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Caleb Williams — rookie 2025
  p116: { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Brian Thomas Jr.
  p120: { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Malik Nabers
  p121: { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Ladd McConkey
  p143: { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Jayden Reed
  p151: { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Marvin Harrison Jr.
  p152: { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Xavier Worthy
  p153: { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Rome Odunze
  p162: { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Brock Bowers
  p70:  { s2024Mult: 0.50, s2023Mult: 0.0, rookieYear: 2024 },  // Chase Brown
  p71:  { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Bucky Irving
  p221: { s2024Mult: 0.0,  s2023Mult: 0.0, rookieYear: 2025 },  // Drake Maye
  p222: { s2024Mult: 0.45, s2023Mult: 0.0, rookieYear: 2024 },  // Anthony Richardson
  p253: { rookieYear: 2026 }, // Shedeur Sanders — not yet in NFL
  p254: { rookieYear: 2026 }, // Cam Ward
  p255: { rookieYear: 2026 }, // Jaxson Dart

  // Declining players (2023 was their peak)
  p61:  { s2024Mult: 0.40, s2023Mult: 1.30 },  // Aaron Rodgers — pre-Achilles was elite
  p25:  { s2024Mult: 1.05, s2023Mult: 1.25 },  // Travis Kelce — gradual age decline
  p19:  { s2024Mult: 1.10, s2023Mult: 1.20 },  // Davante Adams — declining with bad QB
  p131: { s2024Mult: 1.08, s2023Mult: 1.18 },  // Keenan Allen — age curve
  p135: { s2024Mult: 1.05, s2023Mult: 1.15 },  // Tyler Lockett — aging out
  p156: { s2024Mult: 1.10, s2023Mult: 1.25 },  // Adam Thielen — aging
  p72:  { s2024Mult: 1.08, s2023Mult: 1.15 },  // Alvin Kamara — age decline

  // Injury recovery (2024 was suppressed)
  p82:  { s2024Mult: 0.15, s2023Mult: 1.40 },  // Nick Chubb — devastating knee, was elite
  p226: { s2024Mult: 0.10, s2023Mult: 0.40 },  // Deshaun Watson — Achilles + suspension
  p28:  { s2024Mult: 0.25, s2023Mult: 1.20 },  // TJ Hockenson — second ACL
  p5:   { s2024Mult: 0.65, s2023Mult: 1.10 },  // Joe Burrow — wrist recovery season
  p57:  { s2024Mult: 0.60, s2023Mult: 1.05 },  // Jordan Love — MCL
  p7:   { s2024Mult: 0.55, s2023Mult: 1.15 },  // CMC — missed significant time
  p40:  { s2024Mult: 0.50, s2023Mult: 0.85 },  // Puka Nacua — PCL, limited rookie yr
  p84:  { s2024Mult: 0.50, s2023Mult: 1.20 },  // Javonte Williams — ACL recovery
  p139: { s2024Mult: 0.55, s2023Mult: 1.10 },  // Brandon Aiyuk — ACL

  // Steady producers (minor variance)
  p1:   { s2024Mult: 0.98, s2023Mult: 0.96 },  // Mahomes — consistent elite
  p2:   { s2024Mult: 0.97, s2023Mult: 0.95 },  // Josh Allen
  p3:   { s2024Mult: 0.95, s2023Mult: 0.90 },  // Lamar Jackson
  p9:   { s2024Mult: 0.88, s2023Mult: 0.0, rookieYear: 2024 }, // Bijan Robinson — rookie 2024
  p10:  { s2024Mult: 1.05, s2023Mult: 0.85 },  // Saquon — bounce back year
  p13:  { s2024Mult: 0.95, s2023Mult: 0.92 },  // Derrick Henry — remarkably consistent
  p15:  { s2024Mult: 1.02, s2023Mult: 0.98 },  // Tyreek Hill
  p16:  { s2024Mult: 0.92, s2023Mult: 0.85 },  // CeeDee Lamb — breakout trajectory
  p18:  { s2024Mult: 0.90, s2023Mult: 0.75 },  // Amon-Ra — rapid ascent
  p115: { s2024Mult: 0.80, s2023Mult: 0.95 },  // Justin Jefferson — injury-suppressed 2024
};

// ─── Generate historical stats for all players ───

function generateHistoricalStats() {
  const stats = {};

  PLAYERS.forEach(player => {
    const rand = seedRand(player.id);
    const override = OVERRIDES[player.id] || {};

    // 2025 season (current)
    const gp2025 = Math.min(17, Math.max(8, Math.round(14 + rand() * 6)));
    const s2025 = {
      gamesPlayed: gp2025,
      totalPts: Math.round(player.avg * gp2025 * 10) / 10,
      avgPts: player.avg,
    };

    // Check if player is a rookie or future draft pick
    if (override.rookieYear === 2026) {
      // Not yet in NFL — no historical data
      stats[player.id] = { 2025: { gamesPlayed: 0, totalPts: 0, avgPts: 0 } };
      return;
    }

    if (override.rookieYear === 2025) {
      // First-year player — only 2025 data
      stats[player.id] = { 2025: s2025 };
      return;
    }

    // 2024 season
    let avg2024;
    if (override.s2024Mult !== undefined) {
      avg2024 = player.avg * override.s2024Mult;
    } else {
      // Derive from trend signal + random variance
      const trendFactor = player.avg > 0 ? (player.proj - player.avg) / player.avg : 0;
      avg2024 = player.avg * (1 - trendFactor * 0.4) * (0.88 + rand() * 0.24);
    }
    avg2024 = Math.max(0, Math.round(avg2024 * 10) / 10);
    const gp2024 = Math.min(17, Math.max(6, Math.round(12 + rand() * 8)));

    if (override.rookieYear === 2024) {
      // Second-year player — 2025 + 2024 data
      stats[player.id] = {
        2025: s2025,
        2024: { gamesPlayed: gp2024, totalPts: Math.round(avg2024 * gp2024 * 10) / 10, avgPts: avg2024 },
      };
      return;
    }

    // 2023 season
    let avg2023;
    if (override.s2023Mult !== undefined) {
      avg2023 = player.avg * override.s2023Mult;
    } else {
      avg2023 = avg2024 * (0.82 + rand() * 0.36);
    }
    avg2023 = Math.max(0, Math.round(avg2023 * 10) / 10);
    const gp2023 = Math.min(17, Math.max(6, Math.round(11 + rand() * 10)));

    stats[player.id] = {
      2025: s2025,
      2024: { gamesPlayed: gp2024, totalPts: Math.round(avg2024 * gp2024 * 10) / 10, avgPts: avg2024 },
      2023: { gamesPlayed: gp2023, totalPts: Math.round(avg2023 * gp2023 * 10) / 10, avgPts: avg2023 },
    };
  });

  return stats;
}

export const HISTORICAL_STATS = generateHistoricalStats();

/**
 * Compute weighted historical production for a player.
 * Weights: 60% last season, 30% 2 seasons ago, 10% 3 seasons ago.
 * Adapts to available data (rookies get full weight on available seasons).
 */
export function getWeightedProduction(playerId) {
  const history = HISTORICAL_STATS[playerId];
  if (!history) return 0;

  const s2025 = history[2025]?.avgPts || 0;
  const s2024 = history[2024]?.avgPts;
  const s2023 = history[2023]?.avgPts;

  // 3 seasons available
  if (s2024 !== undefined && s2023 !== undefined) {
    return (s2025 * 0.60) + (s2024 * 0.30) + (s2023 * 0.10);
  }

  // 2 seasons available
  if (s2024 !== undefined) {
    return (s2025 * 0.60) + (s2024 * 0.40);
  }

  // 1 season only (rookie)
  return s2025;
}
