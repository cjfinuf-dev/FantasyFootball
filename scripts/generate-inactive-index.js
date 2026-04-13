/**
 * generate-inactive-index.js
 *
 * Reads inactivePlayers.js and outputs a slim index (inactivePlayersIndex.js)
 * with only the fields needed for list-view rendering in PlayerRankings.
 *
 * Full data stays in inactivePlayers.js for on-click detail loading.
 *
 * Usage: node scripts/generate-inactive-index.js
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'client', 'src', 'data', 'inactivePlayers.js');
const OUTPUT = path.join(__dirname, '..', 'client', 'src', 'data', 'inactivePlayersIndex.js');

// Read and eval the source file to get the array
const src = fs.readFileSync(INPUT, 'utf-8');
// Strip the export to make it evaluable
const evalSrc = src.replace(/^export\s+const\s+INACTIVE_PLAYERS\s*=\s*/m, 'var INACTIVE_PLAYERS = ');
eval(evalSrc);

// Headshot URL prefixes — all NFL headshots use one of these two
const UPLOAD_PREFIX = 'https://static.www.nfl.com/image/upload/f_auto,q_auto/league/';
const PRIVATE_PREFIX = 'https://static.www.nfl.com/image/private/f_auto,q_auto/league/';

function compressHeadshot(url) {
  if (!url) return '';
  if (url.startsWith(UPLOAD_PREFIX)) return 'u' + url.slice(UPLOAD_PREFIX.length);
  if (url.startsWith(PRIVATE_PREFIX)) return 'p' + url.slice(PRIVATE_PREFIX.length);
  // Shouldn't happen, but keep full URL as fallback
  return url;
}

const index = INACTIVE_PLAYERS.map(p => ({
  id: p.id,
  name: p.name,
  team: p.team,
  pos: p.pos,
  h: compressHeadshot(p.headshotUrl),
  lastSeason: p.lastSeason,
  gp: p.careerGames,
  pts: p.careerFantasyPts,
}));

const today = new Date().toISOString().slice(0, 10);
const header = `/**
 * Inactive Players Index — slim list-view data
 * Generated from inactivePlayers.js by scripts/generate-inactive-index.js
 * ${today}
 *
 * ${index.length} players. Full career data loads on-demand from inactivePlayers.js.
 * Headshot hashes: 'u' prefix = upload, 'p' prefix = private, '' = none.
 */

`;

const entries = index.map(p => {
  const parts = [
    `id:'${p.id}'`,
    `name:'${p.name.replace(/'/g, "\\'")}'`,
    `team:'${p.team}'`,
    `pos:'${p.pos}'`,
    `h:'${p.h}'`,
    `lastSeason:${p.lastSeason}`,
    `gp:${p.gp}`,
    `pts:${p.pts}`,
  ];
  return `  { ${parts.join(', ')} }`;
});

const output = header + 'export const INACTIVE_INDEX = [\n' + entries.join(',\n') + ',\n];\n';

fs.writeFileSync(OUTPUT, output, 'utf-8');

const rawKB = (Buffer.byteLength(output, 'utf-8') / 1024).toFixed(0);
const srcKB = (fs.statSync(INPUT).size / 1024).toFixed(0);
console.log(`Generated ${OUTPUT}`);
console.log(`  Source: ${srcKB}KB (${INACTIVE_PLAYERS.length} players)`);
console.log(`  Index:  ${rawKB}KB (${index.length} players)`);
console.log(`  Reduction: ${(100 - (rawKB / srcKB) * 100).toFixed(0)}%`);
