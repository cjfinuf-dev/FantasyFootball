import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { PLAYERS } from '../../data/players';
import { ROSTER_PRESETS } from '../../data/scoring';
import { getEspnId } from '../../data/espnIds';
import { getHexScore, formatHex } from '../../utils/hexScore';
import PosBadge from '../ui/PosBadge';
import PlayerHeadshot from '../ui/PlayerHeadshot';

const TOTAL_TEAMS = 12;
const TOTAL_ROUNDS = 15;
const TOTAL_PICKS = TOTAL_TEAMS * TOTAL_ROUNDS;

const POS_COLORS = {
  QB: 'var(--pos-qb)', RB: 'var(--pos-rb)', WR: 'var(--pos-wr)',
  TE: 'var(--pos-te)', K: 'var(--pos-k)', DEF: 'var(--pos-def)',
};

const POS_BG = {
  QB: 'rgba(59,130,246,0.12)', RB: 'rgba(34,197,94,0.12)', WR: 'rgba(245,158,11,0.12)',
  TE: 'rgba(239,68,68,0.12)', K: 'rgba(168,85,247,0.12)', DEF: 'rgba(100,116,139,0.12)',
};

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

function getTeamForPick(pickNumber, draftOrder) {
  const round = Math.floor(pickNumber / TOTAL_TEAMS);
  const pickInRound = pickNumber % TOTAL_TEAMS;
  const orderIndex = round % 2 === 0 ? pickInRound : (TOTAL_TEAMS - 1 - pickInRound);
  return draftOrder[orderIndex];
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STARTER_NEEDS = { QB: 1, RB: 2, WR: 2, TE: 1, DST: 1, K: 1 };

// --- Bot Draft Archetypes ---
const BOT_ARCHETYPES = {
  balanced:  { name: 'Balanced', roundPrefs: {} },
  heroRB:    { name: 'Hero RB',  roundPrefs: { 0: ['RB'], 1: ['WR','TE'], 2: ['WR','TE'], 3: ['WR'], 4: ['WR','TE'] } },
  zeroRB:    { name: 'Zero RB',  roundPrefs: { 0: ['WR'], 1: ['WR','TE'], 2: ['WR'], 3: ['RB','WR'], 4: ['RB'] } },
  eliteQB:   { name: 'Elite QB', roundPrefs: { 1: ['QB'], 2: ['QB'], 3: ['QB'] } },
  robustRB:  { name: 'Robust RB', roundPrefs: { 0: ['RB'], 1: ['RB'], 2: ['RB'], 3: ['RB','WR'] } },
};

function assignBotArchetypes(draftOrder) {
  const archetypes = {};
  const pool = [];
  // Distribution: balanced 35%, heroRB 20%, zeroRB 15%, eliteQB 15%, robustRB 15%
  const dist = [
    ...Array(4).fill('balanced'),
    ...Array(2).fill('heroRB'),
    ...Array(2).fill('zeroRB'),
    ...Array(2).fill('eliteQB'),
    ...Array(2).fill('robustRB'),
  ];
  const shuffled = shuffleArray(dist);
  let idx = 0;
  draftOrder.forEach(teamId => {
    if (teamId === USER_TEAM_ID) return;
    archetypes[teamId] = shuffled[idx % shuffled.length];
    idx++;
  });
  return archetypes;
}

// Scoring format position multipliers
function getPositionMultiplier(pos, scoringPreset) {
  const mults = {
    standard:     { QB: 1.0, RB: 1.15, WR: 0.95, TE: 0.90, K: 1.0, DEF: 1.0 },
    ppr:          { QB: 1.0, RB: 0.95, WR: 1.15, TE: 1.05, K: 1.0, DEF: 1.0 },
    halfPpr:      { QB: 1.0, RB: 1.05, WR: 1.08, TE: 1.0,  K: 1.0, DEF: 1.0 },
    sixPtPassTd:  { QB: 1.25, RB: 1.0, WR: 1.0,  TE: 0.95, K: 1.0, DEF: 1.0 },
    tePremium:    { QB: 1.0, RB: 1.0, WR: 1.0,  TE: 1.20, K: 1.0, DEF: 1.0 },
  };
  return (mults[scoringPreset] || mults.ppr)[pos] || 1.0;
}

function getTeamNeeds(picks, teamId) {
  const counts = {};
  picks.forEach(p => {
    if (p.teamId !== teamId) return;
    const player = PLAYER_MAP[p.playerId];
    if (player) counts[player.pos] = (counts[player.pos] || 0) + 1;
  });
  const needs = {};
  Object.entries(STARTER_NEEDS).forEach(([pos, needed]) => {
    const have = counts[pos] || 0;
    if (have < needed) needs[pos] = needed - have;
  });

  // FLEX slot: filled by excess RB/WR/TE beyond starter needs
  const rbExcess = Math.max(0, (counts['RB'] || 0) - (STARTER_NEEDS.RB || 0));
  const wrExcess = Math.max(0, (counts['WR'] || 0) - (STARTER_NEEDS.WR || 0));
  const teExcess = Math.max(0, (counts['TE'] || 0) - (STARTER_NEEDS.TE || 0));
  const flexFilled = rbExcess + wrExcess + teExcess >= 1;
  if (!flexFilled) needs['FLEX'] = 1;

  return { needs, counts };
}

// Detect positional runs (3+ of same position in last 8 picks)
function detectPositionalRun(picks, pos) {
  const recent = picks.slice(-8);
  let count = 0;
  recent.forEach(p => {
    const pl = PLAYER_MAP[p.playerId];
    if (pl && pl.pos === pos) count++;
  });
  return count >= 3;
}

function weightedRandomPick(candidates) {
  if (candidates.length === 0) return null;
  const topN = candidates.slice(0, Math.min(3, candidates.length));
  const weights = [0.6, 0.25, 0.15];
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < topN.length; i++) {
    cumulative += weights[i] || 0.1;
    if (r <= cumulative) return topN[i].id;
  }
  return topN[0].id;
}

