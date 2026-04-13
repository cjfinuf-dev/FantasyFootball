/**
 * expand-stats.js — Parse nfl_player_stats.csv and generate
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
const CSV_PATH = path.join(ROOT, 'nfl_player_stats.csv');
const PLAYER_MAP_PATH = path.join(ROOT, 'player_map.json');
const OUT_DETAILED = path.join(ROOT, 'client/src/data/playerDetailedStats.js');
const OUT_PLAYERS = path.join(ROOT, 'client/src/data/players.js');
const OUT_HISTORICAL = path.join(ROOT, 'client/src/data/historicalStats.js');
const OUT_RETIRED = path.join(ROOT, 'client/src/data/retiredPlayers.js');
const OUT_INACTIVE_PLAYERS = path.join(ROOT, 'client/src/data/inactivePlayers.js');
const OUT_INACTIVE_DETAILED = path.join(ROOT, 'client/src/data/inactiveDetailedStats.js');
const OUT_INACTIVE_HISTORICAL = path.join(ROOT, 'client/src/data/inactiveHistoricalStats.js');

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
const inactiveMatched = {};  // nflverseId → { name, pos, team, seasons }
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
      const nflId = (row.player_id || '').trim();
      if (nflId) {
        if (!inactiveMatched[nflId]) {
          inactiveMatched[nflId] = {
            id: nflId,
            name: displayName,
            pos: pos,
            posGroup: (row.position_group || '').trim(),
            headshot: (row.headshot_url || '').trim(),
            team: (row.recent_team || '').trim(),
            latestSeason: 0,
            seasons: {}
          };
        }
        const season = numInt(row.season);
        inactiveMatched[nflId].seasons[season] = buildStats(row);
        if (season > inactiveMatched[nflId].latestSeason) {
          inactiveMatched[nflId].latestSeason = season;
          inactiveMatched[nflId].team = (row.recent_team || '').trim();
        }
      }
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

// Players without CSV data — create zeroed-stats stub entries
// (e.g. players on IR all season still appear in historicalStats with gp:0)
const currentYear = Math.max(...[...new Set(regRows.map(r => numInt(r.season)))]);
const unmatchedPlayers = playerMap.filter(p => !matched[p.id]);
if (unmatchedPlayers.length > 0) {
  console.log(`\nCreating zero-stat stubs for ${unmatchedPlayers.length} players without CSV data:`);
  for (const p of unmatchedPlayers) {
    console.log(`  ${p.id} ${p.name} (${p.pos} ${p.team}) → stub gp:0 for ${currentYear}`);
    const zeroRow = {};
    Object.keys(buildStats({ season: String(currentYear), recent_team: p.team, games: '0' })).forEach(k => {
      zeroRow[k] = k === 'season' ? currentYear : k === 'team' ? p.team : 0;
    });
    zeroRow.games = 0;
    if (!matched[p.id]) matched[p.id] = { player: p, seasons: {} };
    matched[p.id].seasons[currentYear] = zeroRow;
  }
}

// Also add zero-stat current-year entries for matched players missing this season
// (e.g. Tank Dell has 2023/2024 stats but missed 2025 on IR)
const missingCurrentYear = playerMap.filter(p => matched[p.id] && !matched[p.id].seasons[currentYear]);
if (missingCurrentYear.length > 0) {
  console.log(`\nAdding ${currentYear} zero-stat entries for ${missingCurrentYear.length} matched players missing current season:`);
  for (const p of missingCurrentYear) {
    console.log(`  ${p.id} ${p.name} (${p.pos} ${p.team}) → gp:0 for ${currentYear}`);
    const zeroRow = {};
    Object.keys(buildStats({ season: String(currentYear), recent_team: p.team, games: '0' })).forEach(k => {
      zeroRow[k] = k === 'season' ? currentYear : k === 'team' ? p.team : 0;
    });
    zeroRow.games = 0;
    matched[p.id].seasons[currentYear] = zeroRow;
  }
}

// ── Generate playerDetailedStats.js ────────────────────────────────────────────
console.log('\nGenerating playerDetailedStats.js...');

let detailedJS = `/**
 * Player Detailed Stats — Full statistical breakdown per player per season
 * Generated from nfl_player_stats.csv by scripts/expand-stats.js
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

// Group by position for comments (include DEF)
const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const posGroups = {};
POS_ORDER.forEach(p => { posGroups[p] = []; });
origPlayers.forEach(p => {
  if (posGroups[p.pos]) posGroups[p.pos].push(p);
});

// Capture DEF entries as raw lines from original content (they have unique stat fields)
const defEntries = [];
const defLineRe = /^(\s*\{[^}]*pos:'DEF'[^}]*\},?)$/gm;
let defMatch;
while ((defMatch = defLineRe.exec(origContent)) !== null) {
  defEntries.push(defMatch[1]);
}

for (const pos of POS_ORDER) {
  const players = posGroups[pos];
  if (players.length === 0 && pos !== 'DEF') continue;

  const label = pos === 'DEF' ? 'DEF' : `${pos}S`;

  // DEF entries: preserve raw lines (unique stat schema)
  if (pos === 'DEF') {
    if (defEntries.length === 0) continue;
    playersJS += `  // ===== ${label} (${defEntries.length}) =====\n`;
    defEntries.forEach(line => { playersJS += line + '\n'; });
    playersJS += '\n';
    continue;
  }

  playersJS += `  // ===== ${label} (${players.length}) =====\n`;
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

// Preserve PLAYERS_LAST_UPDATED if present in original
const lastUpdatedMatch = origContent.match(/export const PLAYERS_LAST_UPDATED\s*=\s*(\{[^}]+\});/);
if (lastUpdatedMatch) {
  playersJS += `\nexport const PLAYERS_LAST_UPDATED = ${lastUpdatedMatch[1]};\n`;
}

fs.writeFileSync(OUT_PLAYERS, playersJS);
console.log(`Wrote ${OUT_PLAYERS} (${(playersJS.length / 1024).toFixed(0)} KB)`);

// ── Collect active-player seasons (used later when building combined histStats) ─
const allSeasons = new Set();
Object.values(matched).forEach(({ seasons }) => {
  Object.keys(seasons).forEach(yr => allSeasons.add(parseInt(yr)));
});
const sortedSeasons = [...allSeasons].sort();

// ── Extract Retired / Inactive Players ────────────────────────────────────────
console.log('\nExtracting retired/inactive players from CSV...');

const FANTASY_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K']);
const QUALIFY_GAMES = 8;
const QUALIFY_PPR_TOTAL = 80; // total PPR fantasy points in a season to qualify

// Build normalized name set of active players (to exclude from retired list)
const activeNormSet = new Set(playerMap.map(p => normalize(p.name)));

const retiredRaw = {}; // normName → { name, pos, seasons: {} }

for (const row of regRows) {
  const pos = (row.position || '').trim();
  if (!FANTASY_POSITIONS.has(pos)) continue;

  const displayName = (row.player_display_name || '').trim();
  if (!displayName) continue;

  const normName = normalize(displayName);
  const stripped = normName.replace(/\s+(jr|sr|ii|iii|iv|v)$/, '');

  // Skip active players
  if (activeNormSet.has(normName) || activeNormSet.has(stripped)) continue;

  const season = numInt(row.season);
  const stats = buildStats(row);

  if (!retiredRaw[normName]) {
    retiredRaw[normName] = { name: displayName, pos, seasons: {} };
  }
  // Keep highest-PPR row per season (handles position changes within a year)
  const existing = retiredRaw[normName].seasons[season];
  if (!existing || stats.fantasyPtsPpr > existing.fantasyPtsPpr) {
    retiredRaw[normName].seasons[season] = stats;
  }
}

// Filter: must have at least one qualifying season
const qualifying = Object.values(retiredRaw).filter(p =>
  Object.values(p.seasons).some(s => s.games >= QUALIFY_GAMES && s.fantasyPtsPpr >= QUALIFY_PPR_TOTAL)
);

// Sort by: latest season desc, then career PPR points desc (most prolific first)
qualifying.sort((a, b) => {
  const la = Math.max(...Object.keys(a.seasons).map(Number));
  const lb = Math.max(...Object.keys(b.seasons).map(Number));
  if (lb !== la) return lb - la;
  const aTotal = Object.values(a.seasons).reduce((s, x) => s + (x.fantasyPtsPpr || 0), 0);
  const bTotal = Object.values(b.seasons).reduce((s, x) => s + (x.fantasyPtsPpr || 0), 0);
  return bTotal - aTotal;
});

// Assign IDs and compute metadata
qualifying.forEach((p, i) => {
  p.id = `r${String(i + 1).padStart(4, '0')}`;
  const years = Object.keys(p.seasons).map(Number);
  p.lastSeason = Math.max(...years);
  p.firstSeason = Math.min(...years);
  p.lastTeam = p.seasons[p.lastSeason]?.team || 'FA';
});

console.log(`Qualifying retired/inactive players: ${qualifying.length}`);

// ── Write retiredPlayers.js ────────────────────────────────────────────────────
console.log('\nGenerating retiredPlayers.js...');

let retiredJS = `/**
 * Retired / Inactive Players
 * Generated from nfl_player_stats.csv by scripts/expand-stats.js
 * ${new Date().toISOString().split('T')[0]}
 *
 * Includes all QB/RB/WR/TE/K players with at least one season of
 * ${QUALIFY_GAMES}+ games and ${QUALIFY_PPR_TOTAL}+ total PPR fantasy points.
 * IDs use the format r0001, r0002, ...
 */

