/**
 * fix-ages.js — Generate real player ages from nflverse roster birth dates
 *
 * Reads: /tmp/nfl_roster_2025.csv (downloaded from nflverse)
 *        client/src/data/players.js (for player ID → name mapping)
 * Writes: client/src/data/playerAges.js
 *
 * Usage: node scripts/fix-ages.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ROSTER_CSV = path.join(ROOT, 'roster_2025.csv');
const PLAYERS_FILE = path.join(ROOT, 'client/src/data/players.js');
const OUTPUT = path.join(ROOT, 'client/src/data/playerAges.js');

// Parse our players from players.js
const pContent = fs.readFileSync(PLAYERS_FILE, 'utf-8');
const pRe = /id:'(p\d+)',\s*name:'((?:[^'\\]|\\.)*)',/g;
const players = [];
let m;
while ((m = pRe.exec(pContent)) !== null) {
  players.push({ id: m[1], name: m[2].replace(/\\'/g, "'") });
}
console.log(`Found ${players.length} players in players.js`);

// Parse nflverse roster CSV
const rosterLines = fs.readFileSync(ROSTER_CSV, 'utf-8').split('\n');
const rHeaders = rosterLines[0].split(',');
const nameIdx = rHeaders.indexOf('full_name');
const birthIdx = rHeaders.indexOf('birth_date');
console.log(`Roster columns: full_name=${nameIdx}, birth_date=${birthIdx}`);

// Build name -> birth_date lookup (lowercase, handle duplicates by keeping first)
const birthMap = {};
for (let i = 1; i < rosterLines.length; i++) {
  const cols = rosterLines[i].split(',');
  const name = (cols[nameIdx] || '').trim();
  const birth = (cols[birthIdx] || '').trim();
  if (name && birth && !birthMap[name.toLowerCase()]) {
    birthMap[name.toLowerCase()] = birth;
  }
}
console.log(`Roster entries with birth dates: ${Object.keys(birthMap).length}`);

// Alternative name mappings for players whose names differ between our data and nflverse
const ALT_NAMES = {
  "michael penix jr.": "michael penix",
  "chris godwin jr.": "chris godwin",
  "theo wease jr.": "theo wease",
  "chris rodriguez jr.": "chris rodriguez",
  "harold fannin jr.": "harold fannin",
  "oronde gadsden ii": "oronde gadsden",
  "luther burden iii": "luther burden",
  "kenneth walker iii": "kenneth walker",
  "deebo samuel sr.": "deebo samuel",
  "marvin harrison jr.": "marvin harrison",
  "brian thomas jr.": "brian thomas",
  "kevin austin jr.": "kevin austin",
  "tyrone tracy jr.": "tyrone tracy",
};

// Reference date: September 1, 2025
const refDate = new Date('2025-09-01');

function computeAge(birthStr) {
  const bd = new Date(birthStr);
  if (isNaN(bd.getTime())) return null;
  let age = refDate.getFullYear() - bd.getFullYear();
  const monthDay = new Date(refDate.getFullYear(), bd.getMonth(), bd.getDate());
  if (refDate < monthDay) age--;
  return age;
}

const results = [];
let matched = 0, unmatched = 0;

for (const p of players) {
  const lower = p.name.toLowerCase();
  let birth = birthMap[lower];

  // Try alt names
  if (!birth && ALT_NAMES[lower]) {
    birth = birthMap[ALT_NAMES[lower]];
  }

  // Try without Jr./Sr./III/II suffixes
  if (!birth) {
    const stripped = lower.replace(/\s+(jr\.?|sr\.?|ii|iii|iv|v)$/i, '').trim();
    birth = birthMap[stripped];
  }

  // Try first initial + last name pattern
  if (!birth) {
    const parts = p.name.split(' ');
    if (parts.length >= 2) {
      const lastFirst = parts[parts.length - 1].toLowerCase();
      // Search for any roster entry ending with this last name
      for (const [rName, rBirth] of Object.entries(birthMap)) {
        if (rName.endsWith(lastFirst) && rName.includes(parts[0].toLowerCase().charAt(0))) {
          birth = rBirth;
          break;
        }
      }
    }
  }

  if (birth) {
    const age = computeAge(birth);
    results.push({ id: p.id, name: p.name, age, birth });
    if (age !== null) matched++;
    else unmatched++;
  } else {
    results.push({ id: p.id, name: p.name, age: null, birth: null });
    unmatched++;
  }
}

console.log(`\nMatched: ${matched}, Unmatched: ${unmatched}`);
if (unmatched > 0) {
  console.log('\nUnmatched players:');
  results.filter(r => r.age === null).forEach(r => console.log(`  ${r.id} ${r.name}`));
}

// Write the ages file
let output = `/**
 * Player Ages for 2025-26 season
 * Generated from nflverse roster_2025.csv birth dates
 * Reference date: September 1, 2025
 */

export const PLAYER_AGES = {\n`;

for (const r of results) {
  const age = r.age !== null ? r.age : 25;
  const escapedName = r.name.replace(/'/g, "\\'");
  const flag = r.age === null ? ' // UNMATCHED - placeholder' : '';
  output += `  ${r.id}: ${age},${flag} // ${r.name}\n`;
}

output += `};\n\nexport function getPlayerAge(playerId) {\n  return PLAYER_AGES[playerId] || null;\n}\n`;

fs.writeFileSync(OUTPUT, output);
console.log(`\nWrote ${OUTPUT} with ${results.length} entries`);

// Spot checks
const checks = [
  { id: 'p1', expect: 'Josh Allen ~29' },
  { id: 'p37', expect: "De'Von Achane ~23" },
  { id: 'p72', expect: 'Kareem Hunt ~30' },
  { id: 'p115', expect: "Ja'Marr Chase ~25" },
  { id: 'p176', expect: 'Xavier Worthy ~22' },
  { id: 'p253', expect: 'Nick Folk ~41' },
  { id: 'p260', expect: 'Matt Prater ~40' },
  { id: 'p201', expect: 'Travis Kelce ~36' },
  { id: 'p40', expect: 'Derrick Henry ~31' },
];
console.log('\nSpot checks:');
checks.forEach(({ id, expect }) => {
  const r = results.find(x => x.id === id);
  if (r) console.log(`  ${r.name}: age ${r.age} (expected ${expect})${r.birth ? ' born ' + r.birth : ''}`);
});
