/**
 * Situation Event Detector
 *
 * Scans news articles for situation-changing events and creates
 * situation_events records that feed into the HexScore engine.
 *
 * Detection sensitivity: MODERATE
 * - 2+ sources OR 1 high-priority source (ESPN/Yahoo) for event creation
 * - Clear keyword patterns (ACL, traded, named starter, new OC)
 * - Includes breakout signals and target share shifts at 2+ source threshold
 */

const { getDb, saveDb } = require('../db/connection');
const { PLAYER_ROSTER } = require('../utils/playerRoster');

// ─── Player name → ID resolution (exact match only) ───
function resolvePlayerId(playerName) {
  if (!playerName) return null;
  const lower = playerName.toLowerCase().trim();
  return PLAYER_ROSTER[lower]?.id ?? null;
}

// ─── Player name → ID mapping (loaded from client data) ───
// We store names for matching; IDs are resolved at detection time
const TEAM_ABBREV_MAP = {
  'cardinals': 'ARI', 'falcons': 'ATL', 'ravens': 'BAL', 'bills': 'BUF',
  'panthers': 'CAR', 'bears': 'CHI', 'bengals': 'CIN', 'browns': 'CLE',
  'cowboys': 'DAL', 'broncos': 'DEN', 'lions': 'DET', 'packers': 'GB',
  'texans': 'HOU', 'colts': 'IND', 'jaguars': 'JAX', 'chiefs': 'KC',
  'raiders': 'LV', 'chargers': 'LAC', 'rams': 'LAR', 'dolphins': 'MIA',
  'vikings': 'MIN', 'patriots': 'NE', 'saints': 'NO', 'giants': 'NYG',
  'jets': 'NYJ', 'eagles': 'PHI', 'steelers': 'PIT', '49ers': 'SF',
  'seahawks': 'SEA', 'buccaneers': 'TB', 'titans': 'TEN', 'commanders': 'WAS',
  'arizona': 'ARI', 'atlanta': 'ATL', 'baltimore': 'BAL', 'buffalo': 'BUF',
  'carolina': 'CAR', 'chicago': 'CHI', 'cincinnati': 'CIN', 'cleveland': 'CLE',
  'dallas': 'DAL', 'denver': 'DEN', 'detroit': 'DET', 'green bay': 'GB',
  'houston': 'HOU', 'indianapolis': 'IND', 'jacksonville': 'JAX', 'kansas city': 'KC',
  'las vegas': 'LV', 'la chargers': 'LAC', 'la rams': 'LAR', 'miami': 'MIA',
  'minnesota': 'MIN', 'new england': 'NE', 'new orleans': 'NO',
  'ny giants': 'NYG', 'ny jets': 'NYJ', 'philadelphia': 'PHI', 'pittsburgh': 'PIT',
  'san francisco': 'SF', 'seattle': 'SEA', 'tampa bay': 'TB',
  'tennessee': 'TEN', 'washington': 'WAS',
};

// ─── Detection Rules ───
// Each rule: { patterns: [keywords], eventType, baseImpact, affectsTeammates, description }
const DETECTION_RULES = [
  // QB situation changes (high impact on team WRs/TEs)
  {
    patterns: [['acl', 'qb'], ['achilles', 'qb'], ['season-ending', 'quarterback'], ['torn', 'qb']],
    eventType: 'qb_change',
    baseImpact: -0.22,
    affectsTeammates: { WR: -0.15, TE: -0.12 },
    descTemplate: 'QB injury — major impact on passing game',
  },
  {
    patterns: [['out', 'quarterback'], ['ir', 'qb'], ['ruled out', 'quarterback']],
    eventType: 'qb_change',
    baseImpact: -0.15,
    affectsTeammates: { WR: -0.10, TE: -0.08 },
    descTemplate: 'QB sidelined — passing game disrupted',
  },
  {
    patterns: [['named starter', 'quarterback'], ['named starting', 'qb'], ['qb1', 'named']],
    eventType: 'qb_change',
    baseImpact: 0.10,
    affectsTeammates: { WR: 0.08, TE: 0.06 },
    descTemplate: 'New starting QB named',
  },
  {
    patterns: [['traded', 'quarterback'], ['acquires', 'qb'], ['trade for', 'quarterback']],
    eventType: 'qb_change',
    baseImpact: 0.15,
    affectsTeammates: { WR: 0.10, TE: 0.08 },
    descTemplate: 'QB traded — new passing game dynamics',
  },

  // Scheme / coaching changes
  {
    patterns: [['new offensive coordinator'], ['hires', 'oc'], ['fired', 'offensive coordinator'], ['new oc']],
    eventType: 'scheme_change',
    baseImpact: 0.08,
    affectsTeammates: null,
    descTemplate: 'Offensive coordinator change — scheme shift',
  },
  {
    patterns: [['fired', 'head coach'], ['hires', 'head coach'], ['new head coach']],
    eventType: 'scheme_change',
    baseImpact: 0.10,
    affectsTeammates: null,
    descTemplate: 'Head coach change — organizational shift',
  },

  // Target share / role changes
  {
    patterns: [['target share', 'increase'], ['targets', 'rising'], ['wr1', 'role'], ['top target']],
    eventType: 'target_share_shift',
    baseImpact: 0.12,
    affectsTeammates: null,
    descTemplate: 'Target share increasing — elevated role',
  },
  {
    patterns: [['workhorse'], ['bell cow'], ['lead back'], ['featured role'], ['three-down back']],
    eventType: 'role_change',
    baseImpact: 0.15,
    affectsTeammates: null,
    descTemplate: 'Bellcow role secured',
  },
  {
    patterns: [['committee', 'backfield'], ['timeshare'], ['split carries'], ['rbbc']],
    eventType: 'role_change',
    baseImpact: -0.10,
    affectsTeammates: null,
    descTemplate: 'Backfield committee forming',
  },

  // Major injuries (affecting the player directly)
  {
    patterns: [['acl', 'torn'], ['achilles', 'tear'], ['season-ending injury'], ['out for season']],
    eventType: 'injury_impact',
    baseImpact: -0.30,
    affectsTeammates: null,
    descTemplate: 'Season-ending injury',
  },
  {
    patterns: [['concussion'], ['concussion protocol']],
    eventType: 'injury_impact',
    baseImpact: -0.12,
    affectsTeammates: null,
    descTemplate: 'Concussion — availability uncertain',
  },

  // Breakout signals
  {
    patterns: [['breakout'], ['career game'], ['career high'], ['career-best'], ['dominant performance']],
    eventType: 'breakout_signal',
    baseImpact: 0.08,
    affectsTeammates: null,
    descTemplate: 'Breakout performance — emerging value',
  },

  // Trades
  {
    patterns: [['traded to'], ['deal sends'], ['acquired by'], ['trade complete']],
    eventType: 'trade_impact',
    baseImpact: 0.05, // neutral — could be positive or negative depending on destination
    affectsTeammates: null,
    descTemplate: 'Player traded — new team context',
  },

  // Suspensions
  {
    patterns: [['suspended'], ['suspension'], ['banned']],
    eventType: 'suspension',
    baseImpact: -0.25,
    affectsTeammates: null,
    descTemplate: 'Player suspended — missed games',
  },
];