export const RETIRED_PLAYERS = [\n`;

for (const p of qualifying) {
  const escapedName = p.name.replace(/'/g, "\\'");
  retiredJS += `  { id:'${p.id}', name:'${escapedName}', team:'${p.lastTeam}', pos:'${p.pos}', pts:0, proj:0, avg:0, status:'RET', lastSeason:${p.lastSeason}, firstSeason:${p.firstSeason} },\n`;
}
retiredJS += `];\n`;

fs.writeFileSync(OUT_RETIRED, retiredJS);
console.log(`Wrote ${OUT_RETIRED} (${(retiredJS.length / 1024).toFixed(0)} KB, ${qualifying.length} players)`);

// ── Helper: build compact history entry for a player ──────────────────────────
function buildHistEntry(pos, seasons) {
  const seasonKeys = Object.keys(seasons).sort((a, b) => parseInt(b) - parseInt(a));
  const parts = [];
  for (const yr of seasonKeys) {
    const s = seasons[yr];
    const gp = s.games;
    const totalPts = s.fantasyPtsPpr;
    const avgPts = gp > 0 ? num(totalPts / gp, 1) : 0;
    const compact = { gp, totalPts, avgPts };
    if (s.team) compact.team = s.team;
    if (pos === 'QB') {
      if (s.passingYards) compact.passYds = s.passingYards;
      if (s.passingTds) compact.passTd = s.passingTds;
      if (s.passingInt) compact.int = s.passingInt;
      if (s.completions) compact.cmp = s.completions;
      if (s.attempts) compact.att = s.attempts;
      if (s.rushingYards) compact.rushYds = s.rushingYards;
      if (s.rushingTds) compact.rushTd = s.rushingTds;
      if (s.passingEpa) compact.passEpa = s.passingEpa;
    } else if (pos === 'RB') {
      if (s.rushingYards) compact.rushYds = s.rushingYards;
      if (s.rushingTds) compact.rushTd = s.rushingTds;
      if (s.carries) compact.carries = s.carries;
      if (s.receptions) compact.rec = s.receptions;
      if (s.receivingYards) compact.recYds = s.receivingYards;
      if (s.receivingTds) compact.recTd = s.receivingTds;
      if (s.targets) compact.tgt = s.targets;
    } else if (pos === 'WR') {
      if (s.receptions) compact.rec = s.receptions;
      if (s.targets) compact.tgt = s.targets;
      if (s.receivingYards) compact.recYds = s.receivingYards;
      if (s.receivingTds) compact.recTd = s.receivingTds;
      if (s.receivingYAC) compact.yac = s.receivingYAC;
      if (s.targetShare) compact.tgtShare = s.targetShare;
      if (s.rushingYards) compact.rushYds = s.rushingYards;
    } else if (pos === 'TE') {
      if (s.receptions) compact.rec = s.receptions;
      if (s.targets) compact.tgt = s.targets;
      if (s.receivingYards) compact.recYds = s.receivingYards;
      if (s.receivingTds) compact.recTd = s.receivingTds;
      if (s.targetShare) compact.tgtShare = s.targetShare;
    } else if (pos === 'K') {
      if (s.fgMade) compact.fgm = s.fgMade;
      if (s.fgAtt) compact.fga = s.fgAtt;
      if (s.fgPct) compact.fgPct = s.fgPct;
      if (s.patMade) compact.patm = s.patMade;
    } else if (['DE','DT','DL','NT','LB','ILB','OLB','MLB','CB','DB','FS','SS','S','SAF'].includes(pos)) {
      if (s.defTacklesCombined) compact.tkl = s.defTacklesCombined;
      if (s.defSacks) compact.sacks = s.defSacks;
      if (s.defInterceptions) compact.int = s.defInterceptions;
      if (s.defTFL) compact.tfl = s.defTFL;
      if (s.defPassDefended) compact.pd = s.defPassDefended;
      if (s.defFumblesForced) compact.ff = s.defFumblesForced;
    }
    parts.push(`'${yr}': ${JSON.stringify(compact)}`);
  }
  return parts;
}

// ── Regenerate historicalStats.js with active + retired players ───────────────
console.log('\nRegenerating historicalStats.js with retired player data...');

// Collect all seasons across both active and retired
const allSeasonsCombined = new Set([...allSeasons]);
qualifying.forEach(p => Object.keys(p.seasons).forEach(yr => allSeasonsCombined.add(parseInt(yr))));
const sortedSeasonsCombined = [...allSeasonsCombined].sort();

let histJSCombined = `/**
 * Historical Player Stats — Real NFL data from nflverse (1999-2025)
 * Generated from nfl_player_stats.csv by scripts/expand-stats.js
 * ${new Date().toISOString().split('T')[0]}
 *
 * Includes active players (p-IDs) and retired/inactive players (r-IDs).
 * All stats are regular-season only. Scoring format: PPR.
 */

