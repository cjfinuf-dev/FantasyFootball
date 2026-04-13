/**
 * sync-roster.js — Reconcile players.js against nflverse roster CSV
 *
 * Reads:  nflverse_cache/roster_2025.csv
 *         client/src/data/players.js
 * Writes: client/src/data/players.js        (updated team/status, new IR players)
 *         server/src/utils/playerRoster.js   (regenerated from players.js)
 *         player_map.json                    (pN → gsis_id mapping)
 *
 * Pipeline order: fetch-season.js --download → sync-roster.js → expand-stats.js
 *
 * Usage: node scripts/sync-roster.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ROSTER_CSV = path.join(ROOT, 'nflverse_cache', 'roster_2025.csv');
const PLAYERS_FILE = path.join(ROOT, 'client', 'src', 'data', 'players.js');
const PLAYER_MAP_OUT = path.join(ROOT, 'player_map.json');
const SERVER_ROSTER_OUT = path.join(ROOT, 'server', 'src', 'utils', 'playerRoster.js');

const FANTASY_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K']);
const POSITION_CAPS = { QB: 32, RB: 80, WR: 80, TE: 36, K: 32 };

// nflverse status → HexMetrics status
const STATUS_MAP = {
  ACT: 'healthy',
  RES: 'ir',
  INA: 'out',
  DEV: 'healthy',
  CUT: 'cut',
  RET: 'ret',
};

// ── CSV Parser ──────────────────────────────────────────────────────────────
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

// ── Name normalization (matches expand-stats.js) ────────────────────────────
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[.\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Parse roster CSV ────────────────────────────────────────────────────────
if (!fs.existsSync(ROSTER_CSV)) {
  console.error(`ERROR: ${ROSTER_CSV} not found. Run: node scripts/fetch-season.js --download`);
  process.exit(1);
}

console.log('Reading nflverse roster CSV...');
const rosterLines = fs.readFileSync(ROSTER_CSV, 'utf-8').split('\n').filter(l => l.trim());
const rHeaders = parseCSVLine(rosterLines[0]);

const col = {};
['full_name', 'position', 'team', 'status', 'gsis_id'].forEach(name => {
  col[name] = rHeaders.indexOf(name);
  if (col[name] === -1) {
    console.error(`ERROR: Column '${name}' not found in roster CSV. Headers: ${rHeaders.join(', ')}`);
    process.exit(1);
  }
});

const rosterMap = {}; // normalized name → roster entry

for (let i = 1; i < rosterLines.length; i++) {
  const vals = parseCSVLine(rosterLines[i]);
  if (vals.length < rHeaders.length) continue;

  const pos = (vals[col.position] || '').trim();
  if (!FANTASY_POSITIONS.has(pos)) continue;

  const entry = {
    fullName: (vals[col.full_name] || '').trim(),
    position: pos,
    team: (vals[col.team] || '').trim(),
    status: (vals[col.status] || '').trim(),
    gsisId: (vals[col.gsis_id] || '').trim(),
  };

  const norm = normalize(entry.fullName);
  if (!rosterMap[norm]) {
    rosterMap[norm] = entry;
  }
}
console.log(`  Roster: ${Object.keys(rosterMap).length} fantasy-position players`);

// ── 2. Parse players.js ────────────────────────────────────────────────────────
console.log('Reading players.js...');
const playersRaw = fs.readFileSync(PLAYERS_FILE, 'utf-8');

// Extract all player entries (handles any pos including DEF)
const playerRe = /\{\s*id:'(p\d+)',\s*name:'((?:[^'\\]|\\.)*)',\s*team:'([^']+)',\s*pos:'([^']+)',\s*pts:([\d.]+),\s*proj:([\d.]+),\s*avg:([\d.]+),\s*status:'([^']+)'([^}]*)\}/g;
const players = [];
let maxId = 0;
let pm;

while ((pm = playerRe.exec(playersRaw)) !== null) {
  const idNum = parseInt(pm[1].replace('p', ''));
  if (idNum > maxId) maxId = idNum;
  const name = pm[2].replace(/\\'/g, "'");
  players.push({
    id: pm[1],
    idNum,
    name,
    team: pm[3],
    pos: pm[4],
    pts: parseFloat(pm[5]),
    proj: parseFloat(pm[6]),
    avg: parseFloat(pm[7]),
    status: pm[8],
    extraStats: pm[9],
    changed: false,
  });
}

// Capture PLAYERS_LAST_UPDATED if present
const lastUpdatedMatch = playersRaw.match(/export const PLAYERS_LAST_UPDATED\s*=\s*(\{[^}]+\});/);
const lastUpdatedLine = lastUpdatedMatch ? `\nexport const PLAYERS_LAST_UPDATED = ${lastUpdatedMatch[1]};\n` : '';

console.log(`  Players: ${players.length}, max ID: p${maxId}`);

// Build normalized name lookup for existing players
const matchedNorms = new Set();
players.forEach(p => {
  matchedNorms.add(normalize(p.name));
  matchedNorms.add(normalize(p.name).replace(/\s+(jr|sr|ii|iii|iv|v)$/, ''));
});

// ── 3. Update existing players ──────────────────────────────────────────────────
console.log('\nReconciling existing players against roster...');
let updateCount = 0;
const playerMap = {}; // for player_map.json: pN → { gsis_id, name }

for (const p of players) {
  // Skip DEF entries — no individual roster match
  if (p.pos === 'DEF') continue;

  const norm = normalize(p.name);
  let rosterEntry = rosterMap[norm];
  if (!rosterEntry) {
    const stripped = norm.replace(/\s+(jr|sr|ii|iii|iv|v)$/, '');
    rosterEntry = rosterMap[stripped];
  }

  if (!rosterEntry) continue;

  // Build player_map entry
  if (rosterEntry.gsisId) {
    playerMap[p.id] = { gsis_id: rosterEntry.gsisId, name: p.name };
  }

  // Check team change
  if (rosterEntry.team && rosterEntry.team !== p.team) {
    console.log(`  TEAM: ${p.name} (${p.id}) ${p.team} → ${rosterEntry.team}`);
    p.team = rosterEntry.team;
    p.changed = true;
    updateCount++;
  }

  // Check status change
  const newStatus = STATUS_MAP[rosterEntry.status];
  if (newStatus && newStatus !== p.status) {
    if (rosterEntry.status === 'CUT' || rosterEntry.status === 'RET') {
      console.log(`  FLAG: ${p.name} (${p.id}) roster status=${rosterEntry.status} → ${newStatus}`);
    } else {
      console.log(`  STATUS: ${p.name} (${p.id}) ${p.status} → ${newStatus}`);
    }
    p.status = newStatus;
    p.changed = true;
    updateCount++;
  }
}
console.log(`  Updated ${updateCount} fields`);

// ── 4. Add missing RES (IR) players ─────────────────────────────────────────────
// Only add RES players who have historical stat data (i.e., actually played in NFL).
// This fills the gap for fantasy-relevant players who missed a season on IR.
console.log('\nChecking for IR players to add...');

// Build set of player names with meaningful fantasy production (50+ PPR pts in any season)
const CSV_PATH = path.join(ROOT, 'nfl_player_stats.csv');
const statsNames = new Set();
if (fs.existsSync(CSV_PATH)) {
  const csvLines = fs.readFileSync(CSV_PATH, 'utf-8').split('\n');
  const csvHeaders = parseCSVLine(csvLines[0]);
  const displayNameIdx = csvHeaders.indexOf('player_display_name');
  const pprIdx = csvHeaders.indexOf('fantasy_points_ppr');
  const seasonTypeIdx = csvHeaders.indexOf('season_type');
  if (displayNameIdx >= 0) {
    for (let i = 1; i < csvLines.length; i++) {
      if (!csvLines[i].trim()) continue;
      const vals = parseCSVLine(csvLines[i]);
      // Only count REG season production
      if (seasonTypeIdx >= 0 && (vals[seasonTypeIdx] || '').trim() !== 'REG') continue;
      const ppr = parseFloat(vals[pprIdx] || '0');
      if (ppr < 50) continue; // skip seasons with trivial production
      const name = (vals[displayNameIdx] || '').trim();
      if (name) statsNames.add(normalize(name));
    }
  }
  console.log(`  Stats CSV: ${statsNames.size} players with 50+ PPR in a season`);
}

let addCount = 0;
const skipped = [];

for (const [norm, entry] of Object.entries(rosterMap)) {
  // Only add RES (IR/reserve) players not already in players.js
  if (entry.status !== 'RES') continue;

  const stripped = norm.replace(/\s+(jr|sr|ii|iii|iv|v)$/, '');
  if (matchedNorms.has(norm) || matchedNorms.has(stripped)) continue;

  const pos = entry.position;

  // Only add if they have historical stats (filters out deep backups)
  if (!statsNames.has(norm) && !statsNames.has(stripped)) {
    skipped.push(`${entry.fullName} (${pos} ${entry.team}) — no stat history`);
    continue;
  }

  // Assign next ID
  maxId++;
  const newId = `p${maxId}`;

  const newPlayer = {
    id: newId,
    idNum: maxId,
    name: entry.fullName,
    team: entry.team,
    pos: pos,
    pts: 0,
    proj: 0,
    avg: 0,
    status: 'ir',
    extraStats: '',
    changed: true,
  };

  players.push(newPlayer);
  matchedNorms.add(norm);

  if (entry.gsisId) {
    playerMap[newId] = { gsis_id: entry.gsisId, name: entry.fullName };
  }

  console.log(`  ADD: ${entry.fullName} → ${newId} (${pos} ${entry.team}, status:ir)`);
  addCount++;
}

console.log(`  Added ${addCount} IR players`);
if (skipped.length > 0) {
  console.log(`  Skipped (no stat history): ${skipped.length} players`);
}

// ── 5. Rewrite players.js ───────────────────────────────────────────────────────
console.log('\nRewriting players.js...');

// Group by position, preserving original order within groups
const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const posGroups = {};
POS_ORDER.forEach(p => { posGroups[p] = []; });
players.forEach(p => {
  if (posGroups[p.pos]) posGroups[p.pos].push(p);
});

let playersJS = `export const PLAYERS = [\n`;

for (const pos of POS_ORDER) {
  const group = posGroups[pos];
  if (group.length === 0) continue;
  const label = pos === 'DEF' ? 'DEF' : `${pos}S`;
  playersJS += `  // ===== ${label} (${group.length}) =====\n`;
  for (const p of group) {
    const escapedName = p.name.replace(/'/g, "\\'");
    let line = `  { id:'${p.id}', name:'${escapedName}', team:'${p.team}', pos:'${p.pos}', pts:${p.pts}, proj:${p.proj}, avg:${p.avg}, status:'${p.status}'`;

    if (p.extraStats && p.extraStats.trim()) {
      line += p.extraStats;
    }

    line += ` },`;
    playersJS += line + '\n';
  }
  playersJS += '\n';
}

playersJS += `];\n`;
if (lastUpdatedLine) playersJS += lastUpdatedLine;

fs.writeFileSync(PLAYERS_FILE, playersJS);
console.log(`  Wrote ${PLAYERS_FILE} (${players.length} players)`);

// ── 6. Generate player_map.json ─────────────────────────────────────────────────
console.log('\nGenerating player_map.json...');
fs.writeFileSync(PLAYER_MAP_OUT, JSON.stringify(playerMap, null, 2) + '\n');
console.log(`  Wrote ${PLAYER_MAP_OUT} (${Object.keys(playerMap).length} entries)`);

// ── 7. Regenerate server/src/utils/playerRoster.js ──────────────────────────────
console.log('\nRegenerating server playerRoster.js...');

let serverJS = `// Auto-generated from client/src/data/players.js by scripts/sync-roster.js\nconst PLAYER_ROSTER = {\n`;

for (const p of players) {
  const key = p.name.toLowerCase();
  serverJS += `  ${JSON.stringify(key)}: { id: ${JSON.stringify(p.id)}, team: ${JSON.stringify(p.team)}, pos: ${JSON.stringify(p.pos)} },\n`;
}

serverJS += `};\n\nmodule.exports = { PLAYER_ROSTER };\n`;

fs.writeFileSync(SERVER_ROSTER_OUT, serverJS);
console.log(`  Wrote ${SERVER_ROSTER_OUT} (${players.length} entries)`);

// ── Summary ─────────────────────────────────────────────────────────────────────
console.log('\n=== Sync Complete ===');
console.log(`  Existing players updated: ${updateCount}`);
console.log(`  IR players added: ${addCount}`);
console.log(`  Total players: ${players.length}`);
const breakdown = POS_ORDER.filter(p => posGroups[p].length > 0).map(p => `${p}:${posGroups[p].length}`).join(', ');
console.log(`  Position breakdown: ${breakdown}`);
