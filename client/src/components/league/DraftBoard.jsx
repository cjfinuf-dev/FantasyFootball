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

  return needs;
}

function getBestAvailable(state, teamId) {
  const pickedSet = new Set(state.picks.map(p => p.playerId));
  const available = PLAYERS.filter(p => !pickedSet.has(p.id));
  if (available.length === 0) return null;

  const needs = getTeamNeeds(state.picks, teamId);
  const neededPositions = Object.keys(needs);
  const round = Math.floor(state.currentPick / TOTAL_TEAMS);

  // Prioritize needed starter positions in early rounds
  if (neededPositions.length > 0 && round < 9) {
    const candidates = available.filter(p =>
      neededPositions.includes(p.pos) ||
      (neededPositions.includes('FLEX') && ['RB','WR','TE'].includes(p.pos))
    );
    if (candidates.length > 0) {
      candidates.sort((a, b) => getHexScore(b.id) - getHexScore(a.id));
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
  }

  // Late rounds: best available, but avoid extra K/DEF
  const teamCounts = {};
  state.picks.filter(p => p.teamId === teamId).forEach(p => {
    const pl = PLAYER_MAP[p.playerId];
    if (pl) teamCounts[pl.pos] = (teamCounts[pl.pos] || 0) + 1;
  });

  const filtered = available.filter(p => {
    if (p.pos === 'K' && (teamCounts['K'] || 0) >= 1) return false;
    if (p.pos === 'DEF' && (teamCounts['DEF'] || 0) >= 1) return false;
    return true;
  });

  const pool = filtered.length > 0 ? filtered : available;
  pool.sort((a, b) => getHexScore(b.id) - getHexScore(a.id));
  const topN = pool.slice(0, Math.min(3, pool.length));
  const weights = [0.6, 0.25, 0.15];
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < topN.length; i++) {
    cumulative += weights[i] || 0.1;
    if (r <= cumulative) return topN[i].id;
  }
  return topN[0]?.id || available[0]?.id;
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

export default function DraftBoard({ onDraftComplete, onDraftReset, leagueName = 'League', initialDraft }) {
  const [state, setState] = useState(() => makeInitialState(initialDraft));
  const timerRef = useRef(null);
  const [posFilter, setPosFilter] = useState('ALL');
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
        playerId = getBestAvailable(prev, teamId);
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
  }, []);

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
    return (
      <div>
        <style>{`
          @keyframes draftConfetti { 0% { transform: scale(0.8); opacity: 0; } 50% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
        `}</style>
        <div className="ff-card" style={{ marginBottom: 20, animation: 'draftConfetti 0.5s ease-out' }}>
          <div className="ff-card-top-accent" style={{ background: 'var(--success-green, #22c55e)' }} />
          <div className="ff-card-header">
            <h2>Draft Complete!</h2>
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: '1px solid var(--red, #ef4444)',
                background: 'transparent', color: 'var(--red, #ef4444)', fontSize: 12,
                fontWeight: 600, cursor: 'pointer',
              }}>
              Reset Draft
            </button>
          </div>
          <div className="ff-card-body" style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>The {leagueName} draft is in the books!</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{TOTAL_PICKS} picks &middot; {TOTAL_ROUNDS} rounds &middot; {TOTAL_TEAMS} teams</p>
          </div>
        </div>

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
                  style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
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

        {/* Your Team — featured full-width */}
        {(() => {
          const userTeam = TEAMS.find(t => t.id === USER_TEAM_ID);
          const userRosterComplete = teamRostersMap[USER_TEAM_ID] || [];
          return (
            <div className="ff-card ff-draft-user-card" style={{ marginBottom: 16 }}>
              <div className="ff-card-top-accent" />
              <div className="ff-card-header" style={{ paddingBottom: 8 }}>
                <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {userTeam?.name} <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', padding: '1px 6px', borderRadius: 4 }}>YOUR TEAM</span>
                </h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{userRosterComplete.length} players</span>
              </div>
              <div className="ff-card-body" style={{ padding: '0 16px 12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0 24px' }}>
                  {userRosterComplete.map((pick, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
                      borderBottom: '1px solid var(--border)', fontSize: 12,
                    }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: 18, fontSize: 10 }}>R{pick.round + 1}</span>
                      <PlayerHeadshot espnId={getEspnId(pick.player?.name)} name={pick.player?.name} size="xs" pos={pick.player?.pos} team={pick.player?.team} />
                      <PosBadge pos={pick.player?.pos} />
                      <span style={{ fontWeight: 600 }}>{pick.player?.name}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 10 }}>{pick.player?.team}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Other Team Rosters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {state.draftOrder.filter(id => id !== USER_TEAM_ID).map(teamId => {
            const team = TEAMS.find(t => t.id === teamId);
            const roster = teamRostersMap[teamId] || [];
            return (
              <div key={teamId} className="ff-card">
                <div className="ff-card-top-accent" style={{ background: 'var(--charcoal-slate, #334155)' }} />
                <div className="ff-card-header" style={{ paddingBottom: 8 }}>
                  <h3 style={{ fontSize: 14 }}>{team.name}</h3>
                </div>
                <div className="ff-card-body" style={{ padding: '0 12px 12px' }}>
                  {roster.map((pick, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                      borderBottom: i < roster.length - 1 ? '1px solid var(--border)' : 'none',
                      fontSize: 12,
                    }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: 18, fontSize: 10 }}>R{pick.round + 1}</span>
                      <PosBadge pos={pick.player?.pos} />
                      <span style={{ fontWeight: 500 }}>{pick.player?.name}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 10 }}>{pick.player?.team}</span>
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
    <div>
      <style>{`
        @keyframes pickFlash { 0% { background: var(--accent); } 100% { background: transparent; } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      {/* Exit Draft link */}
      <div style={{ marginBottom: 12 }}>
        <button className="ff-back-btn" onClick={() => window.history.back()}>{'\u2190'} Exit Draft</button>
      </div>

      {/* Pick Announcements */}
      <div style={{ position: 'fixed', top: 56, right: 16, zIndex: 60, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300 }}>
        {state.announcements.slice(0, 3).map((ann, i) => {
          const team = TEAMS.find(t => t.id === ann.teamId);
          return (
            <div key={ann.timestamp + i} style={{
              background: 'var(--bg)', border: '1px solid var(--border)', borderLeft: `4px solid ${POS_COLORS[ann.player?.pos] || 'var(--accent)'}`,
              borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-lg)',
              animation: 'slideIn 0.3s ease-out', fontSize: 12,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{team?.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <PosBadge pos={ann.player?.pos} />
                <span style={{ fontWeight: 600 }}>{ann.player?.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{ann.player?.team}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>Round {ann.round + 1}, Pick {ann.pickInRound + 1}</div>
            </div>
          );
        })}
      </div>

      {/* Draft Header */}
      <div className="ff-card" style={{ marginBottom: 16 }}>
        <div className="ff-card-top-accent" style={{ background: isUserTurn ? 'var(--accent)' : 'var(--charcoal-slate, #334155)' }} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
              Round {currentRound} &middot; Pick {overallPick} of {TOTAL_PICKS}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              {currentTeam?.name}
              {isUserTurn && <span style={{ fontSize: 11, background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>YOUR PICK</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{currentTeam?.owner}{isUserTurn ? ' — Make your selection!' : ' is on the clock'}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 42, fontWeight: 800, fontFamily: 'monospace', color: timerColor, lineHeight: 1 }}>
              {isUserTurn ? state.timer : '...'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              {isUserTurn ? 'seconds' : 'picking'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            <div><strong>{state.picks.length}</strong> / {TOTAL_PICKS} picks made</div>
            <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, width: 120 }}>
              <div style={{ background: 'var(--accent)', borderRadius: 4, height: '100%', width: `${(state.picks.length / TOTAL_PICKS) * 100}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Player Pool + Sidebar */}
      <div className="ff-draft-grid">
        {/* Player Pool */}
        <div className="ff-card">
          <div className="ff-card-top-accent" style={{ background: 'var(--brand-tan, #d4a76a)' }} />
          <div className="ff-card-header" style={{ paddingBottom: 8 }}>
            <h2 style={{ fontSize: 15 }}>Available Players</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{availablePlayers.length} remaining</span>
          </div>
          <div className="ff-tm-filter-bar" style={{ padding: '0 16px 8px' }}>
            {['ALL','QB','RB','WR','TE','K','DEF'].map(pos => (
              <button key={pos} onClick={() => setPosFilter(pos)}
                className={`ff-tm-filter-pill${posFilter === pos ? ' active' : ''}`}
                style={posFilter === pos && pos !== 'ALL' ? { background: POS_COLORS[pos], borderColor: POS_COLORS[pos] } : undefined}>
                {pos}
              </button>
            ))}
            <input
              className="ff-search-input"
              type="text" placeholder="Search players..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ marginLeft: 'auto', width: 160, padding: '5px 10px', fontSize: 12 }}
            />
          </div>
          <div className="ff-table-wrap" style={{ maxHeight: 420 }}>
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th className={sortBy === 'proj' ? 'sort-active' : ''} onClick={() => setSortBy('proj')} style={{ textAlign: 'right' }}>
                    Proj {sortBy === 'proj' && <span className="sort-arrow">{'\u25BC'}</span>}
                  </th>
                  <th className={sortBy === 'avg' ? 'sort-active' : ''} onClick={() => setSortBy('avg')} style={{ textAlign: 'right' }}>
                    Avg {sortBy === 'avg' && <span className="sort-arrow">{'\u25BC'}</span>}
                  </th>
                  <th className={sortBy === 'hex' ? 'sort-active' : ''} onClick={() => setSortBy('hex')} style={{ textAlign: 'right', color: 'var(--hex-purple)' }}>
                    Hex {sortBy === 'hex' && <span className="sort-arrow">{'\u25BC'}</span>}
                  </th>
                  <th style={{ width: 80, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {availablePlayers.map(player => {
                  const inQueue = state.pickQueue.includes(player.id);
                  return (
                    <tr key={player.id} style={inQueue ? { background: 'var(--accent-10)' } : undefined}>
                      <td>
                        <div className="ff-flex ff-gap-2">
                          <PlayerHeadshot espnId={getEspnId(player.name)} name={player.name} size="xs" pos={player.pos} team={player.team} />
                          <PosBadge pos={player.pos} />
                          <span className="player-name">{player.name}</span>
                        </div>
                      </td>
                      <td className="player-team">{player.team}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">{player.proj}</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">{player.avg}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--hex-purple)' }} className="tabular-nums">{formatHex(getHexScore(player.id))}</td>
                      <td style={{ textAlign: 'center' }}>
                        {isUserTurn ? (
                          <button className="ff-btn ff-btn-primary ff-btn-sm" onClick={() => handleUserPick(player.id)}>
                            Draft
                          </button>
                        ) : (
                          <button className={`ff-btn ff-btn-sm ${inQueue ? 'ff-btn-primary' : 'ff-btn-secondary'}`} onClick={() => toggleQueue(player.id)}>
                            {inQueue ? 'Queued' : '+Queue'}
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

        {/* Right Sidebar */}
        <div className="ff-right">
          {/* My Team */}
          <div className="ff-card">
            <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
            <div className="ff-card-header" style={{ paddingBottom: 4 }}>
              <h3 style={{ fontSize: 14 }}>My Team</h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{userRoster.length}/{TOTAL_ROUNDS}</span>
            </div>
            <div className="ff-card-body" style={{ padding: '0 12px 12px', maxHeight: 260, overflowY: 'auto' }}>
              {(() => {
                const preset = ROSTER_PRESETS.standard;
                const slots = [];
                Object.entries(preset).forEach(([pos, count]) => {
                  if (pos === 'IR') return;
                  for (let i = 0; i < count; i++) {
                    slots.push({ pos, label: count > 1 ? `${pos}${i+1}` : pos });
                  }
                });

                const unassigned = [...userRoster];

                return slots.map((slot, idx) => {
                  let match = null;
                  const matchIdx = unassigned.findIndex(r => {
                    if (slot.pos === 'FLEX') return ['RB','WR','TE'].includes(r.player?.pos);
                    if (slot.pos === 'DST') return r.player?.pos === 'DEF';
                    if (slot.pos === 'BN') return true;
                    return r.player?.pos === slot.pos;
                  });
                  if (matchIdx >= 0) {
                    match = unassigned.splice(matchIdx, 1)[0];
                  }

                  return (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
                      borderBottom: '1px solid var(--border)', fontSize: 12,
                    }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: POS_COLORS[slot.pos] || 'var(--text-muted)',
                        minWidth: 30, textTransform: 'uppercase',
                      }}>
                        {slot.pos}
                      </span>
                      {match ? (
                        <>
                          <PosBadge pos={match.player?.pos} />
                          <span style={{ fontWeight: 500 }}>{match.player?.name}</span>
                          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 10 }}>{match.player?.team}</span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 11 }}>Empty</span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Auto-Draft Toggle (during draft) */}
          <div className="ff-card" style={{ cursor: 'pointer' }}
            onClick={() => setState(prev => ({ ...prev, autoDraft: !prev.autoDraft }))}>
            <div className="ff-card-top-accent" style={{ background: state.autoDraft ? 'var(--success-green, #22c55e)' : 'var(--charcoal-slate, #334155)' }} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            }}>
              <input type="checkbox" checked={state.autoDraft} readOnly
                style={{ width: 16, height: 16, accentColor: 'var(--success-green, #22c55e)', pointerEvents: 'none' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Auto-Draft {state.autoDraft ? 'ON' : 'OFF'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {state.autoDraft ? 'Your picks are automatic' : 'Click to enable auto-pick'}
                </div>
              </div>
            </div>
          </div>

          {/* Pick Queue */}
          <div className="ff-card">
            <div className="ff-card-top-accent" style={{ background: 'var(--brand-tan, #d4a76a)' }} />
            <div className="ff-card-header" style={{ paddingBottom: 4 }}>
              <h3 style={{ fontSize: 14 }}>Pick Queue</h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{state.pickQueue.length}</span>
            </div>
            <div className="ff-card-body" style={{ padding: '0 12px 12px', maxHeight: 180, overflowY: 'auto' }}>
              {state.pickQueue.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: 16 }}>
                  Queue players to auto-draft when it's your turn
                </div>
              ) : (
                state.pickQueue.map((pid, i) => {
                  const player = PLAYER_MAP[pid];
                  const taken = pickedIds.has(pid);
                  return (
                    <div key={pid} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
                      borderBottom: '1px solid var(--border)', fontSize: 12,
                      opacity: taken ? 0.4 : 1, textDecoration: taken ? 'line-through' : 'none',
                    }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10, minWidth: 14 }}>{i + 1}</span>
                      <PosBadge pos={player?.pos} />
                      <span style={{ fontWeight: 500 }}>{player?.name}</span>
                      <button onClick={() => removeFromQueue(pid)} style={{
                        marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: 14, padding: '0 4px',
                      }}>{'\u2715'}</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Draft Board Grid */}
      <div className="ff-card">
        <div className="ff-card-top-accent" style={{ background: 'var(--charcoal-slate, #334155)' }} />
        <div className="ff-card-header">
          <h2 style={{ fontSize: 15 }}>Draft Board</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Snake Order</span>
        </div>
        <div style={{ overflowX: 'auto', padding: '0 0 12px' }} ref={boardRef}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 8px', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', position: 'sticky', left: 0, background: 'var(--bg)', zIndex: 2, minWidth: 36 }}>Rd</th>
                {state.draftOrder.map(teamId => {
                  const team = TEAMS.find(t => t.id === teamId);
                  const isUser = teamId === USER_TEAM_ID;
                  return (
                    <th key={teamId} style={{
                      padding: '6px 4px', fontWeight: 600, fontSize: 10, textAlign: 'center',
                      color: isUser ? 'var(--accent)' : 'var(--text-muted)',
                      background: isUser ? 'rgba(191,148,105,0.06)' : undefined,
                      minWidth: 80,
                    }}>
                      {team.abbr}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {boardData.map((row, roundIdx) => (
                <tr key={roundIdx}>
                  <td style={{
                    padding: '4px 8px', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)',
                    position: 'sticky', left: 0, background: 'var(--bg)', zIndex: 1, textAlign: 'center',
                  }}>
                    {roundIdx + 1}
                    <span style={{ fontSize: 8, marginLeft: 2, color: 'var(--text-muted)' }}>
                      {roundIdx % 2 === 0 ? '\u2192' : '\u2190'}
                    </span>
                  </td>
                  {row.map((cell, colIdx) => {
                    const isUser = cell.teamId === USER_TEAM_ID;
                    return (
                      <td key={colIdx} style={{
                        padding: '4px 4px', textAlign: 'center', border: '1px solid var(--border)',
                        background: cell.isCurrent
                          ? 'rgba(191,148,105,0.2)'
                          : cell.pick
                            ? POS_BG[cell.pick.player?.pos] || 'transparent'
                            : isUser ? 'rgba(191,148,105,0.04)' : 'transparent',
                        animation: cell.isCurrent ? 'pickFlash 1s ease-in-out infinite alternate' : undefined,
                        minHeight: 36, verticalAlign: 'middle',
                      }}>
                        {cell.pick ? (
                          <div>
                            <div style={{ fontSize: 8, fontWeight: 700, color: POS_COLORS[cell.pick.player?.pos] || 'var(--text-muted)' }}>
                              {cell.pick.player?.pos}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 10, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}>
                              {cell.pick.player?.name?.split(' ').pop()}
                            </div>
                            <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{cell.pick.player?.team}</div>
                          </div>
                        ) : cell.isCurrent ? (
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>&bull;</div>
                        ) : (
                          <div style={{ color: 'var(--border)', fontSize: 10 }}>&mdash;</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