export const HISTORICAL_STATS = {
  players: {\n`;

// Active players (reuse existing histJS entries by rebuilding)
for (const pid of sortedIds) {
  const { player, seasons } = matched[pid];
  const parts = buildHistEntry(player.pos, seasons);
  histJSCombined += `    ${pid}: { ${parts.join(', ')} }, // ${player.name}\n`;
}

// Retired players
for (const p of qualifying) {
  const parts = buildHistEntry(p.pos, p.seasons);
  if (parts.length === 0) continue;
  const escapedName = p.name.replace(/'/g, "\\'");
  histJSCombined += `    ${p.id}: { ${parts.join(', ')} }, // ${escapedName} (RET)\n`;
}

histJSCombined += `  },
  meta: {
    scoringFormat: 'ppr',
    lastUpdated: '${new Date().toISOString()}',
    seasons: ${JSON.stringify(sortedSeasonsCombined)}
  }
};\n`;

fs.writeFileSync(OUT_HISTORICAL, histJSCombined);
console.log(`Wrote ${OUT_HISTORICAL} (${(histJSCombined.length / 1024).toFixed(0)} KB)`);

// ── Generate inactivePlayers.js ───────────────────────────────────────────────
console.log('\nGenerating inactivePlayers.js...');

const inactiveList = Object.values(inactiveMatched);
// Sort by latest season desc, then career PPR desc
inactiveList.sort((a, b) => {
  if (b.latestSeason !== a.latestSeason) return b.latestSeason - a.latestSeason;
  const aTotal = Object.values(a.seasons).reduce((s, x) => s + (x.fantasyPtsPpr || 0), 0);
  const bTotal = Object.values(b.seasons).reduce((s, x) => s + (x.fantasyPtsPpr || 0), 0);
  return bTotal - aTotal;
});

console.log(`Inactive players collected: ${inactiveList.length}`);

let inactivePlayersJS = `/**
 * Inactive Players — All historical players not in the active roster
 * Generated from nfl_player_stats.csv by scripts/expand-stats.js
 * ${new Date().toISOString().split('T')[0]}
 *
 * All positions included (QB, RB, WR, TE, K, DL, LB, DB, OL, P, LS, etc.)
 * IDs use nflverse player_id format (e.g., "00-0019596").
 */

export const INACTIVE_PLAYERS = [\n`;

for (const p of inactiveList) {
  const years = Object.keys(p.seasons).map(Number).sort();
  const careerGames = Object.values(p.seasons).reduce((s, x) => s + (x.games || 0), 0);
  const careerFantasyPts = num(Object.values(p.seasons).reduce((s, x) => s + (x.fantasyPtsPpr || 0), 0), 1);
  const teamSet = [];
  for (const yr of years) {
    const t = p.seasons[yr].team;
    if (t && !teamSet.includes(t)) teamSet.push(t);
  }
  const escapedName = p.name.replace(/'/g, "\\'");
  inactivePlayersJS += `  { id:'${p.id}', name:'${escapedName}', team:'${p.team}', pos:'${p.pos}', posGroup:'${p.posGroup}', inactive:true, headshotUrl:'${p.headshot}', careerGames:${careerGames}, careerFantasyPts:${careerFantasyPts}, firstSeason:${years[0]}, lastSeason:${years[years.length - 1]}, careerSeasons:${JSON.stringify(years)}, teamHistory:${JSON.stringify(teamSet)} },\n`;
}

inactivePlayersJS += `];\n`;

fs.writeFileSync(OUT_INACTIVE_PLAYERS, inactivePlayersJS);
console.log(`Wrote ${OUT_INACTIVE_PLAYERS} (${(inactivePlayersJS.length / 1024).toFixed(0)} KB, ${inactiveList.length} players)`);

// ── Generate inactiveDetailedStats.js ─────────────────────────────────────────
console.log('\nGenerating inactiveDetailedStats.js...');

let inactiveDetailedJS = `/**
 * Inactive Player Detailed Stats — Full statistical breakdown per player per season
 * Generated from nfl_player_stats.csv by scripts/expand-stats.js
 * ${new Date().toISOString().split('T')[0]}
 */

export const INACTIVE_DETAILED_STATS = {\n`;

for (const p of inactiveList) {
  const seasonKeys = Object.keys(p.seasons).sort((a, b) => parseInt(b) - parseInt(a));
  const escapedName = p.name.replace(/'/g, "\\'");
  inactiveDetailedJS += `  '${p.id}': { // ${escapedName} (${p.pos})\n`;
  for (const yr of seasonKeys) {
    const trimmed = trimStats(p.seasons[yr], p.pos);
    const { season: _s, ...rest } = trimmed;
    inactiveDetailedJS += `    '${yr}': ${JSON.stringify(rest)},\n`;
  }
  inactiveDetailedJS += `  },\n`;
}
inactiveDetailedJS += `};\n`;

fs.writeFileSync(OUT_INACTIVE_DETAILED, inactiveDetailedJS);
console.log(`Wrote ${OUT_INACTIVE_DETAILED} (${(inactiveDetailedJS.length / 1024).toFixed(0)} KB)`);

// ── Generate inactiveHistoricalStats.js ───────────────────────────────────────
console.log('\nGenerating inactiveHistoricalStats.js...');

const inactiveSeasons = new Set();
inactiveList.forEach(p => Object.keys(p.seasons).forEach(yr => inactiveSeasons.add(parseInt(yr))));
const sortedInactiveSeasons = [...inactiveSeasons].sort();

let inactiveHistJS = `/**
 * Inactive Player Historical Stats — Compact per-season summaries
 * Generated from nfl_player_stats.csv by scripts/expand-stats.js
 * ${new Date().toISOString().split('T')[0]}
 */

export const INACTIVE_HISTORICAL_STATS = {
  players: {\n`;

for (const p of inactiveList) {
  const parts = buildHistEntry(p.pos, p.seasons);
  if (parts.length === 0) continue;
  const escapedName = p.name.replace(/'/g, "\\'");
  inactiveHistJS += `    '${p.id}': { ${parts.join(', ')} }, // ${escapedName}\n`;
}

inactiveHistJS += `  },
  meta: {
    scoringFormat: 'ppr',
    lastUpdated: '${new Date().toISOString()}',
    seasons: ${JSON.stringify(sortedInactiveSeasons)}
  }
};\n`;

fs.writeFileSync(OUT_INACTIVE_HISTORICAL, inactiveHistJS);
console.log(`Wrote ${OUT_INACTIVE_HISTORICAL} (${(inactiveHistJS.length / 1024).toFixed(0)} KB)`);

console.log('\nDone! All data files regenerated.');