function getBestAvailable(state, teamId, scoringPreset = 'ppr', archetypes = {}) {
  const pickedSet = new Set(state.picks.map(p => p.playerId));
  const available = PLAYERS.filter(p => !pickedSet.has(p.id));
  if (available.length === 0) return null;

  const { needs, counts } = getTeamNeeds(state.picks, teamId);
  const neededPositions = Object.keys(needs);
  const round = Math.floor(state.currentPick / TOTAL_TEAMS);
  const archetype = archetypes[teamId] || 'balanced';
  const archetypeDef = BOT_ARCHETYPES[archetype] || BOT_ARCHETYPES.balanced;

  // Score each available player with format-aware, archetype-aware valuation
  const scored = available.map(p => {
    let score = getHexScore(p.id);

    // Apply scoring format multiplier
    score *= getPositionMultiplier(p.pos, scoringPreset);

    // Archetype round preferences: big boost if this position is preferred this round
    const roundPrefs = archetypeDef.roundPrefs[round];
    if (roundPrefs && roundPrefs.includes(p.pos)) {
      score *= 1.25;
    }

    // Positional need boost: if team needs this position as a starter, boost it
    if (neededPositions.includes(p.pos) || (neededPositions.includes('FLEX') && ['RB','WR','TE'].includes(p.pos))) {
      score *= round < 9 ? 1.15 : 1.05;
    }

    // Positional run urgency: if a run is happening at QB/TE and we need one, boost hard
    if ((p.pos === 'QB' || p.pos === 'TE') && needs[p.pos] && detectPositionalRun(state.picks, p.pos)) {
      score *= 1.35;
    }

    // Late round upside bonus (rounds 10-13): prefer trending-up players
    if (round >= 10 && round <= 13 && p.avg > 0) {
      const trendRatio = p.proj / p.avg;
      if (trendRatio > 1.05) score *= 1.1;
    }

    // Rounds 14-15: K/DEF urgency if unfilled
    if (round >= 14) {
      if (p.pos === 'K' && needs['K']) score *= 2.0;
      if (p.pos === 'DEF' && needs['DST']) score *= 2.0;
    }

    // Penalize positions we already have enough of
    if (p.pos === 'K' && (counts['K'] || 0) >= 1) score *= 0.01;
    if (p.pos === 'DEF' && (counts['DEF'] || 0) >= 1) score *= 0.01;
    if (p.pos === 'QB' && (counts['QB'] || 0) >= 2) score *= 0.3;

    // K/DEF should rarely go before round 12 unless needed
    if (round < 12 && (p.pos === 'K' || p.pos === 'DEF')) {
      score *= 0.4;
    }

    return { ...p, adjustedScore: score };
  });

  scored.sort((a, b) => b.adjustedScore - a.adjustedScore);
  return weightedRandomPick(scored);
}

function makeInitialState(initialDraft) {
  if (initialDraft && initialDraft.phase === 'complete' && initialDraft.picks?.length > 0) {
    return {
      phase: 'complete',
      draftOrder: initialDraft.draftOrder || TEAMS.map(t => t.id),
      picks: initialDraft.picks,
      currentPick: TOTAL_PICKS,
      timer: 0,
      timerRunning: false,
      pickQueue: [],
      pickSpeed: 'fast',
      announcements: [],
      timerSetting: 60,
      autoDraft: false,
    };
  }
  return {
    phase: 'lobby',
    draftOrder: TEAMS.map(t => t.id),
    picks: [],
    currentPick: 0,
    timer: 60,
    timerRunning: false,
    pickQueue: [],
    pickSpeed: 'fast',
    announcements: [],
    timerSetting: 60,
    autoDraft: false,
  };
}