// ─── Detection Logic ───

function matchesRule(title, summary, rule) {
  const text = (title + ' ' + summary).toLowerCase();
  return rule.patterns.some(patternGroup => {
    return patternGroup.every(keyword => text.includes(keyword));
  });
}

function resolveTeamAbbrev(teamName) {
  if (!teamName) return null;
  const lower = teamName.toLowerCase();
  return TEAM_ABBREV_MAP[lower] || teamName.toUpperCase();
}

function computeConfidence(sourceCount, sourceName) {
  if (sourceCount >= 3) return 0.90;
  if (sourceCount >= 2) return 0.70;
  // Single source — check priority
  const highPriority = ['ESPN', 'Yahoo Sports'];
  if (highPriority.includes(sourceName)) return 0.50;
  return 0.30;
}

// ─── Main Detection Function ───

async function detectSituationEvents(sweepId) {
  const db = await getDb();

  // Get articles from this sweep
  const result = db.exec(
    'SELECT * FROM news_articles WHERE sweep_id = ?',
    [sweepId]
  );

  if (result.length === 0) return 0;

  const cols = result[0].columns;
  const articles = result[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });

  let eventsCreated = 0;

  for (const article of articles) {
    const confidence = computeConfidence(article.source_count, article.source_name);

    // Skip low-confidence single-source articles (moderate sensitivity)
    if (confidence < 0.50) continue;

    for (const rule of DETECTION_RULES) {
      if (!matchesRule(article.title, article.summary, rule)) continue;

      // Check for duplicate event (same player + same type within 48 hours)
      const recentDupe = db.exec(
        `SELECT id FROM situation_events
         WHERE player_name = ? AND event_type = ? AND detected_at > datetime('now', '-2 days')`,
        [article.player_name || '', rule.eventType]
      );
      if (recentDupe.length > 0 && recentDupe[0].values.length > 0) continue;

      const team = resolveTeamAbbrev(article.team_name);
      const impact = Math.round(rule.baseImpact * confidence * 100) / 100;

      // Create event for the player mentioned
      if (article.player_name) {
        const playerId = resolvePlayerId(article.player_name);
        db.run(
          `INSERT INTO situation_events
           (player_id, player_name, team, event_type, impact, confidence, source, source_article_id, description, active)
           VALUES (?, ?, ?, ?, ?, ?, 'rss', ?, ?, 1)`,
          [playerId, article.player_name, team, rule.eventType, impact, confidence, article.id, rule.descTemplate]
        );
        eventsCreated++;
      }

      // Create cascading teammate events if applicable
      if (rule.affectsTeammates && team) {
        for (const [pos, teammateImpact] of Object.entries(rule.affectsTeammates)) {
          const adjustedImpact = Math.round(teammateImpact * confidence * 100) / 100;
          db.run(
            `INSERT INTO situation_events
             (player_name, team, event_type, impact, confidence, source, source_article_id, description, active)
             VALUES (?, ?, ?, ?, ?, 'rss_cascade', ?, ?)`,
            [
              `[${pos}s on ${team}]`, team, rule.eventType + '_cascade',
              adjustedImpact, confidence * 0.8, article.id,
              `${rule.descTemplate} — affects team ${pos}s`,
            ]
          );
          eventsCreated++;
        }
      }

      break; // One rule match per article (take the first/strongest)
    }
  }

  if (eventsCreated > 0) saveDb();
  return eventsCreated;
}

// ─── Query active events ───

async function getActiveSituationEvents({ team = null, playerName = null } = {}) {
  const db = await getDb();
  const conditions = ['active = 1'];
  const params = [];

  if (team) { conditions.push('team = ?'); params.push(team); }
  if (playerName) { conditions.push('player_name = ?'); params.push(playerName); }

  const where = conditions.join(' AND ');
  const result = db.exec(
    `SELECT * FROM situation_events WHERE ${where} ORDER BY detected_at DESC`,
    params
  );

  if (result.length === 0) return [];

  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });
}

module.exports = { detectSituationEvents, getActiveSituationEvents };
