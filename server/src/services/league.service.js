const crypto = require('crypto');
const { z } = require('zod');
const { getDb, saveDb } = require('../db/connection');

const leagueUpdateSchema = z.object({
  name: z.string().max(100).optional(),
  type: z.string().max(50).optional(),
  scoringPreset: z.string().max(50).optional(),
  scoringJson: z.string().max(10000).optional(),
  rosterJson: z.string().max(10000).optional(),
  leagueSize: z.number().int().min(4).max(32).optional(),
  settingsJson: z.string().max(10000).optional(),
}).strict();

function generateInviteCode() {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

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

  const inviteCode = generateInviteCode();
  db.run(`
    INSERT INTO leagues (name, type, scoring_preset, scoring_json, roster_json, league_size, season, commissioner_id, settings_json, invite_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [name, type, scoringPreset, scoringJson || null, rosterJson || null, leagueSize, season, userId, settingsJson || null, inviteCode]);

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
  const validated = leagueUpdateSchema.parse(updates);
  const db = await getDb();

  const leagueResult = db.exec('SELECT commissioner_id FROM leagues WHERE id = ?', [leagueId]);
  if (leagueResult.length === 0 || leagueResult[0].values.length === 0) {
    const err = new Error('League not found.'); err.status = 404; throw err;
  }
  if (leagueResult[0].values[0][0] !== userId) {
    const err = new Error('Only the commissioner can update league settings.'); err.status = 403; throw err;
  }

  const colMap = { name: 'name', type: 'type', scoringPreset: 'scoring_preset', scoringJson: 'scoring_json', rosterJson: 'roster_json', leagueSize: 'league_size', settingsJson: 'settings_json' };
  // SECURITY: Only these column names may appear in the SET clause.
  // colMap values are hardcoded above — never derived from user input.
  const ALLOWED_COLS = new Set(Object.values(colMap));
  const sets = [];
  const vals = [];
  for (const [key, val] of Object.entries(validated)) {
    if (colMap[key] && ALLOWED_COLS.has(colMap[key])) { sets.push(`${colMap[key]} = ?`); vals.push(val); }
  }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    vals.push(leagueId);
    db.run(`UPDATE leagues SET ${sets.join(', ')} WHERE id = ?`, vals);
    saveDb();
  }

  return getLeagueById(leagueId, userId);
}

async function deleteLeague(leagueId, userId) {
  const db = await getDb();

  const leagueResult = db.exec('SELECT commissioner_id FROM leagues WHERE id = ?', [leagueId]);
  if (leagueResult.length === 0 || leagueResult[0].values.length === 0) {
    const err = new Error('League not found.'); err.status = 404; throw err;
  }
  if (leagueResult[0].values[0][0] !== userId) {
    const err = new Error('Only the commissioner can delete a league.'); err.status = 403; throw err;
  }

  db.run('DELETE FROM league_members WHERE league_id = ?', [leagueId]);
  db.run('DELETE FROM leagues WHERE id = ?', [leagueId]);
  saveDb();
}

async function removeMember(leagueId, memberId, userId) {
  const db = await getDb();

  const leagueResult = db.exec('SELECT commissioner_id FROM leagues WHERE id = ?', [leagueId]);
  if (leagueResult.length === 0 || leagueResult[0].values.length === 0) {
    const err = new Error('League not found.'); err.status = 404; throw err;
  }
  if (leagueResult[0].values[0][0] !== userId) {
    const err = new Error('Only the commissioner can remove members.'); err.status = 403; throw err;
  }

  // Cannot remove the commissioner
  const memberResult = db.exec('SELECT role FROM league_members WHERE id = ? AND league_id = ?', [memberId, leagueId]);
  if (memberResult.length === 0 || memberResult[0].values.length === 0) {
    const err = new Error('Member not found.'); err.status = 404; throw err;
  }
  if (memberResult[0].values[0][0] === 'commissioner') {
    const err = new Error('Cannot remove the commissioner.'); err.status = 400; throw err;
  }

  db.run('DELETE FROM league_members WHERE id = ? AND league_id = ?', [memberId, leagueId]);
  saveDb();
  return getLeagueById(leagueId, userId);
}

async function saveDraft(leagueId, userId, { picks, draftOrder }) {
  const db = await getDb();

  // Verify commissioner
  const leagueResult = db.exec('SELECT commissioner_id FROM leagues WHERE id = ?', [leagueId]);
  if (leagueResult.length === 0 || leagueResult[0].values.length === 0) {
    const err = new Error('League not found.'); err.status = 404; throw err;
  }
  if (leagueResult[0].values[0][0] !== userId) {
    const err = new Error('Only the commissioner can save draft results.'); err.status = 403; throw err;
  }

  // Upsert: delete existing then insert
  db.run('DELETE FROM draft_results WHERE league_id = ?', [leagueId]);
  db.run(
    'INSERT INTO draft_results (league_id, picks_json, draft_order_json, phase) VALUES (?, ?, ?, ?)',
    [leagueId, JSON.stringify(picks), JSON.stringify(draftOrder), 'complete']
  );
  saveDb();
}

async function getDraft(leagueId, userId) {
  const db = await getDb();

  // Verify membership
  const memCheck = db.exec('SELECT id FROM league_members WHERE league_id = ? AND user_id = ?', [leagueId, userId]);
  if (memCheck.length === 0 || memCheck[0].values.length === 0) {
    const err = new Error('Not a member of this league.'); err.status = 403; throw err;
  }

  const result = db.exec('SELECT picks_json, draft_order_json, phase, created_at FROM draft_results WHERE league_id = ?', [leagueId]);
  if (result.length === 0 || result[0].values.length === 0) return null;

  const row = result[0].values[0];
  return {
    picks: JSON.parse(row[0]),
    draftOrder: JSON.parse(row[1]),
    phase: row[2],
    createdAt: row[3],
  };
}

async function deleteDraft(leagueId, userId) {
  const db = await getDb();

  const leagueResult = db.exec('SELECT commissioner_id FROM leagues WHERE id = ?', [leagueId]);
  if (leagueResult.length === 0 || leagueResult[0].values.length === 0) {
    const err = new Error('League not found.'); err.status = 404; throw err;
  }
  if (leagueResult[0].values[0][0] !== userId) {
    const err = new Error('Only the commissioner can reset the draft.'); err.status = 403; throw err;
  }

  db.run('DELETE FROM draft_results WHERE league_id = ?', [leagueId]);
  saveDb();
}

async function joinLeague({ inviteCode, teamName, userId }) {
  const db = await getDb();

  const result = db.exec('SELECT id, league_size FROM leagues WHERE invite_code = ?', [inviteCode.toUpperCase()]);
  if (result.length === 0 || result[0].values.length === 0) {
    const err = new Error('Invalid invite code.'); err.status = 404; throw err;
  }

  const leagueId = result[0].values[0][0];
  const leagueSize = result[0].values[0][1];

  // Check if already a member
  const memCheck = db.exec('SELECT id FROM league_members WHERE league_id = ? AND user_id = ?', [leagueId, userId]);
  if (memCheck.length > 0 && memCheck[0].values.length > 0) {
    const err = new Error('You are already a member of this league.'); err.status = 400; throw err;
  }

  // Check if league is full
  const countResult = db.exec('SELECT COUNT(*) FROM league_members WHERE league_id = ?', [leagueId]);
  const memberCount = countResult[0].values[0][0];
  if (memberCount >= leagueSize) {
    const err = new Error('This league is full.'); err.status = 400; throw err;
  }

  db.run('INSERT INTO league_members (league_id, user_id, team_name, role) VALUES (?, ?, ?, ?)',
    [leagueId, userId, teamName, 'member']);
  saveDb();

  return getLeagueById(leagueId, userId);
}

module.exports = { getUserLeagues, createLeague, getLeagueById, updateLeague, deleteLeague, removeMember, saveDraft, getDraft, deleteDraft, joinLeague };