export default function DraftBoard({ onDraftComplete, onDraftReset, leagueName = 'League', initialDraft, scoringPreset = 'ppr', leagueSize = 12 }) {
  const [state, setState] = useState(() => makeInitialState(initialDraft));
  const [botArchetypes, setBotArchetypes] = useState({});
  const timerRef = useRef(null);
  const [posFilter, setPosFilter] = useState('ALL');
  const [rosterView, setRosterView] = useState('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('hex');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const boardRef = useRef(null);

  const pickedIds = useMemo(() => new Set(state.picks.map(p => p.playerId)), [state.picks]);

  const availablePlayers = useMemo(() => {
    let list = PLAYERS.filter(p => !pickedIds.has(p.id));
    if (posFilter !== 'ALL') list = list.filter(p => p.pos === posFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    }
    if (sortBy === 'hex') {
      list.sort((a, b) => getHexScore(b.id) - getHexScore(a.id));
    } else {
      list.sort((a, b) => b[sortBy] - a[sortBy]);
    }
    return list;
  }, [pickedIds, posFilter, searchQuery, sortBy]);

  const currentTeamId = useMemo(
    () => state.phase === 'active' ? getTeamForPick(state.currentPick, state.draftOrder) : null,
    [state.currentPick, state.draftOrder, state.phase]
  );

  const isUserTurn = currentTeamId === USER_TEAM_ID && !state.autoDraft;

  const userRoster = useMemo(() => {
    return state.picks.filter(p => p.teamId === USER_TEAM_ID).map(p => ({
      ...p,
      player: PLAYER_MAP[p.playerId],
    }));
  }, [state.picks]);

  const teamRostersMap = useMemo(() => {
    const map = {};
    TEAMS.forEach(t => { map[t.id] = []; });
    state.picks.forEach(p => {
      if (map[p.teamId]) {
        map[p.teamId].push({ ...p, player: PLAYER_MAP[p.playerId] });
      }
    });
    return map;
  }, [state.picks]);

  // Board data — MUST be before any conditional returns (React hooks rule)
  const boardData = useMemo(() => {
    const grid = [];
    for (let round = 0; round < TOTAL_ROUNDS; round++) {
      const row = [];
      for (let col = 0; col < TOTAL_TEAMS; col++) {
        const pickForThisCell = state.picks.find(p => p.round === round && p.teamId === state.draftOrder[col]);
        const player = pickForThisCell ? PLAYER_MAP[pickForThisCell.playerId] : null;
        row.push({
          teamId: state.draftOrder[col],
          round,
          pick: pickForThisCell ? { ...pickForThisCell, player } : null,
          isCurrent: state.phase === 'active' && state.currentPick < TOTAL_PICKS &&
            getTeamForPick(state.currentPick, state.draftOrder) === state.draftOrder[col] &&
            Math.floor(state.currentPick / TOTAL_TEAMS) === round,
        });
      }
      grid.push(row);
    }
    return grid;
  }, [state.picks, state.draftOrder, state.currentPick, state.phase]);

  // Execute a pick
  const executePick = useCallback((prev, playerId = null) => {
    if (prev.currentPick >= TOTAL_PICKS) return prev;
    const teamId = getTeamForPick(prev.currentPick, prev.draftOrder);
    const isUser = teamId === USER_TEAM_ID;
    const pickedSet = new Set(prev.picks.map(p => p.playerId));

    if (!playerId) {
      if (isUser && prev.pickQueue.length > 0) {
        playerId = prev.pickQueue.find(pid => !pickedSet.has(pid));
      }
      if (!playerId) {
        playerId = getBestAvailable(prev, teamId, scoringPreset, botArchetypes);
      }
    }

    if (!playerId) return prev;

    const round = Math.floor(prev.currentPick / TOTAL_TEAMS);
    const pickInRound = prev.currentPick % TOTAL_TEAMS;
    const player = PLAYER_MAP[playerId];

    const newPick = { pickNumber: prev.currentPick, round, pickInRound, teamId, playerId, timestamp: Date.now() };
    const nextPick = prev.currentPick + 1;
    const isComplete = nextPick >= TOTAL_PICKS;
    const nextTeam = isComplete ? null : getTeamForPick(nextPick, prev.draftOrder);
    const nextIsUser = nextTeam === USER_TEAM_ID;

    return {
      ...prev,
      picks: [...prev.picks, newPick],
      currentPick: nextPick,
      phase: isComplete ? 'complete' : 'active',
      timer: isComplete ? 0 : ((nextIsUser && !prev.autoDraft) ? prev.timerSetting : (prev.pickSpeed === 'instant' ? 0 : 2)),
      timerRunning: !isComplete,
      pickQueue: isUser ? prev.pickQueue.filter(pid => pid !== playerId) : prev.pickQueue,
      announcements: [
        { playerId, teamId, player, round, pickInRound, timestamp: Date.now() },
        ...prev.announcements.slice(0, 4),
      ],
    };
  }, [scoringPreset, botArchetypes]);

  // Timer effect
  useEffect(() => {
    if (state.phase !== 'active' || !state.timerRunning) return;

    const currentTeam = getTeamForPick(state.currentPick, state.draftOrder);
    const isUser = currentTeam === USER_TEAM_ID;
    const isAutoUser = isUser && state.autoDraft;
    const isManualUser = isUser && !state.autoDraft;
    const interval = isManualUser ? 1000 : (state.pickSpeed === 'instant' ? 80 : 400);

    timerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.timer <= 0) {
          return executePick(prev);
        }
        return { ...prev, timer: prev.timer - 1 };
      });
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [state.currentPick, state.phase, state.timerRunning, state.draftOrder, state.pickSpeed, state.autoDraft, executePick]);

  // On draft complete — pass rosters + raw picks/draftOrder for persistence
  const draftCompleteCalledRef = useRef(false);
  useEffect(() => {
    if (state.phase === 'complete' && onDraftComplete && !draftCompleteCalledRef.current) {
      draftCompleteCalledRef.current = true;
      const rosters = {};
      TEAMS.forEach(t => {
        rosters[t.id] = state.picks.filter(p => p.teamId === t.id).map(p => p.playerId);
      });
      onDraftComplete(rosters, state.picks, state.draftOrder);
    }
    if (state.phase !== 'complete') draftCompleteCalledRef.current = false;
  }, [state.phase, onDraftComplete, state.picks, state.draftOrder]);

  // Auto-scroll draft board
  useEffect(() => {
    if (boardRef.current && state.phase === 'active') {
      const currentRound = Math.floor(state.currentPick / TOTAL_TEAMS);
      const rows = boardRef.current.querySelectorAll('tr');
      if (rows[currentRound + 1]) {
        rows[currentRound + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [state.currentPick, state.phase]);

  const handleUserPick = (playerId) => {
    if (!isUserTurn || state.phase !== 'active') return;
    clearInterval(timerRef.current);
    setState(prev => executePick(prev, playerId));
  };

  const toggleQueue = (playerId) => {
    setState(prev => ({
      ...prev,
      pickQueue: prev.pickQueue.includes(playerId)
        ? prev.pickQueue.filter(id => id !== playerId)
        : [...prev.pickQueue, playerId],
    }));
  };

  const removeFromQueue = (playerId) => {
    setState(prev => ({ ...prev, pickQueue: prev.pickQueue.filter(id => id !== playerId) }));
  };

  const startDraft = () => {
    const firstTeam = state.draftOrder[0];
    const firstIsUser = firstTeam === USER_TEAM_ID;
    const firstIsManualUser = firstIsUser && !state.autoDraft;
    setBotArchetypes(assignBotArchetypes(state.draftOrder));
    setState(prev => ({
      ...prev,
      phase: 'active',
      timer: firstIsManualUser ? prev.timerSetting : (prev.pickSpeed === 'instant' ? 0 : 2),
      timerRunning: true,
    }));
  };

  const randomizeOrder = () => {
    setState(prev => ({ ...prev, draftOrder: shuffleArray(prev.draftOrder) }));
  };

  const resetDraft = () => {
    clearInterval(timerRef.current);
    draftCompleteCalledRef.current = false;
    setState(makeInitialState());
    setShowResetConfirm(false);
    setPosFilter('ALL');
    setSearchQuery('');
    if (onDraftReset) onDraftReset();
  };

  // ========== RENDER ==========

  // Shared: current pick info for active phase
  const currentTeam = state.phase === 'active' ? TEAMS.find(t => t.id === currentTeamId) : null;
  const currentRound = Math.floor(state.currentPick / TOTAL_TEAMS) + 1;
  const overallPick = state.currentPick + 1;
  const timerColor = state.timer > 30 ? 'var(--success-green, #22c55e)' : state.timer > 10 ? 'var(--warning-amber, #f59e0b)' : 'var(--red, #ef4444)';

  // ---- LOBBY ----
  if (state.phase === 'lobby') {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="ff-card">
          <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
          <div className="ff-card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{leagueName} Draft Room</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Snake Draft &middot; {TOTAL_ROUNDS} Rounds &middot; {TOTAL_PICKS} Picks</span>
          </div>
          <div className="ff-card-body">
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Draft Order</h3>
                <button className="ff-btn ff-btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={randomizeOrder}>
                  Randomize
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {state.draftOrder.map((teamId, i) => {
                  const team = TEAMS.find(t => t.id === teamId);
                  const isUser = teamId === USER_TEAM_ID;
                  return (
                    <div key={teamId} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      background: isUser ? 'var(--accent-20, rgba(191,148,105,0.15))' : 'var(--surface, var(--bg-alt))',
                      border: isUser ? '2px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: 8, fontSize: 13,
                    }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 16, minWidth: 24 }}>{i + 1}</span>
                      <div>
                        <div style={{ fontWeight: isUser ? 700 : 600 }}>{team.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{team.owner}{isUser ? ' (You)' : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Pick Timer</label>
                <select className="ff-search-input" style={{ padding: '8px 12px', minWidth: 120, width: 'auto' }}
                  value={state.timerSetting}
                  onChange={e => setState(prev => ({ ...prev, timerSetting: Number(e.target.value) }))}>
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                  <option value={90}>90 seconds</option>
                  <option value={120}>120 seconds</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>AI Pick Speed</label>
                <select className="ff-search-input" style={{ padding: '8px 12px', minWidth: 120, width: 'auto' }}
                  value={state.pickSpeed}
                  onChange={e => setState(prev => ({ ...prev, pickSpeed: e.target.value }))}>
                  <option value="instant">Instant</option>
                  <option value="fast">Fast (0.5s)</option>
                  <option value="slow">Slow (2s)</option>
                </select>
              </div>
            </div>

            {/* Auto-Draft Toggle */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', marginBottom: 24,
              background: state.autoDraft ? 'rgba(22,163,74,0.08)' : 'var(--surface, var(--bg-alt))',
              border: state.autoDraft ? '2px solid var(--success-green, #22c55e)' : '1px solid var(--border)',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, transition: 'all 0.15s',
            }}>
              <input type="checkbox" checked={state.autoDraft}
                onChange={e => setState(prev => ({ ...prev, autoDraft: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: 'var(--success-green, #22c55e)' }} />
              <div>
                <div style={{ fontWeight: 600 }}>Auto-Draft My Picks</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Your picks will be made automatically using best available or your pick queue
                </div>
              </div>
            </label>

            <button className="ff-btn ff-btn-primary" style={{ fontSize: 15, padding: '14px 32px', width: '100%' }} onClick={startDraft}>
              Start Draft
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- DRAFT COMPLETE ----
  if (state.phase === 'complete') {
    // Compute draft grade for user's team
    const userRosterComplete = teamRostersMap[USER_TEAM_ID] || [];
    const userTotalHex = userRosterComplete.reduce((sum, p) => sum + getHexScore(p.playerId), 0);
    const allTeamTotals = state.draftOrder.map(tid => ({
      teamId: tid,
      total: (teamRostersMap[tid] || []).reduce((sum, p) => sum + getHexScore(p.playerId), 0),
    })).sort((a, b) => b.total - a.total);
    const userRank = allTeamTotals.findIndex(t => t.teamId === USER_TEAM_ID) + 1;
    const maxHex = allTeamTotals[0]?.total || 1;
    const minHex = allTeamTotals[allTeamTotals.length - 1]?.total || 0;
    const hexRange = maxHex - minHex || 1;
    const gradeFromHex = (total) => {
      const pct = (total - minHex) / hexRange;
      if (pct >= 0.95) return { grade: 'S',  color: 'var(--grade-s)' };
      if (pct >= 0.88) return { grade: 'A+', color: 'var(--grade-a-plus)' };
      if (pct >= 0.80) return { grade: 'A',  color: 'var(--grade-a)' };
      if (pct >= 0.72) return { grade: 'A-', color: 'var(--grade-a-minus)' };
      if (pct >= 0.64) return { grade: 'B+', color: 'var(--grade-b-plus)' };
      if (pct >= 0.56) return { grade: 'B',  color: 'var(--grade-b)' };
      if (pct >= 0.48) return { grade: 'B-', color: 'var(--grade-b-minus)' };
      if (pct >= 0.40) return { grade: 'C+', color: 'var(--grade-c-plus)' };
      if (pct >= 0.32) return { grade: 'C',  color: 'var(--grade-c)' };
      if (pct >= 0.20) return { grade: 'D',  color: 'var(--grade-d)' };
      return { grade: 'F', color: 'var(--grade-f)' };
    };
    const { grade: draftGrade, color: gradeColor } = gradeFromHex(userTotalHex);

    return (
      <div className="ff-draft-immersive" style={{ padding: '0 20px 40px' }}>
        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="auth-overlay" onClick={e => { if (e.target === e.currentTarget) setShowResetConfirm(false); }}>
            <div className="auth-modal" style={{ maxWidth: 380, width: '90vw', textAlign: 'center' }}>
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>Reset Draft?</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                This will clear all draft picks and return to the draft lobby. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setShowResetConfirm(false)}
                  style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid var(--di-border, #555)', background: 'transparent', color: 'var(--di-text, #ccc)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={resetDraft}
                  style={{ padding: '10px 20px', borderRadius: 6, border: 'none', background: 'var(--red, #ef4444)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Reset Draft
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Draft Summary Header */}
        <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--di-text-muted, #888)', marginBottom: 8 }}>Draft Complete</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 4px', fontFamily: "'Playfair Display', serif" }}>{leagueName}</h1>
          <p style={{ fontSize: 13, color: 'var(--di-text-faint, #666)' }}>{TOTAL_PICKS} picks &middot; {TOTAL_ROUNDS} rounds &middot; {TOTAL_TEAMS} teams</p>
        </div>

        {/* Your Team — Hero Card with Draft Grade */}
        {(() => {
          const userTeam = TEAMS.find(t => t.id === USER_TEAM_ID);
          return (
            <div style={{
              background: 'var(--gray-800)', border: '2px solid var(--accent)', borderRadius: 12,
              marginBottom: 24, overflow: 'hidden',
            }}>
              {/* Grade Banner */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px', borderBottom: '1px solid var(--gray-700)',
                background: 'rgba(139,92,246,0.06)',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{userTeam?.name}</span>
                    <span style={{ fontSize: 9, background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase' }}>Your Team</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--di-text-muted, #888)' }}>
                    {userRosterComplete.length} players &middot; Ranked #{userRank} of {TOTAL_TEAMS} &middot; {Math.round(userTotalHex)} total <span style={{ color: 'var(--hex-purple)' }}>Hex</span>Score
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 78, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: gradeColor, fontSize: 28, fontWeight: 900, color: '#fff' }}>
                    {draftGrade}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--di-text-muted, #888)', marginTop: 4 }}><svg viewBox="0 0 14 16" width="10" height="11" style={{ verticalAlign: '-1px', marginRight: 2 }}><polygon points="7,1 13,4.5 13,11.5 7,15 1,11.5 1,4.5" fill="none" stroke="var(--hex-purple)" strokeWidth="1.5"/></svg><span style={{ color: 'var(--hex-purple)' }}>Hex</span>Grade</div>
                </div>
              </div>

              {/* Position Group Analysis */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--gray-700)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--di-text-muted, #888)', marginBottom: 12 }}><svg viewBox="0 0 14 16" width="11" height="12" style={{ verticalAlign: '-1px', marginRight: 3 }}><polygon points="7,1 13,4.5 13,11.5 7,15 1,11.5 1,4.5" fill="none" stroke="var(--hex-purple)" strokeWidth="1.5"/></svg>Position <span style={{ color: 'var(--hex-purple)' }}>Hex</span>Grades</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {['QB', 'RB', 'WR', 'TE'].map(pos => {
                    const starterSlots = { QB: 1, RB: 2, WR: 2, TE: 1 };
                    const starters = starterSlots[pos] || 1;
                    // Compute per-team totals — starters at full weight, bench at 25%
                    const teamPosTotals = state.draftOrder.map(tid => {
                      const roster = teamRostersMap[tid] || [];
                      const posPlayers = roster.filter(p => p.player?.pos === pos)
                        .sort((a, b) => getHexScore(b.playerId) - getHexScore(a.playerId));
                      let total = 0;
                      posPlayers.forEach((p, i) => {
                        total += getHexScore(p.playerId) * (i < starters ? 1.0 : 0.25);
                      });
                      return { teamId: tid, total, best: posPlayers[0], count: posPlayers.length };
                    }).sort((a, b) => b.total - a.total);

                    const userEntry = teamPosTotals.find(t => t.teamId === USER_TEAM_ID) || { total: 0, count: 0 };
                    const posRank = teamPosTotals.findIndex(t => t.teamId === USER_TEAM_ID) + 1;
                    const posMax = teamPosTotals[0]?.total || 1;
                    const posMin = teamPosTotals[teamPosTotals.length - 1]?.total || 0;
                    const posRange = posMax - posMin || 1;
                    const posPct = (userEntry.total - posMin) / posRange;
                    const posGradeData = posPct >= 0.95 ? { g: 'S', c: 'var(--grade-s)' }
                      : posPct >= 0.88 ? { g: 'A+', c: 'var(--grade-a-plus)' }
                      : posPct >= 0.80 ? { g: 'A', c: 'var(--grade-a)' }
                      : posPct >= 0.72 ? { g: 'A-', c: 'var(--grade-a-minus)' }
                      : posPct >= 0.64 ? { g: 'B+', c: 'var(--grade-b-plus)' }
                      : posPct >= 0.56 ? { g: 'B', c: 'var(--grade-b)' }
                      : posPct >= 0.48 ? { g: 'B-', c: 'var(--grade-b-minus)' }
                      : posPct >= 0.40 ? { g: 'C+', c: 'var(--grade-c-plus)' }
                      : posPct >= 0.32 ? { g: 'C', c: 'var(--grade-c)' }
                      : posPct >= 0.20 ? { g: 'D', c: 'var(--grade-d)' }
                      : { g: 'F', c: 'var(--grade-f)' };
                    const leagueBestPct = posMax > 0 ? Math.round((userEntry.total / posMax) * 100) : 0;

                    return (
                      <div key={pos} style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--gray-700)',
                        borderRadius: 8, padding: '12px 14px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: POS_COLORS[pos], textTransform: 'uppercase', marginBottom: 8 }}>{pos}s</div>
                        <div style={{ margin: '0 auto 6px', display: 'flex', justifyContent: 'center' }}>
                          <span className="hex-grade-badge-xl" style={{ background: posGradeData.c }}>{posGradeData.g}</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--di-text-muted, #888)', marginBottom: 6 }}>#{posRank} of {TOTAL_TEAMS}</div>
                        <div style={{ background: 'var(--di-border, #333)', borderRadius: 3, height: 4, marginBottom: 6 }}>
                          <div style={{ background: posGradeData.c, borderRadius: 3, height: '100%', width: `${leagueBestPct}%`, transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--di-text-faint, #666)' }}>{leagueBestPct}% of league best</div>
                        {userEntry.best && (
                          <div style={{ fontSize: 10, color: 'var(--di-text-muted, #aaa)', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Top: <span style={{ fontWeight: 600, color: 'var(--di-text, #ddd)' }}>{userEntry.best.player?.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Roster by Position Group */}
              {(() => {
                // Build league-wide drafted player rankings by position
                const allDraftedByPos = {};
                state.draftOrder.forEach(tid => {
                  (teamRostersMap[tid] || []).forEach(pick => {
                    const pos = pick.player?.pos;
                    if (!pos) return;
                    if (!allDraftedByPos[pos]) allDraftedByPos[pos] = [];
                    allDraftedByPos[pos].push({ playerId: pick.playerId, hex: getHexScore(pick.playerId), teamId: tid });
                  });
                });
                Object.values(allDraftedByPos).forEach(arr => arr.sort((a, b) => b.hex - a.hex));

                const getPlayerHexGrade = (playerId, pos) => {
                  const pool = allDraftedByPos[pos] || [];
                  if (pool.length === 0) return { g: '-', c: '#666' };
                  const rank = pool.findIndex(p => p.playerId === playerId);
                  if (rank < 0) return { g: '-', c: '#666' };
                  const pct = pool.length > 1 ? 1 - (rank / (pool.length - 1)) : 1;
                  if (pct >= 0.95) return { g: 'S', c: 'var(--grade-s)' };
                  if (pct >= 0.88) return { g: 'A+', c: 'var(--grade-a-plus)' };
                  if (pct >= 0.80) return { g: 'A', c: 'var(--grade-a)' };
                  if (pct >= 0.72) return { g: 'A-', c: 'var(--grade-a-minus)' };
                  if (pct >= 0.64) return { g: 'B+', c: 'var(--grade-b-plus)' };
                  if (pct >= 0.56) return { g: 'B', c: 'var(--grade-b)' };
                  if (pct >= 0.48) return { g: 'B-', c: 'var(--grade-b-minus)' };
                  if (pct >= 0.40) return { g: 'C+', c: 'var(--grade-c-plus)' };
                  if (pct >= 0.32) return { g: 'C', c: 'var(--grade-c)' };
                  if (pct >= 0.20) return { g: 'D', c: 'var(--grade-d)' };
                  return { g: 'F', c: 'var(--grade-f)' };
                };

                // Sort into roster slots
                const byPos = { QB: [], RB: [], WR: [], TE: [], K: [], DEF: [] };
                userRosterComplete.forEach(pick => {
                  const pos = pick.player?.pos;
                  if (byPos[pos]) byPos[pos].push(pick);
                });
                const starters = [
                  { label: 'QB', pick: byPos.QB[0] || null },
                  { label: 'RB1', pick: byPos.RB[0] || null },
                  { label: 'RB2', pick: byPos.RB[1] || null },
                  { label: 'WR1', pick: byPos.WR[0] || null },
                  { label: 'WR2', pick: byPos.WR[1] || null },
                  { label: 'TE', pick: byPos.TE[0] || null },
                  { label: 'FLEX', pick: byPos.RB[2] || byPos.WR[2] || byPos.TE[1] || null },
                  { label: 'K', pick: byPos.K[0] || null },
                  { label: 'DEF', pick: byPos.DEF[0] || null },
                ];
                const starterIds = new Set(starters.filter(s => s.pick).map(s => s.pick.playerId));
                const bench = userRosterComplete.filter(p => !starterIds.has(p.playerId));

                const renderRow = (label, pick, muted) => {
                  const pg = pick ? getPlayerHexGrade(pick.playerId, pick.player?.pos) : null;
                  const pool = pick ? (allDraftedByPos[pick.player?.pos] || []) : [];
                  const pRank = pick ? pool.findIndex(p => p.playerId === pick.playerId) + 1 : 0;
                  return (
                    <div key={label + (pick?.playerId || '')} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0',
                      borderBottom: '1px solid var(--gray-700)', fontSize: 12,
                      opacity: muted ? 0.6 : 1,
                    }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, minWidth: 32, textTransform: 'uppercase',
                        color: POS_COLORS[pick?.player?.pos] || '#666',
                      }}>{label}</span>
                      {pick ? (
                        <>
                          <PlayerHeadshot espnId={getEspnId(pick.player?.name)} name={pick.player?.name} size="xs" pos={pick.player?.pos} team={pick.player?.team} />
                          <PosBadge pos={pick.player?.pos} />
                          <span style={{ fontWeight: 600, color: 'var(--di-text, #ddd)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pick.player?.name}</span>
                          <span style={{ color: 'var(--di-text-faint, #666)', fontSize: 10 }}>{pick.player?.team}</span>
                          <span style={{ color: 'var(--di-text-faint, #666)', fontSize: 9 }}>R{pick.round + 1}</span>
                          <span style={{ color: 'var(--hex-purple)', fontSize: 11, fontWeight: 700, minWidth: 28, textAlign: 'right' }} className="tabular-nums">{formatHex(getHexScore(pick.playerId))}</span>
                          {pg && (
                            <span className="hex-grade-badge" style={{ background: pg.c }}>{pg.g}</span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--di-text-dim, #555)', fontStyle: 'italic', fontSize: 11 }}>Empty</span>
                      )}
                    </div>
                  );
                };

                return (
                  <div style={{ padding: '12px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--di-text-muted, #888)' }}>Starters</span>
                      <span style={{ fontSize: 9, color: 'var(--di-text-dim, #555)' }}><span style={{ color: 'var(--hex-purple)' }}>Hex</span>Grade vs. league</span>
                    </div>
                    {starters.map(s => renderRow(s.label, s.pick, false))}
                    {bench.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--di-text-faint, #666)', marginTop: 12, marginBottom: 6 }}>Bench</div>
                        {bench.map((pick, i) => renderRow('BN', pick, true))}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Actions */}
              <div style={{ padding: '12px 24px', borderTop: '1px solid var(--gray-700)', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowResetConfirm(true)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--di-border, #555)', background: 'transparent', color: 'var(--di-text-muted, #999)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Reset Draft
                </button>
              </div>
            </div>
          );
        })()}

        {/* All Teams Grid */}
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--di-text-muted, #888)', marginBottom: 12 }}>
          All Teams
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 0, border: '1px solid var(--gray-700)', borderRadius: 10, overflow: 'hidden' }}>
          {allTeamTotals.map(({ teamId }, rankIdx) => {
            if (teamId === USER_TEAM_ID) return null;
            const team = TEAMS.find(t => t.id === teamId);
            const roster = teamRostersMap[teamId] || [];
            const teamTotal = allTeamTotals[rankIdx]?.total || 0;
            const { grade: teamGrade, color: tgColor } = gradeFromHex(teamTotal);
            return (
              <div key={teamId} style={{ background: 'var(--gray-800)', borderBottom: '1px solid var(--gray-700)', borderRight: '1px solid var(--gray-700)' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 14px', borderBottom: '1px solid var(--gray-700)', background: 'rgba(255,255,255,0.02)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--di-text, #ddd)' }}>{team?.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--di-text-faint, #666)' }}>#{rankIdx + 1} overall</div>
                  </div>
                  <span className="hex-grade-badge-lg" style={{ background: tgColor }}>{teamGrade}</span>
                </div>
                <div style={{ padding: '2px 12px 6px' }}>
                  {roster.map((pick, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0',
                      borderBottom: i < roster.length - 1 ? '1px solid var(--gray-800)' : 'none',
                      fontSize: 11,
                    }}>
                      <span style={{ color: 'var(--di-text-dim, #555)', minWidth: 18, fontSize: 9 }}>R{pick.round + 1}</span>
                      <PosBadge pos={pick.player?.pos} />
                      <span style={{ fontWeight: 500, color: 'var(--di-text, #bbb)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pick.player?.name}</span>
                      <span style={{ color: 'var(--di-text-faint, #666)', fontSize: 9 }}>{pick.player?.team}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- ACTIVE DRAFT ----
  return (
    <div className="ff-draft-immersive">
      <style>{`
        @keyframes pickFlash { 0% { background: var(--accent); } 100% { background: transparent; } }
      `}</style>

      {/* Compact Draft Header Bar */}
      <div className="ff-draft-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ background: 'none', border: 'none', color: 'var(--di-text-muted, #999)', fontSize: 12, cursor: 'pointer' }} onClick={() => window.history.back()}>{'\u2190'} Exit</button>
          <span style={{ color: 'var(--di-text-faint, #666)', fontSize: 11 }}>|</span>
          <span style={{ fontSize: 11, color: 'var(--di-text-muted, #888)', fontWeight: 600 }}>Rd {currentRound} &middot; Pick {overallPick}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{currentTeam?.name}</span>
          {isUserTurn && <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>YOUR PICK</span>}
          {!isUserTurn && <span style={{ fontSize: 10, color: 'var(--di-text-muted, #888)' }}>on the clock</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ background: 'var(--di-border, #333)', borderRadius: 4, height: 4, width: 80 }}>
              <div style={{ background: 'var(--accent)', borderRadius: 4, height: '100%', width: `${(state.picks.length / TOTAL_PICKS) * 100}%`, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--di-text-muted, #888)' }}>{state.picks.length}/{TOTAL_PICKS}</span>
          </div>
          <div style={{
            fontSize: 24, fontWeight: 800, fontFamily: 'monospace', color: timerColor, lineHeight: 1,
            minWidth: 36, textAlign: 'center',
          }}>
            {isUserTurn ? state.timer : '\u00B7\u00B7\u00B7'}
          </div>
        </div>
      </div>

      {/* Bottom Toast Announcement */}
      {state.announcements.length > 0 && (() => {
        const ann = state.announcements[0];
        const team = TEAMS.find(t => t.id === ann.teamId);
        return (
          <div className="ff-draft-toast" key={ann.timestamp}>
            <div style={{ width: 4, height: 28, borderRadius: 2, background: POS_COLORS[ann.player?.pos] || 'var(--accent)', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{team?.abbr}: <span style={{ color: POS_COLORS[ann.player?.pos] }}>{ann.player?.name}</span></div>
              <div style={{ color: 'var(--di-text-muted, #888)', fontSize: 10 }}>Rd {ann.round + 1}, Pick {ann.pickInRound + 1}</div>
            </div>
          </div>
        );
      })()}

      {/* 3-Panel Layout */}
      <div className="ff-draft-3panel">
        {/* LEFT: Draft Board */}
        <div className="ff-draft-panel-left" ref={boardRef}>
          <table className="ff-draft-board-compact">
            <thead>
              <tr>
                <th className="round-cell"></th>
                {state.draftOrder.map(teamId => {
                  const team = TEAMS.find(t => t.id === teamId);
                  const isU = teamId === USER_TEAM_ID;
                  return <th key={teamId} style={{ color: isU ? 'var(--accent)' : undefined }}>{team.abbr}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {boardData.map((row, roundIdx) => (
                <tr key={roundIdx}>
                  <td className="round-cell">{roundIdx + 1}</td>
                  {row.map((cell, colIdx) => {
                    const isU = cell.teamId === USER_TEAM_ID;
                    return (
                      <td key={colIdx} style={{
                        background: cell.isCurrent ? 'rgba(139,92,246,0.25)'
                          : cell.pick ? POS_BG[cell.pick.player?.pos] || 'transparent'
                          : isU ? 'rgba(139,92,246,0.05)' : 'transparent',
                        animation: cell.isCurrent ? 'pickFlash 1s ease-in-out infinite alternate' : undefined,
                      }}>
                        {cell.pick ? (
                          <div>
                            <div style={{ fontSize: 7, fontWeight: 700, color: POS_COLORS[cell.pick.player?.pos] }}>{cell.pick.player?.pos}</div>
                            <div style={{ fontWeight: 600, fontSize: 8, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 22, color: 'var(--di-text, #ddd)' }}>
                              {cell.pick.player?.name?.split(' ').pop()?.slice(0, 4)}
                            </div>
                          </div>
                        ) : cell.isCurrent ? (
                          <span style={{ color: 'var(--accent)', fontSize: 8 }}>{'\u25CF'}</span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CENTER: Available Players */}
        <div className="ff-draft-panel-center">
          <div className="ff-card">
            <div className="ff-card-header" style={{ padding: '10px 16px' }}>
              <h2 style={{ fontSize: 14 }}>Available Players <span style={{ fontWeight: 400, color: 'var(--di-text-muted, #888)', fontSize: 12 }}>({availablePlayers.length})</span></h2>
            </div>
            <div className="ff-tm-filter-bar" style={{ padding: '0 12px 8px' }}>
              {['ALL','QB','RB','WR','TE','K','DEF'].map(pos => (
                <button key={pos} onClick={() => setPosFilter(pos)}
                  className={`ff-tm-filter-pill${posFilter === pos ? ' active' : ''}`}
                  style={posFilter === pos && pos !== 'ALL' ? { background: POS_COLORS[pos], borderColor: POS_COLORS[pos] } : undefined}>
                  {pos}
                </button>
              ))}
              <input className="ff-search-input" type="text" placeholder="Search..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ marginLeft: 'auto', width: 140, padding: '4px 10px', fontSize: 11 }} />
            </div>
            <div className="ff-table-wrap" style={{ maxHeight: 'calc(100vh - 240px)' }}>
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th className={sortBy === 'proj' ? 'sort-active' : ''} onClick={() => setSortBy('proj')} style={{ textAlign: 'right' }}>
                      Proj {sortBy === 'proj' && <span className="sort-arrow">{'\u25BC'}</span>}
                    </th>
                    <th className={sortBy === 'hex' ? 'sort-active' : ''} onClick={() => setSortBy('hex')} style={{ textAlign: 'right', color: 'var(--hex-purple)' }}>
                      Hex {sortBy === 'hex' && <span className="sort-arrow">{'\u25BC'}</span>}
                    </th>
                    <th style={{ width: 72, textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {availablePlayers.map(player => {
                    const inQueue = state.pickQueue.includes(player.id);
                    return (
                      <tr key={player.id} style={inQueue ? { background: 'rgba(139,92,246,0.08)' } : undefined}>
                        <td>
                          <div className="ff-flex ff-gap-2">
                            <PlayerHeadshot espnId={getEspnId(player.name)} name={player.name} size="xs" pos={player.pos} team={player.team} />
                            <PosBadge pos={player.pos} />
                            <span className="player-name">{player.name}</span>
                            <span className="player-team">{player.team}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">{player.proj}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--hex-purple)' }} className="tabular-nums">{formatHex(getHexScore(player.id))}</td>
                        <td style={{ textAlign: 'center' }}>
                          {isUserTurn ? (
                            <button className="ff-btn ff-btn-primary ff-btn-sm" onClick={() => handleUserPick(player.id)}>Draft</button>
                          ) : (
                            <button className={`ff-btn ff-btn-sm ${inQueue ? 'ff-btn-primary' : 'ff-btn-secondary'}`} onClick={() => toggleQueue(player.id)}>
                              {inQueue ? 'Queued' : '+Q'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: Roster + Queue */}
        <div className="ff-draft-panel-right">
          {/* My Team — Two Views */}
          <div className="ff-card">
            <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-700)' }}>
              {[{ id: 'roster', label: 'Roster' }, { id: 'picks', label: 'Picks' }].map(tab => (
                <button key={tab.id} onClick={() => setRosterView(tab.id)} style={{
                  flex: 1, padding: '8px 0', background: 'none', border: 'none',
                  borderBottom: rosterView === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                  color: rosterView === tab.id ? '#fff' : '#888',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>{tab.label}</button>
              ))}
              <span style={{ fontSize: 10, color: 'var(--di-text-faint, #666)', padding: '8px 10px', display: 'flex', alignItems: 'center' }}>{userRoster.length}/{TOTAL_ROUNDS}</span>
            </div>
            <div style={{ padding: '0 10px 10px', maxHeight: 340, overflowY: 'auto' }}>
              {rosterView === 'roster' ? (
                /* Roster Slots View */
                (() => {
                  const preset = ROSTER_PRESETS.standard;
                  const slots = [];
                  Object.entries(preset).forEach(([pos, count]) => {
                    if (pos === 'IR') return;
                    for (let i = 0; i < count; i++) slots.push({ pos });
                  });
                  const unassigned = [...userRoster];
                  return slots.map((slot, idx) => {
                    const matchIdx = unassigned.findIndex(r => {
                      if (slot.pos === 'FLEX') return ['RB','WR','TE'].includes(r.player?.pos);
                      if (slot.pos === 'DST') return r.player?.pos === 'DEF';
                      if (slot.pos === 'BN') return true;
                      return r.player?.pos === slot.pos;
                    });
                    const match = matchIdx >= 0 ? unassigned.splice(matchIdx, 1)[0] : null;
                    const isStarter = slot.pos !== 'BN';
                    return (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
                        borderBottom: '1px solid var(--gray-700)', fontSize: 11,
                        opacity: !isStarter && !match ? 0.4 : 1,
                      }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: POS_COLORS[slot.pos] || '#888', minWidth: 26, textTransform: 'uppercase' }}>{slot.pos}</span>
                        {match ? (
                          <>
                            <PosBadge pos={match.player?.pos} />
                            <span style={{ fontWeight: 500, color: 'var(--di-text, #ddd)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.player?.name}</span>
                            <span style={{ color: 'var(--di-text-faint, #666)', fontSize: 9 }}>{match.player?.team}</span>
                          </>
                        ) : (
                          <span style={{ color: isStarter ? 'var(--accent)' : '#444', fontStyle: 'italic', fontSize: 10 }}>{isStarter ? 'Need' : '-'}</span>
                        )}
                      </div>
                    );
                  });
                })()
              ) : (
                /* Draft Order View */
                userRoster.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--di-text-faint, #666)', fontSize: 11, padding: 16 }}>No picks yet</div>
                ) : (
                  userRoster.map((pick, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
                      borderBottom: '1px solid var(--gray-700)', fontSize: 11,
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--di-text-dim, #555)', minWidth: 22 }}>R{pick.round + 1}</span>
                      <span style={{ fontSize: 8, color: 'var(--di-text-dim, #555)', minWidth: 14 }}>{pick.pickInRound + 1}</span>
                      <PosBadge pos={pick.player?.pos} />
                      <span style={{ fontWeight: 500, color: 'var(--di-text, #ddd)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pick.player?.name}</span>
                      <span style={{ color: 'var(--hex-purple)', fontSize: 10, fontWeight: 700 }} className="tabular-nums">{formatHex(getHexScore(pick.playerId))}</span>
                    </div>
                  ))
                )
              )}
            </div>
          </div>

          {/* Auto-Draft */}
          <div className="ff-card" style={{ cursor: 'pointer' }}
            onClick={() => setState(prev => ({ ...prev, autoDraft: !prev.autoDraft }))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
              <input type="checkbox" checked={state.autoDraft} readOnly style={{ width: 14, height: 14, accentColor: '#22c55e', pointerEvents: 'none' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: state.autoDraft ? '#22c55e' : '#aaa' }}>
                Auto-Draft {state.autoDraft ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Pick Queue */}
          <div className="ff-card">
            <div className="ff-card-header" style={{ padding: '8px 12px' }}>
              <h3 style={{ fontSize: 12 }}>Queue</h3>
              <span style={{ fontSize: 10, color: 'var(--di-text-muted, #888)' }}>{state.pickQueue.length}</span>
            </div>
            <div style={{ padding: '0 10px 10px', maxHeight: 200, overflowY: 'auto' }}>
              {state.pickQueue.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--di-text-faint, #666)', fontSize: 11, padding: 12 }}>
                  Queue players for auto-pick
                </div>
              ) : state.pickQueue.map((pid, i) => {
                const player = PLAYER_MAP[pid];
                const taken = pickedIds.has(pid);
                return (
                  <div key={pid} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
                    borderBottom: '1px solid var(--gray-700)', fontSize: 11,
                    opacity: taken ? 0.3 : 1, textDecoration: taken ? 'line-through' : 'none',
                  }}>
                    <span style={{ color: 'var(--di-text-faint, #666)', fontSize: 9, minWidth: 12 }}>{i + 1}</span>
                    <PosBadge pos={player?.pos} />
                    <span style={{ fontWeight: 500, color: 'var(--di-text, #ddd)' }}>{player?.name}</span>
                    <button onClick={() => removeFromQueue(pid)} style={{
                      marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--di-text-faint, #666)', fontSize: 12,
                    }}>{'\u2715'}</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
