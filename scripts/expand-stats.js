/**
 * expand-stats.js — Parse nfl_player_stats_2021_2025.csv and generate
 * expanded data files for the HexMetrics client.
 *
 * Outputs:
 *   client/src/data/playerDetailedStats.js  — per-player, per-season full stat breakdown
 *   client/src/data/players.js              — rewritten with current-season stats added
 *   client/src/data/historicalStats.js       — rewritten with detailed per-season stats
 *
 * Usage:  node scripts/expand-stats.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'nfl_player_stats_2021_2025.csv');
const PLAYER_MAP_PATH = path.join(ROOT, 'player_map.json');
const OUT_DETAILED = path.join(ROOT, 'client/src/data/playerDetailedStats.js');
const OUT_PLAYERS = path.join(ROOT, 'client/src/data/players.js');
const OUT_HISTORICAL = path.join(ROOT, 'client/src/data/historicalStats.js');

// ── Parse CSV ──────────────────────────────────────────────────────────────────
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length !== headers.length) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx]; });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else { current += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

// ── Numeric helper ─────────────────────────────────────────────────────────────
function num(v, decimals = 1) {
  const n = parseFloat(v);
  if (isNaN(n)) return 0;
  return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
function numInt(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

// ── Name normalization for matching ────────────────────────────────────────────
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[.\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Build stat object from a CSV row ───────────────────────────────────────────
function buildStats(row) {
  return {
    // Meta
    games: numInt(row.games),
    season: numInt(row.season),
    team: (row.recent_team || '').trim(),
    fantasyPts: num(row.fantasy_points),
    fantasyPtsPpr: num(row.fantasy_points_ppr),

    // Passing
    completions: numInt(row.completions),
    attempts: numInt(row.attempts),
    passingYards: numInt(row.passing_yards),
    passingTds: numInt(row.passing_tds),
    passingInt: numInt(row.passing_interceptions),
    sacksSuffered: numInt(row.sacks_suffered),
    sackYardsLost: numInt(row.sack_yards_lost),
    sackFumbles: numInt(row.sack_fumbles),
    sackFumblesLost: numInt(row.sack_fumbles_lost),
    passingAirYards: num(row.passing_air_yards, 0),
    passingYAC: num(row.passing_yards_after_catch, 0),
    passingFirstDowns: numInt(row.passing_first_downs),
    passingEpa: num(row.passing_epa, 2),
    passingCpoe: num(row.passing_cpoe, 2),
    passing2pt: numInt(row.passing_2pt_conversions),
    pacr: num(row.pacr, 3),

    // Rushing
    carries: numInt(row.carries),
    rushingYards: numInt(row.rushing_yards),
    rushingTds: numInt(row.rushing_tds),
    rushingFumbles: numInt(row.rushing_fumbles),
    rushingFumblesLost: numInt(row.rushing_fumbles_lost),
    rushingFirstDowns: numInt(row.rushing_first_downs),
    rushingEpa: num(row.rushing_epa, 2),
    rushing2pt: numInt(row.rushing_2pt_conversions),

    // Receiving
    receptions: numInt(row.receptions),
    targets: numInt(row.targets),
    receivingYards: numInt(row.receiving_yards),
    receivingTds: numInt(row.receiving_tds),
    receivingFumbles: numInt(row.receiving_fumbles),
    receivingFumblesLost: numInt(row.receiving_fumbles_lost),
    receivingAirYards: num(row.receiving_air_yards, 0),
    receivingYAC: num(row.receiving_yards_after_catch, 0),
    receivingFirstDowns: numInt(row.receiving_first_downs),
    receivingEpa: num(row.receiving_epa, 2),
    receiving2pt: numInt(row.receiving_2pt_conversions),
    racr: num(row.racr, 3),
    targetShare: num(row.target_share, 3),
    airYardsShare: num(row.air_yards_share, 3),
    wopr: num(row.wopr, 3),

    // Special teams
    specialTeamsTds: numInt(row.special_teams_tds),

    // Defense (for IDP)
    defTacklesSolo: numInt(row.def_tackles_solo),
    defTacklesAssist: numInt(row.def_tackle_assists),
    defTacklesCombined: numInt(row.def_tackles_solo) + numInt(row.def_tackle_assists),
    defTFL: num(row.def_tackles_for_loss, 1),
    defTFLYards: num(row.def_tackles_for_loss_yards, 0),
    defFumblesForced: numInt(row.def_fumbles_forced),
    defSacks: num(row.def_sacks, 1),
    defSackYards: num(row.def_sack_yards, 0),
    defQBHits: numInt(row.def_qb_hits),
    defInterceptions: numInt(row.def_interceptions),
    defIntYards: numInt(row.def_interception_yards),
    defPassDefended: numInt(row.def_pass_defended),
    defTds: numInt(row.def_tds),
    defSafeties: numInt(row.def_safeties),

    // Fumbles / misc
    fumbleRecOwn: numInt(row.fumble_recovery_own),
    fumbleRecOpp: numInt(row.fumble_recovery_opp),
    fumbleRecTds: numInt(row.fumble_recovery_tds),
    penalties: numInt(row.penalties),
    penaltyYards: numInt(row.penalty_yards),

    // Returns
    puntReturns: numInt(row.punt_returns),
    puntReturnYards: numInt(row.punt_return_yards),
    kickoffReturns: numInt(row.kickoff_returns),
    kickoffReturnYards: numInt(row.kickoff_return_yards),

    // Kicking
    fgMade: numInt(row.fg_made),
    fgAtt: numInt(row.fg_att),
    fgMissed: numInt(row.fg_missed),
    fgBlocked: numInt(row.fg_blocked),
    fgLong: numInt(row.fg_long),
    fgPct: num(row.fg_pct, 1),
    fgMade0_19: numInt(row.fg_made_0_19),
    fgMade20_29: numInt(row.fg_made_20_29),
    fgMade30_39: numInt(row.fg_made_30_39),
    fgMade40_49: numInt(row.fg_made_40_49),
    fgMade50_59: numInt(row.fg_made_50_59),
    fgMade60: numInt(row.fg_made_60_),
    fgMissed0_19: numInt(row.fg_missed_0_19),
    fgMissed20_29: numInt(row.fg_missed_20_29),
    fgMissed30_39: numInt(row.fg_missed_30_39),
    fgMissed40_49: numInt(row.fg_missed_40_49),
    fgMissed50_59: numInt(row.fg_missed_50_59),
    fgMissed60: numInt(row.fg_missed_60_),
    patMade: numInt(row.pat_made),
    patAtt: numInt(row.pat_att),
    patMissed: numInt(row.pat_missed),
    patPct: num(row.pat_pct, 1),
  };
}

// ── Trim zero fields per position for file size ────────────────────────────────
function trimStats(stats, pos) {
  const s = { ...stats };
  // Always keep: games, season, team, fantasyPts, fantasyPtsPpr

  // Remove passing stats for non-passers (unless they have meaningful data)
  if (pos !== 'QB') {
    const passingFields = ['completions','attempts','passingYards','passingTds','passingInt',
      'sacksSuffered','sackYardsLost','sackFumbles','sackFumblesLost','passingAirYards',
      'passingYAC','passingFirstDowns','passingEpa','passingCpoe','passing2pt','pacr'];
    if (s.attempts === 0) passingFields.forEach(f => delete s[f]);
  }

  // Remove kicking stats for non-kickers
  if (pos !== 'K') {
    const kickFields = ['fgMade','fgAtt','fgMissed','fgBlocked','fgLong','fgPct',
      'fgMade0_19','fgMade20_29','fgMade30_39','fgMade40_49','fgMade50_59','fgMade60',
      'fgMissed0_19','fgMissed20_29','fgMissed30_39','fgMissed40_49','fgMissed50_59','fgMissed60',
      'patMade','patAtt','patMissed','patPct'];
    if (s.fgAtt === 0 && s.patAtt === 0) kickFields.forEach(f => delete s[f]);
  }

  // Remove defense stats for offensive players
  if (!['DEF','DL','LB','DB'].includes(pos)) {
    const defFields = ['defTacklesSolo','defTacklesAssist','defTacklesCombined','defTFL','defTFLYards',
      'defFumblesForced','defSacks','defSackYards','defQBHits','defInterceptions','defIntYards',
      'defPassDefended','defTds','defSafeties'];
    const hasDefStats = s.defTacklesSolo > 0 || s.defSacks > 0 || s.defInterceptions > 0;
    if (!hasDefStats) defFields.forEach(f => delete s[f]);
  }

  // Remove return stats if zero
  if (s.puntReturns === 0 && s.kickoffReturns === 0) {
    delete s.puntReturns; delete s.puntReturnYards;
    delete s.kickoffReturns; delete s.kickoffReturnYards;
  }

  // Remove misc zeros
  if (s.specialTeamsTds === 0) delete s.specialTeamsTds;
  if (s.fumbleRecOwn === 0) delete s.fumbleRecOwn;
  if (s.fumbleRecOpp === 0) delete s.fumbleRecOpp;
  if (s.fumbleRecTds === 0) delete s.fumbleRecTds;
  if (s.penalties === 0) { delete s.penalties; delete s.penaltyYards; }

  return s;
}

// ── Get current-season summary stats per position ──────────────────────────────
function currentSeasonFields(stats, pos) {
  const base = { gp: stats.games };

  switch (pos) {
    case 'QB':
      return { ...base,
        cmp: stats.completions, att: stats.attempts, passYds: stats.passingYards,
        passTd: stats.passingTds, int: stats.passingInt, sacks: stats.sacksSuffered,
        passEpa: stats.passingEpa, cpoe: stats.passingCpoe,
        carries: stats.carries, rushYds: stats.rushingYards, rushTd: stats.rushingTds,
        rushEpa: stats.rushingEpa,
      };
    case 'RB':
      return { ...base,
        carries: stats.carries, rushYds: stats.rushingYards, rushTd: stats.rushingTds,
        rushEpa: stats.rushingEpa, rushFD: stats.rushingFirstDowns,
        rec: stats.receptions, tgt: stats.targets, recYds: stats.receivingYards,
        recTd: stats.receivingTds, recEpa: stats.receivingEpa,
        tgtShare: stats.targetShare, fumLost: stats.rushingFumblesLost,
      };
    case 'WR':
      return { ...base,
        rec: stats.receptions, tgt: stats.targets, recYds: stats.receivingYards,
        recTd: stats.receivingTds, recEpa: stats.receivingEpa, recFD: stats.receivingFirstDowns,
        tgtShare: stats.targetShare, airShare: stats.airYardsShare, wopr: stats.wopr,
        racr: stats.racr, yac: stats.receivingYAC,
        carries: stats.carries, rushYds: stats.rushingYards,
      };
    case 'TE':
      return { ...base,
        rec: stats.receptions, tgt: stats.targets, recYds: stats.receivingYards,
        recTd: stats.receivingTds, recEpa: stats.receivingEpa, recFD: stats.receivingFirstDowns,
        tgtShare: stats.targetShare, racr: stats.racr, yac: stats.receivingYAC,
      };
    case 'K':
      return { ...base,
        fgm: stats.fgMade, fga: stats.fgAtt, fgPct: stats.fgPct, fgLong: stats.fgLong,
        fg50: stats.fgMade50_59 + stats.fgMade60,
        patm: stats.patMade, pata: stats.patAtt, patPct: stats.patPct,
      };
    default:
      return base;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

console.log('Reading CSV...');
const csvText = fs.readFileSync(CSV_PATH, 'utf-8');
const rows = parseCSV(csvText);
console.log(`Parsed ${rows.length} CSV rows`);

// Filter to REG season only
const regRows = rows.filter(r => r.season_type === 'REG');
console.log(`REG season rows: ${regRows.length}`);

// Build player map by evaluating the players.js source directly
// This handles escaped apostrophes (De\'Von → De'Von) correctly
const origPlayersRaw = fs.readFileSync(OUT_PLAYERS, 'utf-8');
const playerMap = [];
// Match: id:'pN', name:'...', team:'...', pos:'...'
// Names can contain escaped apostrophes (\') so we match [^'] OR \' sequences
const playerMapRe = /id:'(p\d+)',\s*name:'((?:[^'\\]|\\.)*)',\s*team:'([^']+)',\s*pos:'([^']+)'/g;
let pm;
while ((pm = playerMapRe.exec(origPlayersRaw)) !== null) {
  // Unescape the name: \' → '
  const name = pm[2].replace(/\\'/g, "'");
  playerMap.push({ id: pm[1], name, team: pm[3], pos: pm[4] });
}
console.log(`Player map: ${playerMap.length} players`);

// Build name lookup (normalized name → player info)
const nameLookup = {};
playerMap.forEach(p => {
  nameLookup[normalize(p.name)] = p;
});

// Also build a display_name lookup for CSV matching
// CSV has player_display_name and player_name (abbreviated)
// We match on display_name primarily

// Match CSV rows to player IDs
const matched = {};    // playerId → { seasons: { year: stats } }
const unmatched = new Set();
let matchCount = 0;

for (const row of regRows) {
  const displayName = (row.player_display_name || '').trim();
  const pos = (row.position || '').trim();

  // Skip non-fantasy positions
  if (['OT','OG','OL','C','G','T','LS','P','FB','SAF','SS','FS','CB','DE','DT','NT','ILB','OLB','MLB'].includes(pos)) {
    // But keep DEF-position players if they match our roster
  }

  const normDisplay = normalize(displayName);
  const p = nameLookup[normDisplay];

  if (!p) {
    // Try without Jr./Sr./III suffixes
    const stripped = normDisplay.replace(/\s+(jr|sr|ii|iii|iv|v)$/, '');
    const p2 = nameLookup[stripped];
    if (p2) {
      const season = numInt(row.season);
      if (!matched[p2.id]) matched[p2.id] = { player: p2, seasons: {} };
      matched[p2.id].seasons[season] = buildStats(row);
      matchCount++;
    } else {
      unmatched.add(displayName);
    }
    continue;
  }

  const season = numInt(row.season);
  if (!matched[p.id]) matched[p.id] = { player: p, seasons: {} };
  matched[p.id].seasons[season] = buildStats(row);
  matchCount++;
}

console.log(`Matched ${matchCount} row-seasons across ${Object.keys(matched).length} players`);
console.log(`Unmatched display names: ${unmatched.size}`);

// Show which of our 255 players didn't match
const unmatchedPlayers = playerMap.filter(p => !matched[p.id]);
console.log(`\nPlayers without CSV data (${unmatchedPlayers.length}):`);
unmatchedPlayers.forEach(p => console.log(`  ${p.id} ${p.name} (${p.pos} ${p.team})`));

// ── Generate playerDetailedStats.js ────────────────────────────────────────────
console.log('\nGenerating playerDetailedStats.js...');

let detailedJS = `/**
 * Player Detailed Stats — Full statistical breakdown per player per season
 * Generated from nfl_player_stats_2021_2025.csv by scripts/expand-stats.js
 * ${new Date().toISOString().split('T')[0]}
 *
 * Keys: passing, rushing, receiving, kicking, defense, returns, misc
 * All stats are regular-season only.
 */

