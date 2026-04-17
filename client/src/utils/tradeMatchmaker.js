// ─────────────────────────────────────────────────────────────────────────────
// tradeMatchmaker.js
//
// Pure scoring utilities that power the Trade Center's "Find Deals", "Partner
// Profile", and "Acceptance Meter" surfaces. All functions take data in and
// return data out — no React, no DOM.
//
// Everything is deterministic given the inputs (no Math.random) so UI can
// re-render freely without the gauge flickering.
// ─────────────────────────────────────────────────────────────────────────────

import { PLAYERS } from '../data/players';
import { ROSTER_PRESETS } from '../data/scoring';
import { getHexScore, computeTradeValue, computeTradeTier } from './hexScore';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

// Positions we price for needs/surplus. K/DEF are league mandates but fantasy
// trades rarely flow through them — we include them so the sum-check stays
// honest but weight them down.
const TRADEABLE_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const POSITION_WEIGHT = { QB: 1.0, RB: 1.0, WR: 1.0, TE: 0.9, K: 0.2, DEF: 0.2 };

// Starter counts used to size up roster "need" vs "surplus". These match the
// standard preset; we read from the live preset when available.
function starterCountsFor(scoringPreset) {
  const preset = ROSTER_PRESETS[scoringPreset] || ROSTER_PRESETS.standard || {};
  return {
    QB: preset.QB || 1,
    RB: preset.RB || 2,
    WR: preset.WR || 2,
    TE: preset.TE || 1,
    K: preset.K || 1,
    DEF: preset.DST || preset.DEF || 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Positional profile: what does this team have, and at what quality?
// Returns a per-position summary keyed by position.
// ─────────────────────────────────────────────────────────────────────────────
export function analyzeRoster(rosterIds, scoringPreset = 'standard') {
  const starters = starterCountsFor(scoringPreset);
  const byPos = {};
  for (const pos of TRADEABLE_POSITIONS) {
    byPos[pos] = { pos, count: 0, starters: starters[pos], hexScores: [] };
  }

  for (const pid of rosterIds) {
    const p = PLAYER_MAP[pid];
    if (!p || !byPos[p.pos]) continue;
    byPos[p.pos].count += 1;
    byPos[p.pos].hexScores.push(getHexScore(pid, scoringPreset));
  }

  for (const pos of TRADEABLE_POSITIONS) {
    const group = byPos[pos];
    group.hexScores.sort((a, b) => b - a);
    const startingHexes = group.hexScores.slice(0, group.starters);
    group.startingAvgHex = startingHexes.length
      ? startingHexes.reduce((s, v) => s + v, 0) / startingHexes.length
      : 0;
    group.benchAvgHex = (() => {
      const bench = group.hexScores.slice(group.starters);
      return bench.length ? bench.reduce((s, v) => s + v, 0) / bench.length : 0;
    })();
    group.depth = Math.max(0, group.count - group.starters);
  }
  return byPos;
}

// ─────────────────────────────────────────────────────────────────────────────
// Needs & surplus derived from a roster profile.
//
// need severity (0-1) = how under-stocked or under-talented this position is
//   - missing starters → severity 1.0
//   - weak starters (avg hex < 55) → severity scales with gap
// surplus severity (0-1) = how stacked this position is
//   - extra depth with avg bench hex > 60 → high surplus
// ─────────────────────────────────────────────────────────────────────────────
export function scorePartnerNeeds(rosterIds, scoringPreset = 'standard') {
  const profile = analyzeRoster(rosterIds, scoringPreset);
  const needs = [];
  const surplus = [];

  for (const pos of TRADEABLE_POSITIONS) {
    const g = profile[pos];
    const w = POSITION_WEIGHT[pos] || 1;

    // Need: missing starters, or low starter hex
    const startingGap = Math.max(0, g.starters - g.count);
    const hexGap = Math.max(0, 60 - g.startingAvgHex) / 60;
    const needSeverity = Math.min(1, (startingGap * 0.7) + (hexGap * 0.9)) * w;
    if (needSeverity >= 0.12) {
      needs.push({
        pos,
        severity: needSeverity,
        startingAvgHex: g.startingAvgHex,
        startingGap,
      });
    }

    // Surplus: bench depth at quality
    const depthBeyondNeed = Math.max(0, g.depth - 1);
    const surplusSeverity = Math.min(1, (depthBeyondNeed * 0.4) + (g.benchAvgHex / 100)) * w;
    if (surplusSeverity >= 0.25 && g.depth >= 1) {
      surplus.push({
        pos,
        severity: surplusSeverity,
        depth: g.depth,
        benchAvgHex: g.benchAvgHex,
      });
    }
  }

  needs.sort((a, b) => b.severity - a.severity);
  surplus.sort((a, b) => b.severity - a.severity);
  return { needs, surplus, profile };
}

// ─────────────────────────────────────────────────────────────────────────────
// Trade friendliness from history.
//
// Signal philosophy:
//   - accepted reasonable trade → +1 openness
//   - accepted any trade        → +0.5 openness (still participation)
//   - rejected reasonable trade → -1 openness (closed-off)
//   - rejected lopsided trade   → 0 (they were right to reject)
//   - expired trade they sent   → +0.2 (at least they tried)
//   - expired trade they got    → -0.2 (ghosting)
//
// Score = 50 + 8*net, clamped to [10, 95]. Low-sample teams return 50.
// ─────────────────────────────────────────────────────────────────────────────
export function calcTradeFriendliness(teamId, history = []) {
  const involving = history.filter(
    t => t.fromTeamId === teamId || t.toTeamId === teamId
  );
  if (involving.length === 0) {
    return { score: 50, verdict: 'unknown', sample: 0, net: 0 };
  }

  let net = 0;
  for (const t of involving) {
    const wasRecipient = t.toTeamId === teamId;
    const tier = computeTradeTier(t.offeringPlayerIds || [], t.requestingPlayerIds || []);
    const ratio = Math.abs(tier.ratio || 0);
    const lopsidedAgainstThem = wasRecipient
      ? (tier.ratio || 0) < -0.25  // they would receive less
      : (tier.ratio || 0) > 0.25;  // they would give up more

    if (t.status === 'completed') {
      net += ratio < 0.15 ? 1.0 : 0.5;
    } else if (t.status === 'rejected') {
      if (lopsidedAgainstThem) {
        // Right to reject — no penalty
      } else if (ratio < 0.2) {
        net -= 1.0;
      }
    } else if (t.status === 'expired') {
      net += wasRecipient ? -0.2 : 0.2;
    } else if (t.status === 'withdrawn') {
      // No signal — sender pulled it
    }
  }

  const score = Math.max(10, Math.min(95, 50 + net * 8));
  let verdict;
  if (involving.length < 3) verdict = 'unknown';
  else if (score >= 65) verdict = 'open';
  else if (score >= 40) verdict = 'neutral';
  else verdict = 'closed';

  return { score, verdict, sample: involving.length, net };
}

// ─────────────────────────────────────────────────────────────────────────────
// Acceptance estimate for a proposed trade from `fromTeamId` to `toTeamId`.
//
// From the PARTNER's perspective (toTeamId):
//   outgoing = requestingPlayerIds (what partner sends)
//   incoming = offeringPlayerIds  (what partner receives)
//
// Three weighted signals:
//   1. Value parity (55%)   — incoming must not be meaningfully smaller than
//                             outgoing. Computed via computeTradeTier's ratio
//                             from partner's perspective.
//   2. Need fit (30%)       — do the incoming players land on positions the
//                             partner actually needs? And are the outgoing
//                             players from a surplus of theirs?
//   3. Friendliness (15%)   — per-team disposition pulled from history.
//
// Returns { likelihood: 0-1, score: 0-100, verdict, reasons: [string] }
// ─────────────────────────────────────────────────────────────────────────────
export function estimateAcceptance({
  offeringPlayerIds = [],
  requestingPlayerIds = [],
  toTeamId,
  partnerRosterIds = [],
  history = [],
  scoringPreset = 'standard',
}) {
  if (offeringPlayerIds.length === 0 || requestingPlayerIds.length === 0) {
    return { likelihood: 0, score: 0, verdict: 'empty', reasons: ['Add players to both sides to evaluate.'] };
  }

  // ── 1. Value parity from PARTNER's perspective ────────────────────────────
  // Partner receives `offering`, sends `requesting`. For them:
  //   sendTotal = computeTradeValue(requestingPlayerIds)
  //   receiveTotal = computeTradeValue(offeringPlayerIds)
  const partnerSendValue = computeTradeValue(requestingPlayerIds, scoringPreset) || 0;
  const partnerReceiveValue = computeTradeValue(offeringPlayerIds, scoringPreset) || 0;
  const valueRatio = partnerSendValue > 0
    ? partnerReceiveValue / partnerSendValue
    : 0;
  // 1.0 = exactly fair. >1 = partner wins. <1 = partner loses value.
  const valueSignal = (() => {
    if (valueRatio >= 1.10) return 1.0;                            // clear win
    if (valueRatio >= 0.95) return 0.88;                           // fair
    if (valueRatio >= 0.85) return 0.60;                           // slight loss
    if (valueRatio >= 0.75) return 0.32;                           // meaningful loss
    if (valueRatio >= 0.60) return 0.12;                           // bad
    return 0.02;                                                    // insulting
  })();

  // ── 2. Need fit from partner's perspective ────────────────────────────────
  const { needs, surplus } = scorePartnerNeeds(partnerRosterIds, scoringPreset);
  const needMap = Object.fromEntries(needs.map(n => [n.pos, n.severity]));
  const surplusMap = Object.fromEntries(surplus.map(s => [s.pos, s.severity]));

  // Incoming players land on a position of need → reward
  const incomingHexSum = offeringPlayerIds.reduce(
    (s, id) => s + (getHexScore(id, scoringPreset) || 0),
    0
  ) || 1;
  const weightedNeedFit = offeringPlayerIds.reduce((s, id) => {
    const p = PLAYER_MAP[id];
    if (!p) return s;
    const hex = getHexScore(id, scoringPreset);
    const need = needMap[p.pos] || 0;
    return s + hex * need;
  }, 0) / incomingHexSum;

  // Outgoing players come from a position of surplus → partner willing to part
  const outgoingHexSum = requestingPlayerIds.reduce(
    (s, id) => s + (getHexScore(id, scoringPreset) || 0),
    0
  ) || 1;
  const weightedSurplusFit = requestingPlayerIds.reduce((s, id) => {
    const p = PLAYER_MAP[id];
    if (!p) return s;
    const hex = getHexScore(id, scoringPreset);
    const surplusSev = surplusMap[p.pos] || 0;
    return s + hex * surplusSev;
  }, 0) / outgoingHexSum;

  const needSignal = Math.min(1, (weightedNeedFit * 0.7) + (weightedSurplusFit * 0.5));

  // ── 3. Friendliness ───────────────────────────────────────────────────────
  const friendliness = calcTradeFriendliness(toTeamId, history);
  const friendlinessSignal = friendliness.score / 100;

  // ── Combined score ────────────────────────────────────────────────────────
  const likelihood = Math.max(
    0.01,
    Math.min(0.99,
      valueSignal * 0.55 +
      needSignal * 0.30 +
      friendlinessSignal * 0.15
    )
  );
  const score = Math.round(likelihood * 100);

  let verdict;
  if (score >= 70) verdict = 'likely';
  else if (score >= 45) verdict = 'reach';
  else if (score >= 25) verdict = 'longshot';
  else verdict = 'insult';

  const reasons = [];
  if (valueRatio >= 1.05) reasons.push(`They gain ${Math.round((valueRatio - 1) * 100)}% in value.`);
  else if (valueRatio >= 0.92) reasons.push('Value is roughly fair.');
  else if (valueRatio >= 0.78) reasons.push(`They give up ~${Math.round((1 - valueRatio) * 100)}% in value — borderline.`);
  else reasons.push(`They give up ~${Math.round((1 - valueRatio) * 100)}% in value — reach.`);

  if (needSignal > 0.35) reasons.push('Hits a real position of need for them.');
  else if (needSignal > 0.15) reasons.push('Touches a secondary need.');
  else reasons.push('Does not address any of their weaknesses.');

  if (friendliness.verdict === 'open') reasons.push('This manager accepts reasonable deals.');
  else if (friendliness.verdict === 'closed') reasons.push('This manager rarely accepts trades.');
  else if (friendliness.verdict === 'unknown') reasons.push('No trade history signal yet.');

  return {
    likelihood,
    score,
    verdict,
    valueRatio,
    valueSignal,
    needSignal,
    friendlinessSignal,
    friendliness,
    partnerNeeds: needs,
    partnerSurplus: surplus,
    reasons,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Trade candidate generator.
//
// For a given user, generates a ranked list of plausible trades across every
// other team. Strategy:
//   1. Find user's position of need × every partner's surplus at that pos.
//   2. For each candidate partner player, find a user-side player to offer
//      from the user's own surplus at the partner's position of need.
//   3. Score the pair on (user upside) × (acceptance likelihood) and rank.
//
// Returns up to `limit` top candidates. Deterministic.
// ─────────────────────────────────────────────────────────────────────────────
export function findTradeCandidates({
  userTeamId,
  rosters,
  teams,
  history = [],
  scoringPreset = 'standard',
  limit = 12,
}) {
  if (!rosters || !rosters[userTeamId]) return [];
  const userRoster = rosters[userTeamId];
  const userProfile = scorePartnerNeeds(userRoster, scoringPreset);
  const userNeeds = Object.fromEntries(userProfile.needs.map(n => [n.pos, n.severity]));
  const userSurplus = Object.fromEntries(userProfile.surplus.map(s => [s.pos, s.severity]));

  const partners = (teams || []).filter(t => t.id !== userTeamId);

  const candidates = [];

  for (const partner of partners) {
    const partnerRoster = rosters[partner.id] || [];
    if (partnerRoster.length === 0) continue;
    const partnerProfile = scorePartnerNeeds(partnerRoster, scoringPreset);

    // Positions where user needs help AND partner has depth
    const matchedNeeds = partnerProfile.surplus.filter(s => userNeeds[s.pos]);

    for (const match of matchedNeeds) {
      // Pick the best bench player at partner's surplus position
      const partnerCandidates = partnerRoster
        .map(pid => PLAYER_MAP[pid])
        .filter(p => p && p.pos === match.pos)
        .map(p => ({ id: p.id, hex: getHexScore(p.id, scoringPreset), p }))
        .sort((a, b) => b.hex - a.hex);

      // Skip their clear starter — offer the 2nd/3rd-best at that position
      const offered = partnerCandidates.slice(1, 3);
      for (const partnerOffer of offered) {
        // Find user player to send — something from user's surplus matching
        // partner's need. If no direct surplus-for-need overlap, fall back to
        // any decent bench piece at a partner-needed position.
        const partnerNeedPositions = partnerProfile.needs.map(n => n.pos);
        const userSideCandidates = userRoster
          .map(pid => PLAYER_MAP[pid])
          .filter(p => p && partnerNeedPositions.includes(p.pos))
          .map(p => ({ id: p.id, hex: getHexScore(p.id, scoringPreset), p }))
          .sort((a, b) => b.hex - a.hex);

        // Target value parity within 15% of partnerOffer's hex
        const targetHex = partnerOffer.hex;
        const userOffer = userSideCandidates.find(c =>
          c.hex >= targetHex * 0.85 && c.hex <= targetHex * 1.20
        ) || userSideCandidates[1];  // fall back to second-best needed-position player
        if (!userOffer) continue;

        const sendIds = [userOffer.id];
        const receiveIds = [partnerOffer.id];

        const acceptance = estimateAcceptance({
          offeringPlayerIds: sendIds,
          requestingPlayerIds: receiveIds,
          toTeamId: partner.id,
          partnerRosterIds: partnerRoster,
          history,
          scoringPreset,
        });

        // User upside: value received vs value sent + whether it hits a user need
        const userReceive = computeTradeValue(receiveIds, scoringPreset);
        const userSend = computeTradeValue(sendIds, scoringPreset);
        const userValueRatio = userSend > 0 ? userReceive / userSend : 1;
        const userNeedFit = userNeeds[partnerOffer.p.pos] || 0;
        const userUpsideScore = Math.max(
          0,
          Math.min(1, (userValueRatio - 0.85) * 1.5 + userNeedFit * 0.5)
        );

        // Composite: user wants favorable trades that partner will accept.
        // Geometric-mean-style combo avoids one-sided dominance.
        const composite = Math.sqrt(userUpsideScore * acceptance.likelihood);

        candidates.push({
          partner,
          sendIds,
          receiveIds,
          userUpside: userUpsideScore,
          acceptance,
          composite,
          userNeedPos: partnerOffer.p.pos,
          partnerNeedPos: userOffer.p.pos,
        });
      }
    }
  }

  // Dedupe by sendIds+receiveIds+partnerId key, keeping the highest composite.
  const seen = new Map();
  for (const c of candidates) {
    const key = `${c.partner.id}|${c.sendIds.slice().sort().join(',')}>${c.receiveIds.slice().sort().join(',')}`;
    const prev = seen.get(key);
    if (!prev || prev.composite < c.composite) seen.set(key, c);
  }

  return [...seen.values()]
    .sort((a, b) => b.composite - a.composite)
    .slice(0, limit);
}
