/**
 * ESPN Historical Backfill Service
 *
 * Fetches historical transaction, injury, and news data from ESPN's
 * public API to seed the situation_events table with 6 months of context.
 *
 * Endpoints used (no auth required):
 *   - Transactions: site.api.espn.com/apis/site/v2/sports/football/nfl/transactions
 *   - Injuries: sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/{id}/injuries
 *   - News: site.api.espn.com/apis/site/v2/sports/football/nfl/news
 *
 * Rate limiting: 1 request per second
 */

const { getDb, saveDb } = require('../db/connection');

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';

// ESPN team IDs (numeric) → our abbreviations
const ESPN_TEAM_MAP = {
  1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL', 7: 'DEN', 8: 'DET',
  9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR', 15: 'MIA', 16: 'MIN',
  17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ', 21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC',
  25: 'SF', 26: 'SEA', 27: 'TB', 28: 'WAS', 29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN API ${res.status}: ${url}`);
  return res.json();
}

// ─── Transaction Backfill ───

async function backfillTransactions() {
  const db = await getDb();
  let events = 0;

  try {
    const data = await fetchJSON(`${ESPN_BASE}/transactions?limit=200`);
    const items = data.items || data.transactions || [];

    for (const item of items) {
      const title = item.text || item.headline || '';
      const date = item.date || item.timestamp || new Date().toISOString();
      const lower = title.toLowerCase();

      let eventType = null;
      let impact = 0;
      let team = null;

      // Detect event type from transaction text
      if (lower.includes('traded') || lower.includes('trade')) {
        eventType = 'trade_impact';
        impact = 0.05;
      } else if (lower.includes('placed on injured reserve') || lower.includes('placed on ir')) {
        eventType = 'injury_impact';
        impact = -0.20;
      } else if (lower.includes('signed') || lower.includes('claimed')) {
        eventType = 'role_change';
        impact = 0.05;
      } else if (lower.includes('released') || lower.includes('waived')) {
        eventType = 'role_change';
        impact = -0.05;
      } else if (lower.includes('suspended')) {
        eventType = 'suspension';
        impact = -0.25;
      }

      if (!eventType) continue;

      // Extract team from item if available
      if (item.team && item.team.abbreviation) {
        team = item.team.abbreviation;
      }

      // Extract player name (first proper noun pattern)
      const nameMatch = title.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/);
      const playerName = nameMatch ? nameMatch[1] : null;

      if (!playerName) continue;

      // Check for duplicate
      const dupe = db.exec(
        `SELECT id FROM situation_events WHERE player_name = ? AND event_type = ? AND detected_at = ?`,
        [playerName, eventType, new Date(date).toISOString()]
      );
      if (dupe.length > 0 && dupe[0].values.length > 0) continue;

      db.run(
        `INSERT INTO situation_events
         (player_name, team, event_type, impact, confidence, source, description, detected_at, active)
         VALUES (?, ?, ?, ?, 0.80, 'espn_backfill', ?, ?, 1)`,
        [playerName, team, eventType, impact, title.slice(0, 200), new Date(date).toISOString()]
      );
      events++;
    }
  } catch (err) {
    console.error('[ESPN Backfill] Transaction fetch failed:', err.message);
  }

  return events;
}

// ─── Injury Backfill (per team) ───

async function backfillInjuries() {
  const db = await getDb();
  let events = 0;

  for (const [espnId, abbrev] of Object.entries(ESPN_TEAM_MAP)) {
    try {
      await sleep(1000); // Rate limit: 1 req/sec
      const data = await fetchJSON(`${ESPN_CORE}/teams/${espnId}/injuries?limit=50`);
      const items = data.items || [];

      for (const ref of items) {
        try {
          // ESPN returns $ref links — we may need to resolve them
          const injury = ref.$ref ? await fetchJSON(ref.$ref) : ref;
          await sleep(300);

          const athlete = injury.athlete || {};
          const playerName = athlete.displayName || athlete.fullName;
          const status = (injury.status || '').toLowerCase();
          const detail = injury.longComment || injury.shortComment || '';

          if (!playerName) continue;

          let impact = 0;
          let eventType = 'injury_impact';

          if (status === 'out' || status === 'injured reserve') impact = -0.20;
          else if (status === 'doubtful') impact = -0.15;
          else if (status === 'questionable') impact = -0.08;
          else if (status === 'probable') impact = -0.03;
          else continue; // healthy or unknown

          // Check for season-ending keywords
          if (detail.toLowerCase().includes('acl') || detail.toLowerCase().includes('achilles')) {
            impact = -0.30;
          }

          // Check for duplicate
          const dupe = db.exec(
            `SELECT id FROM situation_events WHERE player_name = ? AND event_type = ? AND team = ? AND detected_at > datetime('now', '-7 days')`,
            [playerName, eventType, abbrev]
          );
          if (dupe.length > 0 && dupe[0].values.length > 0) continue;

          db.run(
            `INSERT INTO situation_events
             (player_name, team, event_type, impact, confidence, source, description, active)
             VALUES (?, ?, ?, ?, 0.85, 'espn_backfill', ?, 1)`,
            [playerName, abbrev, eventType, impact, `${status}: ${detail}`.slice(0, 200)]
          );
          events++;
        } catch (e) { /* skip individual injury */ }
      }
    } catch (err) {
      console.warn(`[ESPN Backfill] Injuries failed for team ${abbrev}: ${err.message}`);
    }
  }

  return events;
}

// ─── News Backfill ───

async function backfillNews() {
  const db = await getDb();
  let events = 0;

  try {
    const data = await fetchJSON(`${ESPN_BASE}/news?limit=100`);
    const articles = data.articles || [];

    // Import detection rules from situation service
    const { detectSituationEvents } = require('./situation.service');

    for (const article of articles) {
      const title = article.headline || '';
      const description = article.description || '';
      const published = article.published || new Date().toISOString();
      const lower = (title + ' ' + description).toLowerCase();

      // Quick keyword scan for situation-relevant articles
      const situationKeywords = [
        'acl', 'achilles', 'traded', 'trade', 'starter', 'named starting',
        'offensive coordinator', 'head coach', 'workhorse', 'bell cow',
        'target share', 'breakout', 'career high', 'suspended', 'committee',
        'season-ending', 'ruled out', 'placed on ir',
      ];

      const isRelevant = situationKeywords.some(kw => lower.includes(kw));
      if (!isRelevant) continue;

      // Extract player name
      const nameMatch = title.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/);
      const playerName = nameMatch ? nameMatch[1] : null;
      if (!playerName) continue;

      // Determine event type and impact
      let eventType = 'breakout_signal';
      let impact = 0.05;

      if (lower.includes('acl') || lower.includes('achilles') || lower.includes('season-ending')) {
        eventType = 'injury_impact'; impact = -0.25;
      } else if (lower.includes('traded') || lower.includes('trade')) {
        eventType = 'trade_impact'; impact = 0.05;
      } else if (lower.includes('starter') || lower.includes('named starting')) {
        eventType = 'role_change'; impact = 0.12;
      } else if (lower.includes('suspended')) {
        eventType = 'suspension'; impact = -0.25;
      } else if (lower.includes('workhorse') || lower.includes('bell cow')) {
        eventType = 'role_change'; impact = 0.15;
      } else if (lower.includes('committee')) {
        eventType = 'role_change'; impact = -0.10;
      } else if (lower.includes('target share')) {
        eventType = 'target_share_shift'; impact = 0.10;
      } else if (lower.includes('coordinator') || lower.includes('head coach')) {
        eventType = 'scheme_change'; impact = 0.08;
      }

      // Check duplicate
      const dupe = db.exec(
        `SELECT id FROM situation_events WHERE player_name = ? AND event_type = ? AND detected_at > datetime('now', '-3 days')`,
        [playerName, eventType]
      );
      if (dupe.length > 0 && dupe[0].values.length > 0) continue;

      db.run(
        `INSERT INTO situation_events
         (player_name, team, event_type, impact, confidence, source, description, detected_at, active)
         VALUES (?, NULL, ?, ?, 0.70, 'espn_backfill', ?, ?, 1)`,
        [playerName, eventType, impact, title.slice(0, 200), new Date(published).toISOString()]
      );
      events++;
    }
  } catch (err) {
    console.error('[ESPN Backfill] News fetch failed:', err.message);
  }

  return events;
}

// ─── Main Backfill Orchestrator ───

async function runFullBackfill() {
  console.log('[ESPN Backfill] Starting full historical backfill...');

  const txEvents = await backfillTransactions();
  console.log(`[ESPN Backfill] Transactions: ${txEvents} events`);

  await sleep(2000);

  const injEvents = await backfillInjuries();
  console.log(`[ESPN Backfill] Injuries: ${injEvents} events`);

  await sleep(2000);

  const newsEvents = await backfillNews();
  console.log(`[ESPN Backfill] News: ${newsEvents} events`);

  saveDb();
  const total = txEvents + injEvents + newsEvents;
  console.log(`[ESPN Backfill] Complete: ${total} total situation events created.`);
  return total;
}

module.exports = { runFullBackfill, backfillTransactions, backfillInjuries, backfillNews };
