const fs = require('fs');
const path = require('path');
const { getDb, saveDb } = require('../db/connection');

const STATS_FILE = path.resolve(__dirname, '../../data/historical-stats.json');

let _cache = null;

function loadStatsFile() {
  if (!fs.existsSync(STATS_FILE)) {
    const empty = { meta: { scoringFormat: 'ppr', lastUpdated: new Date().toISOString(), seasons: [] }, players: {} };
    fs.writeFileSync(STATS_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
}

function saveStatsFile(data) {
  data.meta.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2));
  _cache = data;
}

function getStats() {
  if (!_cache) _cache = loadStatsFile();
  return _cache;
}

async function syncToDb() {
  const db = await getDb();
  const data = getStats();

  db.run('DELETE FROM historical_stats');

  const stmt = db.prepare('INSERT INTO historical_stats (player_id, season, games_played, total_pts, avg_pts) VALUES (?, ?, ?, ?, ?)');
  for (const [playerId, seasons] of Object.entries(data.players)) {
    for (const [year, s] of Object.entries(seasons)) {
      stmt.run([playerId, Number(year), s.gp, s.totalPts, s.avgPts]);
    }
  }
  stmt.free();
  saveDb();
  console.log(`[Stats] Synced ${Object.keys(data.players).length} players to DB`);
}

function getAllHistoricalStats() {
  return getStats();
}

async function updateSeason(year, playerStats) {
  const data = getStats();
  const yearStr = String(year);

  for (const [playerId, stats] of Object.entries(playerStats)) {
    if (!data.players[playerId]) data.players[playerId] = {};
    data.players[playerId][yearStr] = {
      gp: stats.gp,
      totalPts: Math.round(stats.totalPts * 10) / 10,
      avgPts: Math.round(stats.avgPts * 10) / 10,
    };
  }

  if (!data.meta.seasons.includes(year)) {
    data.meta.seasons.push(year);
    data.meta.seasons.sort();
  }

  saveStatsFile(data);
  await syncToDb();
  return { updated: Object.keys(playerStats).length, season: year };
}

async function updatePlayer(playerId, seasons) {
  const data = getStats();
  if (!data.players[playerId]) data.players[playerId] = {};

  for (const [year, stats] of Object.entries(seasons)) {
    data.players[playerId][year] = {
      gp: stats.gp,
      totalPts: Math.round(stats.totalPts * 10) / 10,
      avgPts: Math.round(stats.avgPts * 10) / 10,
    };
    const yearNum = Number(year);
    if (!data.meta.seasons.includes(yearNum)) {
      data.meta.seasons.push(yearNum);
      data.meta.seasons.sort();
    }
  }

  saveStatsFile(data);
  await syncToDb();
  return { playerId, seasons: Object.keys(seasons) };
}

module.exports = { syncToDb, getAllHistoricalStats, updateSeason, updatePlayer };
