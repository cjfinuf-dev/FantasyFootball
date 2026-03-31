/**
 * Player Archetypes — Fantasy-relevant player classifications
 *
 * Archetypes capture HOW a player produces fantasy points, not just how many.
 * Dual-threat QBs are more valuable because rushing adds a reliable floor.
 * Bell-cow RBs are more valuable because volume is king.
 * High-target WRs in PPR formats get a premium.
 *
 * Each archetype has:
 *   - fantasyPremium: base multiplier to HexScore production (1.0 = neutral)
 *   - floorBoost: bonus for players with high weekly floor (0-0.15)
 *   - pprAdjust: additional premium in PPR formats (0-0.10)
 *   - description: what this archetype means
 */

export const ARCHETYPES = {
  // QB archetypes
  'dual-threat-elite': { fantasyPremium: 1.12, floorBoost: 0.12, pprAdjust: 0, description: 'Elite rushing QB — 5-8 pts/game from ground' },
  'dual-threat':       { fantasyPremium: 1.08, floorBoost: 0.08, pprAdjust: 0, description: 'Mobile QB with meaningful rushing upside' },
  'pocket-elite':      { fantasyPremium: 1.02, floorBoost: 0.04, pprAdjust: 0, description: 'Elite passer, limited rushing' },
  'pocket-passer':     { fantasyPremium: 1.00, floorBoost: 0.02, pprAdjust: 0, description: 'Standard pocket QB' },
  'game-manager':      { fantasyPremium: 0.92, floorBoost: 0.01, pprAdjust: 0, description: 'Conservative, low-ceiling QB' },

  // RB archetypes
  'bell-cow':          { fantasyPremium: 1.10, floorBoost: 0.10, pprAdjust: 0.03, description: 'Workhorse 3-down back, 70%+ snap share' },
  'elite-pass-catch':  { fantasyPremium: 1.06, floorBoost: 0.08, pprAdjust: 0.08, description: 'High-volume receiving back' },
  'power-back':        { fantasyPremium: 1.04, floorBoost: 0.06, pprAdjust: 0,    description: 'Goal-line/early-down thumper' },
  'committee':         { fantasyPremium: 0.90, floorBoost: 0.02, pprAdjust: 0.02, description: 'Timeshare back, volume limited' },
  'backup':            { fantasyPremium: 0.82, floorBoost: 0.01, pprAdjust: 0,    description: 'Handcuff/depth piece' },

  // WR archetypes
  'alpha-wr':          { fantasyPremium: 1.08, floorBoost: 0.08, pprAdjust: 0.06, description: 'Team WR1, 25%+ target share' },
  'target-hog':        { fantasyPremium: 1.04, floorBoost: 0.06, pprAdjust: 0.10, description: 'High-volume possession receiver' },
  'deep-threat':       { fantasyPremium: 1.02, floorBoost: 0.02, pprAdjust: 0.02, description: 'Boom/bust big-play receiver' },
  'slot-wr':           { fantasyPremium: 1.00, floorBoost: 0.04, pprAdjust: 0.06, description: 'Consistent short/intermediate target' },
  'wr2-wr3':           { fantasyPremium: 0.94, floorBoost: 0.02, pprAdjust: 0.03, description: 'Secondary option, matchup dependent' },

  // TE archetypes
  'elite-te':          { fantasyPremium: 1.10, floorBoost: 0.08, pprAdjust: 0.08, description: 'Top-5 TE, consistent targets' },
  'receiving-te':      { fantasyPremium: 1.04, floorBoost: 0.05, pprAdjust: 0.06, description: 'Pass-catching TE with solid target share' },
  'blocking-te':       { fantasyPremium: 0.88, floorBoost: 0.01, pprAdjust: 0.01, description: 'Blocking-first, limited receiving' },

  // K/DEF
  'default':           { fantasyPremium: 1.00, floorBoost: 0.00, pprAdjust: 0, description: 'Standard' },
};

/**
 * Player → Archetype assignments
 * Only notable players need explicit assignments; the rest get position defaults.
 */
