const { getDb, saveDb } = require('../db/connection');

async function getUserLeagues(userId) {
  const db = await getDb();
  const result = db.exec(`
    SELECT l.id, l.name, l.type, l.scoring_preset, l.league_size, l.season, l.created_at, lm.team_name, lm.role
    FROM leagues l
    JOIN league_members lm ON lm.league_id = l.id
    WHERE lm.user_id = ?
    ORDER BY l.created_at DESC
  `, [userId]);

  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });
}

async function createLeague({ name, type, scoringPreset, scoringJson, rosterJson, leagueSize, season, settingsJson, teamName, userId }) {
  const db = await getDb();

  db.run(`
    INSERT INTO leagues (name, type, scoring_preset, scoring_json, roster_json, league_size, season, commissioner_id, settings_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [name, type, scoringPreset, scoringJson || null, rosterJson || null, leagueSize, season, userId, settingsJson || null]);

  const idResult = db.exec('SELECT last_insert_rowid()');
  const leagueId = idResult[0].values[0][0];

  db.run('INSERT INTO league_members (league_id, user_id, team_name, role) VALUES (?, ?, ?, ?)',
    [leagueId, userId, teamName, 'commissioner']);

  saveDb();
  return getLeagueById(leagueId, userId);
}

async function getLeagueById(leagueId, userId) {
  const db = await getDb();

  const memCheck = db.exec('SELECT id FROM league_members WHERE league_id = ? AND user_id = ?', [leagueId, userId]);
  if (memCheck.length === 0 || memCheck[0].values.length === 0) {
    const err = new Error('Not a member of this league.');
    err.status = 403;
    throw err;
  }

  const leagueResult = db.exec('SELECT * FROM leagues WHERE id = ?', [leagueId]);
  if (leagueResult.length === 0 || leagueResult[0].values.length === 0) {
    const err = new Error('League not found.');
    err.status = 404;
    throw err;
  }

  const cols = leagueResult[0].columns;
  const row = leagueResult[0].values[0];
  const league = {};
  cols.forEach((c, i) => league[c] = row[i]);

  const memResult = db.exec(`
    SELECT lm.id, lm.team_name, lm.role, lm.joined_at, u.name AS user_name, u.email
    FROM league_members lm JOIN users u ON u.id = lm.user_id
    WHERE lm.league_id = ?
  `, [leagueId]);

  league.members = [];
  if (memResult.length > 0) {
    const mCols = memResult[0].columns;
    league.members = memResult[0].values.map(r => {
      const obj = {};
      mCols.forEach((c, i) => obj[c] = r[i]);
      return obj;
    });
  }

  return league;
}

async function updateLeague(leagueId, userId, updates) {
  const db = await getDb();

  const leagueResult = db.exec('SELECT commissioner_id FROM leagues WHERE id = ?', [leagueId]);
  if (leagueResult.length === 0 || leagueResult[0].values.length === 0) {
    const err = new Error('League not found.'); err.status = 404; throw err;
  }
  if (leagueResult[0].values[0][0] !== userId) {
    const err = new Error('Only the commissioner can update league settings.'); err.status = 403; throw err;
  }

  const colMap = { name: 'name', type: 'type', scoringPreset: 'scoring_preset', scoringJson: 'scoring_json', rosterJson: 'roster_json', leagueSize: 'league_size', settingsJson: 'settings_json' };
  const sets = [];
  const vals = [];
  for (const [key, val] of Object.entries(updates)) {
    if (colMap[key]) { sets.push(`${colMap[key]} = ?`); vals.push(val); }
  }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    vals.push(leagueId);
    db.run(`UPDATE leagues SET ${sets.join(', ')} WHERE id = ?`, vals);
    saveDb();
  }

  return getLeagueById(leagueId, userId);
}

module.exports = { getUserLeagues, createLeague, getLeagueById, updateLeague };
