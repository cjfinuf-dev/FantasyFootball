/**
 * fetch-season.js — Process nflverse season data into master CSV
 *
 * Reads locally cached nflverse CSVs (offense + kicking), remaps columns
 * to match the master CSV schema, merges kicking into offense rows,
 * and appends to nfl_player_stats.csv.
 *
 * Usage:
 *   node scripts/fetch-season.js              # Append all years not already in master CSV
 *   node scripts/fetch-season.js 2020         # Append single year
 *   node scripts/fetch-season.js --download   # Re-download nflverse cache then process
 *
 * Cache files (download once, reuse forever):
 *   nflverse_cache/player_stats_season.csv
 *   nflverse_cache/player_stats_kicking_season.csv
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT, 'nflverse_cache');
const OFFENSE_CACHE = path.join(CACHE_DIR, 'player_stats_season.csv');
const KICKING_CACHE = path.join(CACHE_DIR, 'player_stats_kicking_season.csv');
const CSV_PATH = path.join(ROOT, 'nfl_player_stats.csv');

const ROSTER_CACHE = path.join(CACHE_DIR, 'roster_2025.csv');

const OFFENSE_URL = 'https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_season.csv';
const KICKING_URL = 'https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_kicking_season.csv';
const ROSTER_URL = 'https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_2025.csv';

// ── Target schema (must match master CSV header exactly) ──────────────────────
const TARGET_COLUMNS = [
  'player_id','player_name','player_display_name','position','position_group','headshot_url',
  'season','season_type','recent_team','games',
  'completions','attempts','passing_yards','passing_tds','passing_interceptions',
  'sacks_suffered','sack_yards_lost','sack_fumbles','sack_fumbles_lost',
  'passing_air_yards','passing_yards_after_catch','passing_first_downs',
  'passing_epa','passing_cpoe','passing_2pt_conversions','pacr',
  'carries','rushing_yards','rushing_tds','rushing_fumbles','rushing_fumbles_lost',
  'rushing_first_downs','rushing_epa','rushing_2pt_conversions',
  'receptions','targets','receiving_yards','receiving_tds','receiving_fumbles','receiving_fumbles_lost',
  'receiving_air_yards','receiving_yards_after_catch','receiving_first_downs',
  'receiving_epa','receiving_2pt_conversions','racr','target_share','air_yards_share','wopr',
  'special_teams_tds',
  'def_tackles_solo','def_tackles_with_assist','def_tackle_assists',
  'def_tackles_for_loss','def_tackles_for_loss_yards',
  'def_fumbles_forced','def_sacks','def_sack_yards','def_qb_hits',
  'def_interceptions','def_interception_yards','def_pass_defended',
  'def_tds','def_fumbles','def_safeties',
  'misc_yards',
  'fumble_recovery_own','fumble_recovery_yards_own',
  'fumble_recovery_opp','fumble_recovery_yards_opp','fumble_recovery_tds',
  'penalties','penalty_yards',
  'punt_returns','punt_return_yards','kickoff_returns','kickoff_return_yards',
  'fg_made','fg_att','fg_missed','fg_blocked','fg_long','fg_pct',
  'fg_made_0_19','fg_made_20_29','fg_made_30_39','fg_made_40_49','fg_made_50_59','fg_made_60_',
  'fg_missed_0_19','fg_missed_20_29','fg_missed_30_39','fg_missed_40_49','fg_missed_50_59','fg_missed_60_',
  'fg_made_list','fg_missed_list','fg_blocked_list',
  'fg_made_distance','fg_missed_distance','fg_blocked_distance',
  'pat_made','pat_att','pat_missed','pat_blocked','pat_pct',
  'gwfg_made','gwfg_att','gwfg_missed','gwfg_blocked','gwfg_distance_list',
  'fantasy_points','fantasy_points_ppr'
];

// ── Column remaps (nflverse name → target name) ──────────────────────────────
const OFFENSE_REMAP = {
  interceptions: 'passing_interceptions',
  sacks: 'sacks_suffered',
  sack_yards: 'sack_yards_lost',
};

const KICKING_REMAP = {
  team: 'recent_team',
};

const DROP_COLS = new Set(['dakota']);

// ── CSV parser ───────────────────────────────────────────────────────────────
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

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length !== headers.length) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx]; });
    rows.push(row);
  }
  return { headers, rows };
}

function csvEscape(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ── Download helper ──────────────────────────────────────────────────────────
function downloadFile(url, dest) {
  console.log(`Downloading ${url}...`);
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  execSync(`curl -sL "${url}" -o "${dest}"`, { stdio: 'inherit' });
  const lines = fs.readFileSync(dest, 'utf-8').split('\n').length;
  console.log(`  Saved ${dest} (${lines} lines)`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const doDownload = args.includes('--download');
  const yearArg = args.find(a => /^\d{4}$/.test(a));

  // Download if requested or cache missing
  if (doDownload || !fs.existsSync(OFFENSE_CACHE) || !fs.existsSync(KICKING_CACHE)) {
    downloadFile(OFFENSE_URL, OFFENSE_CACHE);
    downloadFile(KICKING_URL, KICKING_CACHE);
    downloadFile(ROSTER_URL, ROSTER_CACHE);
  }

  // Read cached files
  console.log('Reading cached nflverse data...');
  const offense = parseCSV(fs.readFileSync(OFFENSE_CACHE, 'utf-8'));
  const kicking = parseCSV(fs.readFileSync(KICKING_CACHE, 'utf-8'));
  console.log(`  Offense: ${offense.rows.length} rows, Kicking: ${kicking.rows.length} rows`);

  // Determine which seasons already exist in master CSV
  const existingSeasons = new Set();
  if (fs.existsSync(CSV_PATH)) {
    const masterText = fs.readFileSync(CSV_PATH, 'utf-8');
    const masterLines = masterText.split('\n').filter(l => l.trim());
    const masterHeaders = parseCSVLine(masterLines[0]);
    const seasonIdx = masterHeaders.indexOf('season');
    for (let i = 1; i < masterLines.length; i++) {
      const vals = parseCSVLine(masterLines[i]);
      if (vals[seasonIdx]) existingSeasons.add(vals[seasonIdx]);
    }
    console.log(`  Master CSV has seasons: ${[...existingSeasons].sort().join(', ')}`);
  }

  // Build kicking lookup: (player_id, season, season_type) → kicking row
  const kickingMap = {};
  for (const row of kicking.rows) {
    // Remap column names
    const remapped = {};
    for (const [k, v] of Object.entries(row)) {
      if (DROP_COLS.has(k)) continue;
      const newKey = KICKING_REMAP[k] || k;
      remapped[newKey] = v;
    }
    const key = `${remapped.player_id}|${remapped.season}|${remapped.season_type}`;
    kickingMap[key] = remapped;
  }
  console.log(`  Kicking lookup: ${Object.keys(kickingMap).length} entries`);

  // Process offense rows — remap + merge kicking
  const newRows = [];
  const usedKickingKeys = new Set();

  for (const row of offense.rows) {
    const season = row.season;

    // Filter by year
    if (yearArg && season !== yearArg) continue;
    if (!yearArg && existingSeasons.has(season)) continue;

    // Remap offense columns
    const remapped = {};
    for (const [k, v] of Object.entries(row)) {
      if (DROP_COLS.has(k)) continue;
      const newKey = OFFENSE_REMAP[k] || k;
      remapped[newKey] = v;
    }

    // Merge kicking data if available
    const kickKey = `${remapped.player_id}|${season}|${remapped.season_type}`;
    const kickRow = kickingMap[kickKey];
    if (kickRow) {
      usedKickingKeys.add(kickKey);
      // Merge kicking columns (fg_*, pat_*, gwfg_*)
      for (const [k, v] of Object.entries(kickRow)) {
        if (k.startsWith('fg_') || k.startsWith('pat_') || k.startsWith('gwfg_')) {
          remapped[k] = v;
        }
      }
    }

    newRows.push(remapped);
  }

  // Add kicking-only players (kickers with no offense row)
  for (const [key, kickRow] of Object.entries(kickingMap)) {
    if (usedKickingKeys.has(key)) continue;
    const season = kickRow.season;
    if (yearArg && season !== yearArg) continue;
    if (!yearArg && existingSeasons.has(season)) continue;
    newRows.push(kickRow);
  }

  if (newRows.length === 0) {
    console.log('No new rows to add. All requested seasons already in master CSV.');
    return;
  }

  // Sort by season (asc) then player_id
  newRows.sort((a, b) => {
    const sy = (a.season || '').localeCompare(b.season || '');
    if (sy !== 0) return sy;
    return (a.player_id || '').localeCompare(b.player_id || '');
  });

  // Build CSV lines in target column order
  const csvLines = newRows.map(row => {
    return TARGET_COLUMNS.map(col => csvEscape(row[col] || '')).join(',');
  });

  // Count seasons being added
  const addedSeasons = new Set(newRows.map(r => r.season));
  console.log(`\nAdding ${newRows.length} rows for seasons: ${[...addedSeasons].sort().join(', ')}`);

  // Append to master CSV (create with header if doesn't exist)
  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, TARGET_COLUMNS.join(',') + '\n' + csvLines.join('\n') + '\n');
    console.log(`Created ${CSV_PATH}`);
  } else {
    fs.appendFileSync(CSV_PATH, csvLines.join('\n') + '\n');
    console.log(`Appended to ${CSV_PATH}`);
  }

  // Report
  const totalLines = fs.readFileSync(CSV_PATH, 'utf-8').split('\n').filter(l => l.trim()).length;
  console.log(`Master CSV now has ${totalLines - 1} data rows (${totalLines} lines with header)`);
}

main();
