const https = require('https');

// ─── SSE Client Management ───
const clients = new Set();

function addClient(res) { clients.add(res); }
function removeClient(res) { clients.delete(res); }

function broadcastToClients(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { removeClient(res); }
  }
}

// ─── State ───
let pollTimer = null;
let lastState = null;       // cached for initial send on new connections
let activeGames = false;    // controls adaptive poll interval

function getLastState() { return lastState; }

// ─── ESPN API Helpers ───
const SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
const SUMMARY_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'HexMetrics/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── ESPN Status Mapping ───
function mapStatus(espnStatus) {
  if (!espnStatus) return 'scheduled';
  const t = espnStatus.type?.name || '';
  if (t === 'STATUS_IN_PROGRESS' || t === 'STATUS_HALFTIME') return 'in';
  if (t === 'STATUS_FINAL' || t === 'STATUS_END_PERIOD') return 'final';
  return 'scheduled';
}

// ─── Scoreboard Fetch ───
async function fetchScoreboard() {
  const data = await fetchJson(SCOREBOARD_URL);
  const events = data?.events || [];
  const games = {};

  for (const ev of events) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const status = mapStatus(comp.status);
    const home = comp.competitors?.find(c => c.homeAway === 'home');
    const away = comp.competitors?.find(c => c.homeAway === 'away');
    games[ev.id] = {
      status,
      home: home?.team?.abbreviation || '???',
      away: away?.team?.abbreviation || '???',
      quarter: comp.status?.period || 0,
      clock: comp.status?.displayClock || '',
    };
  }

  return { games, week: data?.week?.number || null };
}

// ─── Box Score Parsing ───
// ESPN boxscore.players[] has team-level arrays. Each team has statistics[]
// with categories like passing, rushing, receiving, kicking, etc.
// Each category has labels[] (column headers) and athletes[] with stats[] (values).

function extractPlayerStats(boxScore, gameStatus) {
  const players = {};
  const teamPlayers = boxScore?.players || [];

  for (const teamBlock of teamPlayers) {
    const teamAbbr = teamBlock.team?.abbreviation || '???';

    for (const statGroup of (teamBlock.statistics || [])) {
      const category = (statGroup.name || '').toLowerCase();
      const labels = (statGroup.labels || []).map(l => l.toLowerCase());

      for (const athlete of (statGroup.athletes || [])) {
        const name = athlete.athlete?.displayName;
        if (!name) continue;

        if (!players[name]) {
          players[name] = {
            status: gameStatus === 'final' ? 'final' : 'playing',
            team: teamAbbr,
            rawStats: {},
          };
        }

        const vals = athlete.stats || [];
        const parsed = {};
        for (let i = 0; i < labels.length; i++) {
          const v = vals[i];
          // ESPN sends "3/5" for completions/attempts, "1-2" for FG, etc.
          parsed[labels[i]] = v;
        }

        mapCategoryStats(players[name].rawStats, category, parsed);
      }
    }
  }

  return players;
}

// Map ESPN stat labels → our rawStats shape
function mapCategoryStats(rawStats, category, parsed) {
  if (category === 'passing') {
    const cmpAtt = (parsed['c/att'] || '0/0').split('/');
    rawStats.passing = {
      yards: num(parsed['yds']),
      td: num(parsed['td']),
      int: num(parsed['int']),
      twoPt: 0, // ESPN doesn't separate 2PT in box score — rare enough to skip
      sacked: num(parsed['sacks']),
    };
  } else if (category === 'rushing') {
    rawStats.rushing = {
      yards: num(parsed['yds']),
      td: num(parsed['td']),
      twoPt: 0,
      fumbleLost: num(parsed['fum']),
    };
  } else if (category === 'receiving') {
    rawStats.receiving = {
      yards: num(parsed['yds']),
      td: num(parsed['td']),
      receptions: num(parsed['rec']),
      twoPt: 0,
    };
  } else if (category === 'kicking') {
    // ESPN shows FG as "2/3" and individual distances in detail
    const fgParts = (parsed['fg'] || '0/0').split('/');
    const xpParts = (parsed['xp'] || '0/0').split('/');
    const fgMade = num(fgParts[0]);
    const fgAtt = num(fgParts[1]);
    const pat = num(xpParts[0]);
    const patAtt = num(xpParts[1]);
    rawStats.kicking = {
      fgMade: [],      // distances not available from box score — bucketed as 30-39 default
      fgMissed: [],
      pat,
      missedPat: patAtt - pat,
    };
    // Without individual FG distances, put all made FGs in 30-39 bucket as conservative default
    for (let i = 0; i < fgMade; i++) rawStats.kicking.fgMade.push(35);
    for (let i = 0; i < (fgAtt - fgMade); i++) rawStats.kicking.fgMissed.push(35);
  } else if (category === 'defensive') {
    // DST stats come from the team defensive line in the box score
    rawStats.dst = {
      sack: num(parsed['sacks']),
      int: num(parsed['int']),
      fumbleRec: num(parsed['fum rec']),
      defTd: num(parsed['td']),
      stTd: 0,
      safety: 0,
      blockedKick: 0,
      ptsAllowed: num(parsed['pts allowed'] || parsed['pa']),
    };
  }
}

function num(v) {
  if (v == null) return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// ─── Per-Game Summary Fetch ───
async function fetchGameSummary(gameId) {
  const data = await fetchJson(`${SUMMARY_URL}?event=${gameId}`);
  return data?.boxscore || null;
}

// ─── Poll Loop ───
async function pollOnce() {
  try {
    const { games, week } = await fetchScoreboard();
    const activeIds = [];
    const finalIds = [];

    for (const [id, g] of Object.entries(games)) {
      if (g.status === 'in') activeIds.push(id);
      else if (g.status === 'final') finalIds.push(id);
    }

    activeGames = activeIds.length > 0;

    // Fetch box scores for active + final games (rate limit: 1 req/sec)
    const allPlayers = {};
    const gameIds = [...activeIds, ...finalIds];

    for (const gameId of gameIds) {
      await sleep(1000); // 1 req/sec rate limit matching espn.service.js
      try {
        const boxScore = await fetchGameSummary(gameId);
        if (boxScore) {
          const gamePlayers = extractPlayerStats(boxScore, games[gameId].status);
          Object.assign(allPlayers, gamePlayers);
        }
      } catch (err) {
        console.error(`[LiveScoring] Failed to fetch summary for game ${gameId}:`, err.message);
      }
    }

    const state = {
      timestamp: new Date().toISOString(),
      week,
      games,
      players: allPlayers,
    };

    lastState = state;
    broadcastToClients('scores', state);
    console.log(`[LiveScoring] Poll complete — ${activeIds.length} active, ${finalIds.length} final, ${Object.keys(allPlayers).length} players`);
  } catch (err) {
    console.error('[LiveScoring] Poll error:', err.message);
    activeGames = false; // back off on error
  }
}

function getInterval() {
  // Adaptive: 30s when games active, 5min when idle
  return activeGames ? 30_000 : 300_000;
}

async function schedulePoll() {
  await pollOnce();
  pollTimer = setTimeout(schedulePoll, getInterval());
}

function startPolling() {
  if (pollTimer) return;
  console.log('[LiveScoring] Starting poll loop');
  schedulePoll();
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
    console.log('[LiveScoring] Stopped poll loop');
  }
}

function getClientCount() { return clients.size; }

module.exports = {
  addClient,
  removeClient,
  getClientCount,
  getLastState,
  broadcastToClients,
  startPolling,
  stopPolling,
};