export const PLAYER_DETAILED_STATS = {\n`;

const sortedIds = Object.keys(matched).sort((a, b) => {
  const na = parseInt(a.replace('p', ''));
  const nb = parseInt(b.replace('p', ''));
  return na - nb;
});

for (const pid of sortedIds) {
  const { player, seasons } = matched[pid];
  const seasonKeys = Object.keys(seasons).sort((a, b) => parseInt(b) - parseInt(a));
  detailedJS += `  ${pid}: { // ${player.name} (${player.pos})\n`;
  for (const yr of seasonKeys) {
    const trimmed = trimStats(seasons[yr], player.pos);
    // Remove season and team from the nested object (redundant with key)
    const { season: _s, ...rest } = trimmed;
    detailedJS += `    '${yr}': ${JSON.stringify(rest)},\n`;
  }
  detailedJS += `  },\n`;
}
detailedJS += `};\n`;

fs.writeFileSync(OUT_DETAILED, detailedJS);
console.log(`Wrote ${OUT_DETAILED} (${(detailedJS.length / 1024).toFixed(0)} KB)`);

// ── Regenerate players.js with current-season stats ────────────────────────────
console.log('\nGenerating players.js...');

// Read original to preserve pts/proj/avg/status
const origContent = fs.readFileSync(OUT_PLAYERS, 'utf-8');
const origRe = /id:'(p\d+)',\s*name:'((?:[^'\\]|\\.)*)',\s*team:'([^']+)',\s*pos:'([^']+)',\s*pts:([\d.]+),\s*proj:([\d.]+),\s*avg:([\d.]+),\s*status:'([^']+)'/g;
const origPlayers = [];
let om;
while ((om = origRe.exec(origContent)) !== null) {
  origPlayers.push({
    id: om[1], name: om[2].replace(/\\'/g, "'"), team: om[3], pos: om[4],
    pts: parseFloat(om[5]), proj: parseFloat(om[6]),
    avg: parseFloat(om[7]), status: om[8],
  });
}

let playersJS = `export const PLAYERS = [\n`;

// Group by position for comments
const posGroups = { QB: [], RB: [], WR: [], TE: [], K: [] };
origPlayers.forEach(p => {
  if (posGroups[p.pos]) posGroups[p.pos].push(p);
});

for (const [pos, players] of Object.entries(posGroups)) {
  playersJS += `  // ===== ${pos}S (${players.length}) =====\n`;
  for (const p of players) {
    // Base fields (preserved from original)
    // Escape apostrophes in names for JS string literals (De'Von → De\'Von)
    const escapedName = p.name.replace(/'/g, "\\'");
    let line = `  { id:'${p.id}', name:'${escapedName}', team:'${p.team}', pos:'${p.pos}', pts:${p.pts}, proj:${p.proj}, avg:${p.avg}, status:'${p.status}'`;

    // Add current-season stats if we have CSV data
    if (matched[p.id]) {
      const seasonYears = Object.keys(matched[p.id].seasons).map(Number).sort((a, b) => b - a);
      const latestYear = seasonYears[0];
      if (latestYear) {
        const stats = matched[p.id].seasons[latestYear];
        const summary = currentSeasonFields(stats, p.pos);
        for (const [k, v] of Object.entries(summary)) {
          if (v !== 0 && v !== undefined) {
            line += `, ${k}:${v}`;
          }
        }
      }
    }

    line += ` },`;
    playersJS += line + '\n';
  }
  playersJS += '\n';
}

playersJS += `];\n`;

fs.writeFileSync(OUT_PLAYERS, playersJS);
console.log(`Wrote ${OUT_PLAYERS} (${(playersJS.length / 1024).toFixed(0)} KB)`);

// ── Regenerate historicalStats.js with detailed breakdowns ─────────────────────
console.log('\nGenerating historicalStats.js...');

const allSeasons = new Set();
Object.values(matched).forEach(({ seasons }) => {
  Object.keys(seasons).forEach(yr => allSeasons.add(parseInt(yr)));
});
const sortedSeasons = [...allSeasons].sort();

let histJS = `/**
 * Historical Player Stats — Real NFL data from nflverse (2021-2025)
 * Generated from nfl_player_stats_2021_2025.csv by scripts/expand-stats.js
 * ${new Date().toISOString().split('T')[0]}
 *
 * Now includes full stat breakdowns per season (not just gp/totalPts/avgPts).
 * Used by HexScore engine for multi-year weighted production.
 */

export const HISTORICAL_STATS = {
  players: {\n`;

for (const pid of sortedIds) {
  const { player, seasons } = matched[pid];
  const seasonKeys = Object.keys(seasons).sort((a, b) => parseInt(b) - parseInt(a));

  histJS += `    ${pid}: { `;
  const parts = [];
  for (const yr of seasonKeys) {
    const s = seasons[yr];
    const gp = s.games;
    const totalPts = s.fantasyPtsPpr;
    const avgPts = gp > 0 ? num(totalPts / gp, 1) : 0;

    // Build compact stat object per season
    const compact = { gp, totalPts, avgPts };

    // Add key position stats
    if (player.pos === 'QB') {
      if (s.passingYards) compact.passYds = s.passingYards;
      if (s.passingTds) compact.passTd = s.passingTds;
      if (s.passingInt) compact.int = s.passingInt;
      if (s.completions) compact.cmp = s.completions;
      if (s.attempts) compact.att = s.attempts;
      if (s.rushingYards) compact.rushYds = s.rushingYards;
      if (s.rushingTds) compact.rushTd = s.rushingTds;
      if (s.passingEpa) compact.passEpa = s.passingEpa;
    } else if (player.pos === 'RB') {
      if (s.rushingYards) compact.rushYds = s.rushingYards;
      if (s.rushingTds) compact.rushTd = s.rushingTds;
      if (s.carries) compact.carries = s.carries;
      if (s.receptions) compact.rec = s.receptions;
      if (s.receivingYards) compact.recYds = s.receivingYards;
      if (s.receivingTds) compact.recTd = s.receivingTds;
      if (s.targets) compact.tgt = s.targets;
    } else if (player.pos === 'WR') {
      if (s.receptions) compact.rec = s.receptions;
      if (s.targets) compact.tgt = s.targets;
      if (s.receivingYards) compact.recYds = s.receivingYards;
      if (s.receivingTds) compact.recTd = s.receivingTds;
      if (s.receivingYAC) compact.yac = s.receivingYAC;
      if (s.targetShare) compact.tgtShare = s.targetShare;
      if (s.rushingYards) compact.rushYds = s.rushingYards;
    } else if (player.pos === 'TE') {
      if (s.receptions) compact.rec = s.receptions;
      if (s.targets) compact.tgt = s.targets;
      if (s.receivingYards) compact.recYds = s.receivingYards;
      if (s.receivingTds) compact.recTd = s.receivingTds;
      if (s.targetShare) compact.tgtShare = s.targetShare;
    } else if (player.pos === 'K') {
      if (s.fgMade) compact.fgm = s.fgMade;
      if (s.fgAtt) compact.fga = s.fgAtt;
      if (s.fgPct) compact.fgPct = s.fgPct;
      if (s.patMade) compact.patm = s.patMade;
    }

    parts.push(`'${yr}': ${JSON.stringify(compact)}`);
  }
  histJS += parts.join(', ');
  histJS += ` }, // ${player.name}\n`;
}

histJS += `  },
  meta: {
    scoringFormat: 'ppr',
    lastUpdated: '${new Date().toISOString()}',
    seasons: ${JSON.stringify(sortedSeasons)}
  }
};\n`;

fs.writeFileSync(OUT_HISTORICAL, histJS);
console.log(`Wrote ${OUT_HISTORICAL} (${(histJS.length / 1024).toFixed(0)} KB)`);

console.log('\nDone! All data files regenerated.');