export const PLAYER_ARCHETYPES = {
  // Dual-threat elite QBs (the fantasy premium tier)
  p2:  'dual-threat-elite',  // Josh Allen — 50-70 rushing yards/game + rushing TDs
  p3:  'dual-threat-elite',  // Lamar Jackson — MVP rushing production
  p4:  'dual-threat',        // Jalen Hurts — designed runs, goal-line QB sneaks
  p49: 'dual-threat',        // Jayden Daniels — electric runner
  p54: 'dual-threat',        // Kyler Murray — scrambling + designed runs
  p233:'dual-threat',        // Justin Fields — rushing upside
  p222:'dual-threat',        // Anthony Richardson — raw rushing talent

  // Pocket elite
  p1:  'pocket-elite',       // Mahomes — scrambles but doesn't run by design
  p5:  'pocket-elite',       // Burrow — elite arm, minimal rushing
  p50: 'pocket-passer',      // Baker Mayfield
  p6:  'pocket-elite',       // CJ Stroud
  p46: 'pocket-passer',      // Dak Prescott
  p51: 'pocket-passer',      // Jared Goff — game manager with good weapons
  p55: 'pocket-passer',      // Justin Herbert
  p58: 'pocket-passer',      // Tua
  p61: 'game-manager',       // Aaron Rodgers — age/injury limited
  p62: 'pocket-passer',      // Matthew Stafford
  p64: 'game-manager',       // Russell Wilson — lost mobility
  p65: 'game-manager',       // Derek Carr

  // Bell-cow RBs
  p9:  'bell-cow',           // Bijan Robinson — true 3-down back
  p10: 'bell-cow',           // Saquon Barkley
  p13: 'bell-cow',           // Derrick Henry — ultimate power bell-cow
  p7:  'bell-cow',           // Christian McCaffrey — when healthy
  p12: 'bell-cow',           // Jonathan Taylor
  p8:  'bell-cow',           // Breece Hall
  p66: 'bell-cow',           // Josh Jacobs
  p68: 'bell-cow',           // Joe Mixon
  p72: 'elite-pass-catch',   // Alvin Kamara — elite receiving back
  p11: 'elite-pass-catch',   // Jahmyr Gibbs — pass-catching role
  p67: 'elite-pass-catch',   // James Cook
  p45: 'power-back',         // Kyren Williams
  p42: 'power-back',         // Isiah Pacheco
  p76: 'power-back',         // Najee Harris
  p75: 'committee',          // David Montgomery — shares with Gibbs
  p74: 'committee',          // Aaron Jones
  p14: 'committee',          // Travis Etienne — efficiency concerns
  p80: 'committee',          // Tony Pollard
  p81: 'committee',          // Rhamondre Stevenson
  p82: 'power-back',         // Nick Chubb — when healthy

  // Alpha WRs
  p15: 'alpha-wr',           // Tyreek Hill
  p16: 'alpha-wr',           // CeeDee Lamb
  p18: 'target-hog',         // Amon-Ra St. Brown — target monster
  p115:'alpha-wr',           // Justin Jefferson
  p20: 'alpha-wr',           // AJ Brown
  p119:'alpha-wr',           // Mike Evans
  p120:'alpha-wr',           // Malik Nabers
  p40: 'alpha-wr',           // Puka Nacua
  p127:'alpha-wr',           // Nico Collins
  p19: 'target-hog',         // Davante Adams
  p117:'target-hog',         // Terry McLaurin
  p118:'target-hog',         // Drake London
  p130:'slot-wr',            // DeVonta Smith
  p131:'slot-wr',            // Keenan Allen
  p132:'target-hog',         // Cooper Kupp — when healthy
  p43: 'deep-threat',        // Deebo Samuel — versatile
  p22: 'deep-threat',        // DK Metcalf
  p128:'deep-threat',        // George Pickens
  p137:'wr2-wr3',            // Calvin Ridley
  p134:'wr2-wr3',            // Diontae Johnson
  p138:'slot-wr',            // DJ Moore
  p125:'alpha-wr',           // Tee Higgins
  p129:'alpha-wr',           // Rashee Rice — when healthy
  p121:'slot-wr',            // Ladd McConkey
  p151:'alpha-wr',           // Marvin Harrison Jr.

  // TEs
  p25: 'elite-te',           // Travis Kelce
  p26: 'elite-te',           // Sam LaPorta
  p27: 'elite-te',           // Mark Andrews
  p29: 'elite-te',           // George Kittle
  p162:'elite-te',           // Brock Bowers
  p44: 'receiving-te',       // Trey McBride
  p28: 'receiving-te',       // TJ Hockenson
  p30: 'receiving-te',       // Dallas Goedert
  p47: 'receiving-te',       // Evan Engram
  p167:'receiving-te',       // Kyle Pitts
  p172:'receiving-te',       // Dalton Kincaid
};

/**
 * Get the archetype for a player. Falls back to position defaults.
 */
const POS_DEFAULTS = {
  QB: 'pocket-passer', RB: 'committee', WR: 'wr2-wr3', TE: 'blocking-te', K: 'default', DEF: 'default',
};

export function getPlayerArchetype(playerId, pos) {
  const archetypeKey = PLAYER_ARCHETYPES[playerId] || POS_DEFAULTS[pos] || 'default';
  return { key: archetypeKey, ...ARCHETYPES[archetypeKey] };
}
