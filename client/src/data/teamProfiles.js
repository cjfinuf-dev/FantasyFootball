/**
 * NFL Team Offense Profiles — 2025 Season
 *
 * Each profile captures the offensive context that affects player fantasy value.
 * Used by the HexScore Situation Score dimension.
 *
 * schemeType: primary offensive identity
 * passRate/rushRate: play-calling tendencies (should sum to ~1.0)
 * passEfficiency: composite (completion%, yards/att, TD rate) — 0-1 scale
 * rushEfficiency: composite (yards/carry, success rate) — 0-1 scale
 * oLineRank: 1 = best, 32 = worst
 * tempoScore: plays/game relative to league avg (1.0 = average)
 * qbRating: QB quality for passing game dependency — 0-1 scale
 * teUsage: how heavily the scheme utilizes tight ends
 */

export const TEAM_PROFILES = {
  KC:  { schemeType: 'west-coast',  passRate: 0.58, rushRate: 0.42, passEfficiency: 0.90, rushEfficiency: 0.78, oLineRank: 6,  tempoScore: 0.98, qbRating: 0.95, teUsage: 'high' },
  BUF: { schemeType: 'spread',      passRate: 0.57, rushRate: 0.43, passEfficiency: 0.88, rushEfficiency: 0.82, oLineRank: 10, tempoScore: 1.02, qbRating: 0.93, teUsage: 'medium' },
  BAL: { schemeType: 'rpo',         passRate: 0.47, rushRate: 0.53, passEfficiency: 0.85, rushEfficiency: 0.92, oLineRank: 4,  tempoScore: 0.95, qbRating: 0.92, teUsage: 'high' },
  PHI: { schemeType: 'rpo',         passRate: 0.50, rushRate: 0.50, passEfficiency: 0.82, rushEfficiency: 0.88, oLineRank: 2,  tempoScore: 0.96, qbRating: 0.85, teUsage: 'medium' },
  CIN: { schemeType: 'west-coast',  passRate: 0.60, rushRate: 0.40, passEfficiency: 0.86, rushEfficiency: 0.72, oLineRank: 18, tempoScore: 0.97, qbRating: 0.88, teUsage: 'low' },
  HOU: { schemeType: 'spread',      passRate: 0.58, rushRate: 0.42, passEfficiency: 0.83, rushEfficiency: 0.76, oLineRank: 14, tempoScore: 1.00, qbRating: 0.82, teUsage: 'medium' },
  SF:  { schemeType: 'zone-run',    passRate: 0.50, rushRate: 0.50, passEfficiency: 0.84, rushEfficiency: 0.88, oLineRank: 3,  tempoScore: 0.99, qbRating: 0.78, teUsage: 'high' },
  DET: { schemeType: 'balanced',    passRate: 0.54, rushRate: 0.46, passEfficiency: 0.85, rushEfficiency: 0.84, oLineRank: 5,  tempoScore: 1.06, qbRating: 0.80, teUsage: 'high' },
  DAL: { schemeType: 'west-coast',  passRate: 0.57, rushRate: 0.43, passEfficiency: 0.80, rushEfficiency: 0.74, oLineRank: 12, tempoScore: 0.95, qbRating: 0.78, teUsage: 'medium' },
  MIA: { schemeType: 'spread',      passRate: 0.60, rushRate: 0.40, passEfficiency: 0.82, rushEfficiency: 0.70, oLineRank: 16, tempoScore: 1.05, qbRating: 0.72, teUsage: 'low' },
  ATL: { schemeType: 'zone-run',    passRate: 0.48, rushRate: 0.52, passEfficiency: 0.76, rushEfficiency: 0.86, oLineRank: 8,  tempoScore: 0.93, qbRating: 0.68, teUsage: 'medium' },
  MIN: { schemeType: 'west-coast',  passRate: 0.56, rushRate: 0.44, passEfficiency: 0.78, rushEfficiency: 0.76, oLineRank: 15, tempoScore: 0.97, qbRating: 0.72, teUsage: 'medium' },
  GB:  { schemeType: 'west-coast',  passRate: 0.55, rushRate: 0.45, passEfficiency: 0.77, rushEfficiency: 0.80, oLineRank: 11, tempoScore: 0.98, qbRating: 0.74, teUsage: 'medium' },
  TB:  { schemeType: 'spread',      passRate: 0.58, rushRate: 0.42, passEfficiency: 0.80, rushEfficiency: 0.72, oLineRank: 17, tempoScore: 1.01, qbRating: 0.76, teUsage: 'low' },
  DEN: { schemeType: 'balanced',    passRate: 0.53, rushRate: 0.47, passEfficiency: 0.74, rushEfficiency: 0.78, oLineRank: 13, tempoScore: 0.96, qbRating: 0.70, teUsage: 'low' },
  LAR: { schemeType: 'west-coast',  passRate: 0.58, rushRate: 0.42, passEfficiency: 0.78, rushEfficiency: 0.70, oLineRank: 20, tempoScore: 0.98, qbRating: 0.72, teUsage: 'medium' },
  SEA: { schemeType: 'balanced',    passRate: 0.55, rushRate: 0.45, passEfficiency: 0.76, rushEfficiency: 0.74, oLineRank: 22, tempoScore: 0.97, qbRating: 0.68, teUsage: 'medium' },
  PIT: { schemeType: 'power-run',   passRate: 0.48, rushRate: 0.52, passEfficiency: 0.70, rushEfficiency: 0.80, oLineRank: 9,  tempoScore: 0.90, qbRating: 0.62, teUsage: 'medium' },
  IND: { schemeType: 'balanced',    passRate: 0.52, rushRate: 0.48, passEfficiency: 0.72, rushEfficiency: 0.76, oLineRank: 7,  tempoScore: 0.94, qbRating: 0.60, teUsage: 'low' },
  JAX: { schemeType: 'balanced',    passRate: 0.54, rushRate: 0.46, passEfficiency: 0.72, rushEfficiency: 0.72, oLineRank: 19, tempoScore: 0.95, qbRating: 0.65, teUsage: 'medium' },
  NO:  { schemeType: 'west-coast',  passRate: 0.55, rushRate: 0.45, passEfficiency: 0.72, rushEfficiency: 0.74, oLineRank: 21, tempoScore: 0.93, qbRating: 0.62, teUsage: 'medium' },
  LAC: { schemeType: 'power-run',   passRate: 0.50, rushRate: 0.50, passEfficiency: 0.76, rushEfficiency: 0.82, oLineRank: 10, tempoScore: 0.88, qbRating: 0.74, teUsage: 'low' },
  CLE: { schemeType: 'power-run',   passRate: 0.46, rushRate: 0.54, passEfficiency: 0.62, rushEfficiency: 0.78, oLineRank: 16, tempoScore: 0.88, qbRating: 0.45, teUsage: 'medium' },
  WAS: { schemeType: 'spread',      passRate: 0.57, rushRate: 0.43, passEfficiency: 0.78, rushEfficiency: 0.72, oLineRank: 23, tempoScore: 1.00, qbRating: 0.76, teUsage: 'low' },
  CHI: { schemeType: 'balanced',    passRate: 0.53, rushRate: 0.47, passEfficiency: 0.70, rushEfficiency: 0.72, oLineRank: 24, tempoScore: 0.94, qbRating: 0.62, teUsage: 'medium' },
  NYJ: { schemeType: 'west-coast',  passRate: 0.56, rushRate: 0.44, passEfficiency: 0.68, rushEfficiency: 0.70, oLineRank: 25, tempoScore: 0.92, qbRating: 0.58, teUsage: 'low' },
  ARI: { schemeType: 'air-raid',    passRate: 0.60, rushRate: 0.40, passEfficiency: 0.72, rushEfficiency: 0.68, oLineRank: 26, tempoScore: 1.04, qbRating: 0.58, teUsage: 'high' },
  TEN: { schemeType: 'power-run',   passRate: 0.47, rushRate: 0.53, passEfficiency: 0.64, rushEfficiency: 0.76, oLineRank: 18, tempoScore: 0.88, qbRating: 0.52, teUsage: 'medium' },
  LV:  { schemeType: 'balanced',    passRate: 0.52, rushRate: 0.48, passEfficiency: 0.66, rushEfficiency: 0.70, oLineRank: 27, tempoScore: 0.90, qbRating: 0.50, teUsage: 'medium' },
  NYG: { schemeType: 'balanced',    passRate: 0.52, rushRate: 0.48, passEfficiency: 0.64, rushEfficiency: 0.68, oLineRank: 28, tempoScore: 0.91, qbRating: 0.48, teUsage: 'low' },
  CAR: { schemeType: 'power-run',   passRate: 0.46, rushRate: 0.54, passEfficiency: 0.58, rushEfficiency: 0.72, oLineRank: 30, tempoScore: 0.87, qbRating: 0.42, teUsage: 'low' },
  NE:  { schemeType: 'balanced',    passRate: 0.50, rushRate: 0.50, passEfficiency: 0.60, rushEfficiency: 0.66, oLineRank: 29, tempoScore: 0.89, qbRating: 0.50, teUsage: 'low' },
};

/**
 * Scheme fit multipliers for situation score calculation.
 * Key = schemeType, Value = { WR, RB, QB, TE } fit scores (0-1)
 */
export const SCHEME_FIT = {
  'air-raid':   { WR: 1.00, RB: 0.40, QB: 1.00, TE: 0.55 },
  'spread':     { WR: 0.95, RB: 0.45, QB: 0.90, TE: 0.50 },
  'west-coast': { WR: 0.75, RB: 0.55, QB: 0.75, TE: 0.70 },
  'balanced':   { WR: 0.65, RB: 0.70, QB: 0.60, TE: 0.60 },
  'rpo':        { WR: 0.60, RB: 0.80, QB: 0.70, TE: 0.65 },
  'zone-run':   { WR: 0.45, RB: 1.00, QB: 0.45, TE: 0.60 },
  'power-run':  { WR: 0.40, RB: 1.00, QB: 0.40, TE: 0.55 },
};

/**
 * Situation Change Events — Known 2025 context shifts
 * Applied as additive adjustments to situation score (clamped to 0-1 after)
 */
export const SITUATION_CHANGES = [
  // Positive shifts
  { playerId: 'p151', impact: +0.20, note: 'Brissett connection, WR1 role locked in' },      // Marvin Harrison Jr. (was Michael Wilson in user's example — using Harrison for ARI)
  { playerId: 'p49',  impact: +0.15, note: 'Sophomore leap, offense built around him' },       // Jayden Daniels
  { playerId: 'p162', impact: +0.18, note: 'Breakout rookie TE, primary target' },             // Brock Bowers
  { playerId: 'p116', impact: +0.12, note: 'Second-year leap, target share increasing' },      // Brian Thomas Jr.
  { playerId: 'p11',  impact: +0.10, note: 'Expanded role in passing game' },                  // Jahmyr Gibbs
  { playerId: 'p120', impact: +0.12, note: 'Emerging as alpha WR in NYG' },                    // Malik Nabers
  { playerId: 'p70',  impact: +0.15, note: 'Workhorse role cemented after Mixon trade' },      // Chase Brown
  { playerId: 'p71',  impact: +0.10, note: 'Seized starting role in TB' },                     // Bucky Irving
  { playerId: 'p6',   impact: +0.08, note: 'Second year with Stefanski system' },              // CJ Stroud
  { playerId: 'p18',  impact: +0.05, note: 'Consistent alpha role in high-tempo offense' },    // Amon-Ra St. Brown

  // Negative shifts
  { playerId: 'p129', impact: -0.20, note: 'ACL recovery, target share uncertain' },           // Rashee Rice
  { playerId: 'p144', impact: -0.15, note: 'Returning from devastating leg injury' },          // Tank Dell
  { playerId: 'p61',  impact: -0.25, note: 'Age decline, Achilles recovery' },                 // Aaron Rodgers
  { playerId: 'p132', impact: -0.12, note: 'Chronic soft tissue injuries, reduced role' },     // Cooper Kupp
  { playerId: 'p226', impact: -0.30, note: 'Achilles recovery, legal issues, benching risk' }, // Deshaun Watson
  { playerId: 'p21',  impact: -0.10, note: 'Traded to less productive offense' },              // Stefon Diggs
  { playerId: 'p82',  impact: -0.18, note: 'Devastating knee injury recovery' },               // Nick Chubb
  { playerId: 'p139', impact: -0.15, note: 'ACL recovery, reduced explosiveness' },            // Brandon Aiyuk
  { playerId: 'p23',  impact: -0.12, note: 'Concussion history, snap count concerns' },        // Chris Olave
  { playerId: 'p28',  impact: -0.15, note: 'Second ACL recovery' },                            // TJ Hockenson
];
