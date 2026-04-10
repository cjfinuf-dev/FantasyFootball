import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { PLAYERS } from '../../data/players';
import { SCORING_PRESETS, ROSTER_PRESETS, ROSTER_SLOT_LABELS, SCORING_FIELD_LABELS, BONUS_LABELS, CATEGORY_COLORS } from '../../data/scoring';
import { getEspnId } from '../../data/espnIds';
import { getHexScore, formatHex } from '../../utils/hexScore';
import PosBadge from '../ui/PosBadge';
import HexBrand from '../ui/HexBrand';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import { getGrade, getGradeCompact } from '../../utils/grades';

const TOTAL_ROUNDS = 15;

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

function getTeamForPick(pickNumber, draftOrder, teamCount = 12) {
  const round = Math.floor(pickNumber / teamCount);
  const pickInRound = pickNumber % teamCount;
  const orderIndex = round % 2 === 0 ? pickInRound : (teamCount - 1 - pickInRound);
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
  heroRB:    { name: 'Hero RB',  roundPrefs: { 0: ['RB'], 1: ['WR','TE'], 2: ['WR','TE'], 3: ['WR'], 4: ['WR','TE'], 5: ['WR'], 6: ['WR','RB'], 7: ['WR'] } },
  zeroRB:    { name: 'Zero RB',  roundPrefs: { 0: ['WR'], 1: ['WR','TE'], 2: ['WR'], 3: ['RB','WR'], 4: ['RB'], 5: ['WR','RB'], 6: ['WR'], 7: ['RB'] } },
  eliteQB:   { name: 'Elite QB', roundPrefs: { 1: ['QB'], 2: ['QB'], 3: ['QB'], 5: ['WR','RB'], 6: ['WR','RB'], 7: ['WR'] } },
  robustRB:  { name: 'Robust RB', roundPrefs: { 0: ['RB'], 1: ['RB'], 2: ['RB'], 3: ['RB','WR'], 5: ['RB'], 6: ['RB','WR'], 7: ['RB','WR'] } },
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

function getBestAvailable(state, teamId, scoringPreset = 'ppr', archetypes = {}, teamCount = 12) {
  const pickedSet = new Set(state.picks.map(p => p.playerId));
  const available = PLAYERS.filter(p => !pickedSet.has(p.id));
  if (available.length === 0) return null;

  const { needs, counts } = getTeamNeeds(state.picks, teamId);
  const neededPositions = Object.keys(needs);
  const round = Math.floor(state.currentPick / teamCount);
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

function makeInitialState(initialDraft, totalPicks, teamCount = 12) {
  if (initialDraft && initialDraft.phase === 'complete' && initialDraft.picks?.length > 0) {
    return {
      phase: 'complete',
      draftOrder: (initialDraft.draftOrder || TEAMS.slice(0, teamCount).map(t => t.id)).slice(0, teamCount),
      picks: initialDraft.picks,
      currentPick: totalPicks || initialDraft.picks.length,
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
    draftOrder: TEAMS.slice(0, teamCount).map(t => t.id),
    picks: [],
    currentPick: 0,
    timer: 60,
    timerRunning: false,
    pickQueue: [],
    pickSpeed: 'instant',
    announcements: [],
    timerSetting: 60,
    autoDraft: true,
  };
}

export default function DraftBoard({ onDraftComplete, onDraftReset, leagueName = 'League', initialDraft, scoringPreset = 'ppr', leagueSize = 12 }) {
  const TOTAL_TEAMS = leagueSize;
  const [draftStyle, setDraftStyle] = useState('snake');
  const [rounds, setRounds] = useState(TOTAL_ROUNDS);
  const [selectedPreset, setSelectedPreset] = useState(scoringPreset);
  const [rosterConfig, setRosterConfig] = useState(() => ROSTER_PRESETS[scoringPreset] || ROSTER_PRESETS.standard);
  const [bonuses, setBonuses] = useState({ rush100: 0, rec100: 0, pass300: 0, rush200: 0, rec200: 0, pass400: 0, td40plus: 0, td50plus: 0 });
  const [customScoring, setCustomScoring] = useState(() => {
    const p = SCORING_PRESETS[scoringPreset] || SCORING_PRESETS.ppr;
    return { passing: { ...p.passing }, rushing: { ...p.rushing }, receiving: { ...p.receiving }, kicking: { ...p.kicking }, dst: { ...p.dst } };
  });
  const [isCustomScoring, setIsCustomScoring] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState({ format: true, scoring: false, roster: false, details: false, bonuses: false });
  const TOTAL_PICKS = TOTAL_TEAMS * rounds;
  const [state, setState] = useState(() => makeInitialState(initialDraft, TOTAL_PICKS, TOTAL_TEAMS));
  const [botArchetypes, setBotArchetypes] = useState({});
  const timerRef = useRef(null);
  const pickingRef = useRef(false);
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
    () => state.phase === 'active' ? getTeamForPick(state.currentPick, state.draftOrder, TOTAL_TEAMS) : null,
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
    state.draftOrder.forEach(tid => { map[tid] = []; });
    state.picks.forEach(p => {
      if (map[p.teamId]) {
        map[p.teamId].push({ ...p, player: PLAYER_MAP[p.playerId] });
      }
    });
    return map;
  }, [state.picks, state.draftOrder]);

  // Board data — MUST be before any conditional returns (React hooks rule)
  const boardData = useMemo(() => {
    const grid = [];
    for (let round = 0; round < rounds; round++) {
      const row = [];
      for (let col = 0; col < TOTAL_TEAMS; col++) {
        const pickForThisCell = state.picks.find(p => p.round === round && p.teamId === state.draftOrder[col]);
        const player = pickForThisCell ? PLAYER_MAP[pickForThisCell.playerId] : null;
        row.push({
          teamId: state.draftOrder[col],
          round,
          pick: pickForThisCell ? { ...pickForThisCell, player } : null,
          isCurrent: state.phase === 'active' && state.currentPick < TOTAL_PICKS &&
            getTeamForPick(state.currentPick, state.draftOrder, TOTAL_TEAMS) === state.draftOrder[col] &&
            Math.floor(state.currentPick / TOTAL_TEAMS) === round,
        });
      }
      grid.push(row);
    }
    return grid;
  }, [state.picks, state.draftOrder, state.currentPick, state.phase, rounds]);

  // Execute a pick
  const executePick = useCallback((prev, playerId = null) => {
    if (prev.currentPick >= TOTAL_PICKS) return prev;
    const teamId = getTeamForPick(prev.currentPick, prev.draftOrder, TOTAL_TEAMS);
    const isUser = teamId === USER_TEAM_ID;
    const pickedSet = new Set(prev.picks.map(p => p.playerId));

    if (!playerId) {
      if (isUser && prev.pickQueue.length > 0) {
        playerId = prev.pickQueue.find(pid => !pickedSet.has(pid));
      }
      if (!playerId) {
        playerId = getBestAvailable(prev, teamId, scoringPreset, botArchetypes, TOTAL_TEAMS);
      }
    }

    if (!playerId) return prev;

    const round = Math.floor(prev.currentPick / TOTAL_TEAMS);
    const pickInRound = prev.currentPick % TOTAL_TEAMS;
    const player = PLAYER_MAP[playerId];

    const newPick = { pickNumber: prev.currentPick, round, pickInRound, teamId, playerId, timestamp: Date.now() };
    const nextPick = prev.currentPick + 1;
    const isComplete = nextPick >= TOTAL_PICKS;
    const nextTeam = isComplete ? null : getTeamForPick(nextPick, prev.draftOrder, TOTAL_TEAMS);
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
  }, [scoringPreset, botArchetypes, rounds]);

  // Timer effect
  useEffect(() => {
    if (state.phase !== 'active' || !state.timerRunning) return;

    const currentTeam = getTeamForPick(state.currentPick, state.draftOrder, TOTAL_TEAMS);
    const isUser = currentTeam === USER_TEAM_ID;
    const isManualUser = isUser && !state.autoDraft;

    // Instant mode: batch all consecutive bot/auto picks into one setState to prevent main-thread backup
    if (state.pickSpeed === 'instant' && !isManualUser) {
      setState(prev => {
        let s = prev;
        while (s.phase === 'active' && s.currentPick < TOTAL_PICKS) {
          const teamId = getTeamForPick(s.currentPick, s.draftOrder, TOTAL_TEAMS);
          if (teamId === USER_TEAM_ID && !s.autoDraft) break;
          s = executePick(s);
        }
        return s;
      });
      return;
    }

    const interval = isManualUser ? 1000 : 400;
    timerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.timer <= 0) {
          if (pickingRef.current) return prev;
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
      state.draftOrder.forEach(tid => {
        rosters[tid] = state.picks.filter(p => p.teamId === tid).map(p => p.playerId);
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

  // Toast auto-dismiss after 3s
  useEffect(() => {
    if (state.announcements.length > 0) {
      const t = setTimeout(() => setState(p => ({ ...p, announcements: p.announcements.slice(1) })), 3000);
      return () => clearTimeout(t);
    }
  }, [state.announcements.length]);

  // Reset pick guard on each new pick
  useEffect(() => {
    pickingRef.current = false;
  }, [state.currentPick]);

  const handleUserPick = (playerId) => {
    if (!isUserTurn || state.phase !== 'active') return;
    if (pickingRef.current) return;
    pickingRef.current = true;
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

  const toggleSection = (key) => {
    setSettingsOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePresetChange = (presetId) => {
    setSelectedPreset(presetId);
    setIsCustomScoring(false);
    const p = SCORING_PRESETS[presetId] || SCORING_PRESETS.ppr;
    setCustomScoring({ passing: { ...p.passing }, rushing: { ...p.rushing }, receiving: { ...p.receiving }, kicking: { ...p.kicking }, dst: { ...p.dst } });
    const rosterKey = presetId === 'tePremium' ? 'standard' : (ROSTER_PRESETS[presetId] ? presetId : 'standard');
    setRosterConfig({ ...(ROSTER_PRESETS[rosterKey] || ROSTER_PRESETS.standard) });
  };

  const updateScoringValue = (category, key, value) => {
    setIsCustomScoring(true);
    setCustomScoring(prev => ({
      ...prev,
      [category]: { ...prev[category], [key]: Number(value) || 0 },
    }));
  };

  const updateRosterSlot = (pos, val) => {
    setRosterConfig(prev => ({ ...prev, [pos]: Math.max(0, Math.min(10, Number(val) || 0)) }));
  };

  const toggleBonus = (key) => {
    setBonuses(prev => ({ ...prev, [key]: prev[key] ? 0 : key.includes('200') || key.includes('400') ? 2 : key.includes('50') ? 3 : 1 }));
  };

  const resetDraft = () => {
    clearInterval(timerRef.current);
    draftCompleteCalledRef.current = false;
    setState(makeInitialState(null, TOTAL_PICKS, TOTAL_TEAMS));
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
    const presetScoring = SCORING_PRESETS[selectedPreset] || SCORING_PRESETS.ppr;
    const currentScoring = isCustomScoring ? { ...presetScoring, ...customScoring } : presetScoring;
    const sectionHeader = (key, label) => (
      <button onClick={() => toggleSection(key)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: 'var(--surface)', border: 'none', borderBottom: '1px solid var(--border)',
        cursor: 'pointer', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
        color: settingsOpen[key] ? 'var(--accent-text)' : 'var(--text-muted)',
      }}>
        {label}
        <span style={{ fontSize: 12, transition: 'transform 0.15s', transform: settingsOpen[key] ? 'rotate(180deg)' : 'rotate(0)' }}>{'\u25BC'}</span>
      </button>
    );

    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
        {/* Header */}
        <div className="ff-card" style={{ marginBottom: 16 }}>
          <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
          <div className="ff-card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{leagueName} Draft Room</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--accent-10)', color: 'var(--accent-text)', fontWeight: 700, textTransform: 'uppercase' }}>
                {draftStyle}
              </span>
              <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', background: isCustomScoring ? 'var(--warning-amber-light)' : 'var(--surface2)', color: isCustomScoring ? 'var(--warning-amber)' : 'var(--text-muted)', fontWeight: 600 }}>
                {isCustomScoring ? `${presetScoring.name} (Custom)` : presetScoring.name}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>{TOTAL_TEAMS} teams &middot; {rounds} rounds &middot; {TOTAL_PICKS} picks</span>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
          {/* LEFT: Settings Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div className="ff-card" style={{ overflow: 'hidden' }}>
              {/* Section 1: Draft Format */}
              {sectionHeader('format', 'Draft Format')}
              {settingsOpen.format && (
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Draft Style</label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[{ id: 'snake', label: 'Snake' }, { id: 'linear', label: 'Linear' }, { id: 'auction', label: 'Auction' }].map(s => (
                        <button key={s.id} onClick={() => setDraftStyle(s.id)}
                          className={`ff-tm-filter-pill${draftStyle === s.id ? ' active' : ''}`}
                          style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}>
                          {s.label}
                          {s.id === 'auction' && <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.6 }}>Soon</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Rounds</label>
                      <input type="number" className="ff-search-input" min={10} max={20} value={rounds}
                        onChange={e => setRounds(Math.max(10, Math.min(20, Number(e.target.value) || 15)))}
                        style={{ width: '100%', padding: '6px 10px', fontSize: 15, textAlign: 'center' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>League Size</label>
                      <div style={{ padding: '6px 10px', fontSize: 15, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
                        {TOTAL_TEAMS} teams
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Scoring Preset */}
              {sectionHeader('scoring', 'Scoring')}
              {settingsOpen.scoring && (
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid var(--border)' }}>
                  {Object.entries(SCORING_PRESETS).map(([id, preset]) => (
                    <button key={id} onClick={() => handlePresetChange(id)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      background: selectedPreset === id ? 'var(--accent-15)' : 'var(--surface)',
                      border: selectedPreset === id ? '2px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: 8, cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: selectedPreset === id ? 'var(--accent-text)' : 'var(--text)' }}>{preset.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.3, marginTop: 2 }}>{preset.desc?.slice(0, 60)}...</div>
                      </div>
                      {selectedPreset === id && <span style={{ fontSize: 16, color: 'var(--accent-text)' }}>{'\u2713'}</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Section 3: Roster Configuration */}
              {sectionHeader('roster', 'Roster Slots')}
              {settingsOpen.roster && (
                <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {Object.entries(rosterConfig).map(([pos, count]) => (
                      <div key={pos} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 6, fontSize: 14,
                      }}>
                        <span style={{ fontWeight: 600, color: POS_COLORS[pos] || 'var(--text)' }}>{pos}</span>
                        <input type="number" min={0} max={10} value={count}
                          onChange={e => updateRosterSlot(pos, e.target.value)}
                          style={{
                            width: 36, padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 4,
                            fontSize: 14, textAlign: 'center', background: 'var(--bg-white)', color: 'var(--text)',
                          }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: Scoring Details (editable) */}
              {sectionHeader('details', isCustomScoring ? 'Scoring (Custom)' : 'Scoring Details')}
              {settingsOpen.details && (
                <div style={{ padding: 14, borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                  {isCustomScoring && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '6px 10px', background: 'var(--warning-amber-light)', borderRadius: 6, fontSize: 12, color: 'var(--warning-amber)', fontWeight: 600 }}>
                      <span>Custom scoring active</span>
                      <button onClick={() => { setIsCustomScoring(false); const p = SCORING_PRESETS[selectedPreset] || SCORING_PRESETS.ppr; setCustomScoring({ passing: { ...p.passing }, rushing: { ...p.rushing }, receiving: { ...p.receiving }, kicking: { ...p.kicking }, dst: { ...p.dst } }); }}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--warning-amber)', cursor: 'pointer', fontSize: 12, fontWeight: 700, textDecoration: 'underline' }}>
                        Reset to {presetScoring.name}
                      </button>
                    </div>
                  )}
                  {Object.entries(SCORING_FIELD_LABELS).filter(([cat]) => cat !== 'idp' || selectedPreset === 'idp').map(([cat, fields]) => (
                    <div key={cat} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: CATEGORY_COLORS[cat] || 'var(--text-muted)', marginBottom: 4 }}>{cat}</div>
                      {Object.entries(fields).map(([key, meta]) => {
                        const val = customScoring[cat]?.[key];
                        if (val === undefined) return null;
                        const presetVal = presetScoring[cat]?.[key];
                        const isModified = isCustomScoring && val !== presetVal;
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0' }}>
                            <span style={{ color: 'var(--text-muted)', flex: 1 }}>{meta.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <input type="number" step="any" value={val}
                                onChange={e => updateScoringValue(cat, key, e.target.value)}
                                style={{
                                  width: 56, padding: '2px 6px', border: `1px solid ${isModified ? 'var(--warning-amber)' : 'var(--border)'}`,
                                  borderRadius: 4, fontSize: 14, textAlign: 'center',
                                  background: isModified ? 'var(--warning-amber-light)' : 'var(--bg-white)',
                                  color: 'var(--text)', outline: 'none',
                                }} />
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 34 }}>{meta.unit}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Section 5: Bonuses */}
              {sectionHeader('bonuses', 'Bonuses')}
              {settingsOpen.bonuses && (
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(BONUS_LABELS).map(([key, label]) => (
                      <label key={key} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                        background: bonuses[key] ? 'rgba(22,163,74,0.06)' : 'var(--surface)',
                        border: bonuses[key] ? '1px solid var(--success-green)' : '1px solid var(--border)',
                        borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s',
                      }}>
                        <input type="checkbox" checked={!!bonuses[key]} onChange={() => toggleBonus(key)}
                          style={{ width: 14, height: 14, accentColor: 'var(--success-green)' }} />
                        <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
                        {bonuses[key] > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success-green)' }}>+{bonuses[key]} pts</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Draft Order + Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Draft Order */}
            <div className="ff-card">
              <div className="ff-card-header" style={{ padding: '12px 20px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Draft Order</h3>
                <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={randomizeOrder}>Randomize</button>
              </div>
              <div className="ff-card-body" style={{ padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                  {state.draftOrder.map((teamId, i) => {
                    const team = TEAMS.find(t => t.id === teamId);
                    const isUser = teamId === USER_TEAM_ID;
                    return (
                      <div key={teamId} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                        background: isUser ? 'var(--accent-20)' : 'var(--surface)',
                        border: isUser ? '2px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: 8, fontSize: 14,
                      }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 16, minWidth: 30 }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: isUser ? 700 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team?.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{team?.owner}{isUser ? ' (You)' : ''}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Draft Controls */}
            <div className="ff-card">
              <div className="ff-card-header" style={{ padding: '12px 20px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Draft Controls</h3>
              </div>
              <div className="ff-card-body" style={{ padding: 16 }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Pick Timer</label>
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
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>AI Pick Speed</label>
                    <select className="ff-search-input" style={{ padding: '8px 12px', minWidth: 120, width: 'auto' }}
                      value={state.pickSpeed}
                      onChange={e => setState(prev => ({ ...prev, pickSpeed: e.target.value }))}>
                      <option value="instant">Instant</option>
                      <option value="fast">Fast (0.5s)</option>
                      <option value="slow">Slow (2s)</option>
                    </select>
                  </div>
                </div>

                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', marginBottom: 16,
                  background: state.autoDraft ? 'rgba(22,163,74,0.08)' : 'var(--surface)',
                  border: state.autoDraft ? '2px solid var(--success-green)' : '1px solid var(--border)',
                  borderRadius: 8, cursor: 'pointer', fontSize: 15, transition: 'all 0.15s',
                }}>
                  <input type="checkbox" checked={state.autoDraft}
                    onChange={e => setState(prev => ({ ...prev, autoDraft: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: 'var(--success-green)' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Auto-Draft My Picks</div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                      Your picks will be made automatically using best available or your pick queue
                    </div>
                  </div>
                </label>

                <button className="ff-btn ff-btn-primary" style={{ fontSize: 17, padding: '14px 32px', width: '100%' }} onClick={startDraft}>
                  Start Draft
                </button>
              </div>
            </div>
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
      const { letter, color } = getGrade(pct);
      return { grade: letter, color };
    };
    const { grade: draftGrade, color: gradeColor } = gradeFromHex(userTotalHex);

    return (
      <div className="ff-draft-results" style={{ padding: '0 20px 40px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="auth-overlay" onClick={e => { if (e.target === e.currentTarget) setShowResetConfirm(false); }}>
            <div className="auth-modal" style={{ maxWidth: 380, width: '90vw', textAlign: 'center' }}>
              <h2 style={{ fontSize: 20, marginBottom: 8 }}>Reset Draft?</h2>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 20 }}>
                This will clear all draft picks and return to the draft lobby. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="ff-btn ff-btn-secondary"
                  onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </button>
                <button className="ff-btn ff-btn-danger"
                  onClick={resetDraft}>
                  Reset Draft
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Draft Summary Header */}
        <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>Draft Complete</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', fontFamily: "'Playfair Display', serif" }}>{leagueName}</h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)' }}>{TOTAL_PICKS} picks &middot; {rounds} rounds &middot; {TOTAL_TEAMS} teams</p>
        </div>

        {/* Your Team — Hero Card with Draft Grade */}
        {(() => {
          const userTeam = TEAMS.find(t => t.id === USER_TEAM_ID);
          return (
            <div className="ff-card" style={{
              border: '2px solid var(--accent)', borderRadius: 12,
              marginBottom: 24, overflow: 'hidden',
            }}>
              {/* Grade Banner */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px', borderBottom: '1px solid var(--border)',
                background: 'var(--accent-10)',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{userTeam?.name}</span>
                    <span className="ff-inline-badge" style={{ background: 'var(--accent)', color: 'var(--on-accent)', textTransform: 'uppercase' }}>Your Team</span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    {userRosterComplete.length} players &middot; Ranked #{userRank} of {TOTAL_TEAMS} &middot; {Math.round(userTotalHex)} total <HexBrand word="Score" icon={false} />
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="ff-draft-grade-reveal" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 78, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: gradeColor, fontSize: 30, fontWeight: 900, color: '#fff' }}>
                    {draftGrade}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: 4 }}><HexBrand word="Grade" size="sm" /></div>
                </div>
              </div>

              {/* Position Group Analysis */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Position <HexBrand word="Grades" size="sm" /></div>
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
                    const posGradeData = getGradeCompact(posPct);
                    const leagueBestPct = posMax > 0 ? Math.round((userEntry.total / posMax) * 100) : 0;

                    return (
                      <div key={pos} style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '12px 14px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: POS_COLORS[pos], textTransform: 'uppercase', marginBottom: 8 }}>{pos}s</div>
                        <div style={{ margin: '0 auto 6px', display: 'flex', justifyContent: 'center' }}>
                          <span className="hex-grade-badge-xl" style={{ background: posGradeData.c }}>{posGradeData.g}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>#{posRank} of {TOTAL_TEAMS}</div>
                        <div style={{ background: 'var(--surface2)', borderRadius: 3, height: 4, marginBottom: 6 }}>
                          <div style={{ background: posGradeData.c, borderRadius: 3, height: '100%', width: `${leagueBestPct}%`, transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{leagueBestPct}% of league best</div>
                        {userEntry.best && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Top: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{userEntry.best.player?.name}</span>
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
                  if (pool.length === 0) return { g: '-', c: 'var(--text-muted)' };
                  const rank = pool.findIndex(p => p.playerId === playerId);
                  if (rank < 0) return { g: '-', c: 'var(--text-muted)' };
                  const pct = pool.length > 1 ? 1 - (rank / (pool.length - 1)) : 1;
                  return getGradeCompact(pct);
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
                      borderBottom: '1px solid var(--border)', fontSize: 14,
                      opacity: muted ? 0.6 : 1,
                    }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700, minWidth: 38, textTransform: 'uppercase',
                        color: POS_COLORS[pick?.player?.pos] || 'var(--text-muted)',
                      }}>{label}</span>
                      {pick ? (
                        <>
                          <PlayerHeadshot espnId={getEspnId(pick.player?.name)} name={pick.player?.name} size="xs" pos={pick.player?.pos} team={pick.player?.team} />
                          <PosBadge pos={pick.player?.pos} />
                          <span style={{ fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pick.player?.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{pick.player?.team}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>R{pick.round + 1}</span>
                          <span style={{ color: 'var(--hex-purple)', fontSize: 14, fontWeight: 700, minWidth: 34, textAlign: 'right' }} className="tabular-nums">{formatHex(getHexScore(pick.playerId))}</span>
                          {pg && (
                            <span className="hex-grade-badge" style={{ background: pg.c }}>{pg.g}</span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 14 }}>Empty</span>
                      )}
                    </div>
                  );
                };

                return (
                  <div style={{ padding: '12px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Starters</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}><HexBrand word="Grade" icon={false} /> vs. league</span>
                    </div>
                    {starters.map(s => renderRow(s.label, s.pick, false))}
                    {bench.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: 12, marginBottom: 6 }}>Bench</div>
                        {bench.map((pick, i) => renderRow('BN', pick, true))}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Actions */}
              <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={() => setShowResetConfirm(true)}>
                  Reset Draft
                </button>
              </div>
            </div>
          );
        })()}

        {/* All Teams Grid */}
        <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
          All Teams
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {allTeamTotals.map(({ teamId }, rankIdx) => {
            if (teamId === USER_TEAM_ID) return null;
            const team = TEAMS.find(t => t.id === teamId);
            const roster = teamRostersMap[teamId] || [];
            const teamTotal = allTeamTotals[rankIdx]?.total || 0;
            const { grade: teamGrade, color: tgColor } = gradeFromHex(teamTotal);
            return (
              <div key={teamId} style={{ background: 'var(--bg-white)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)',
                }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{team?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{rankIdx + 1} overall</div>
                  </div>
                  <span className="hex-grade-badge-lg" style={{ background: tgColor }}>{teamGrade}</span>
                </div>
                <div style={{ padding: '2px 12px 6px' }}>
                  {roster.map((pick, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0',
                      borderBottom: i < roster.length - 1 ? '1px solid var(--border)' : 'none',
                      fontSize: 14,
                    }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: 30, fontSize: 12 }}>R{pick.round + 1}</span>
                      <PosBadge pos={pick.player?.pos} />
                      <span style={{ fontWeight: 500, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pick.player?.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{pick.player?.team}</span>
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
      {/* Compact Draft Header Bar */}
      <div className={`ff-draft-header${isUserTurn ? ' user-turn' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ background: 'none', border: 'none', color: 'var(--di-text-muted, #999)', fontSize: 14, cursor: 'pointer' }} onClick={() => window.history.back()}>{'\u2190'} Exit</button>
          <span style={{ color: 'var(--di-text-faint, #666)', fontSize: 14 }}>|</span>
          <span style={{ fontSize: 14, color: 'var(--di-text-muted, #888)', fontWeight: 600 }}>Rd {currentRound} &middot; Pick {overallPick}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--di-text, #e5e5e5)' }}>{currentTeam?.name}</span>
          {isUserTurn && <span className="ff-inline-badge" style={{ background: 'var(--accent)', color: '#fff' }}>YOUR PICK</span>}
          {!isUserTurn && <span style={{ fontSize: 12, color: 'var(--di-text-muted, #888)' }}>on the clock</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ background: 'var(--di-border, #333)', borderRadius: 4, height: 4, width: 80 }}>
              <div style={{ background: 'var(--accent)', borderRadius: 4, height: '100%', width: `${(state.picks.length / TOTAL_PICKS) * 100}%`, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--di-text-muted, #888)' }}>{state.picks.length}/{TOTAL_PICKS}</span>
          </div>
          <div style={{
            fontSize: 30, fontWeight: 900, fontFamily: 'monospace', lineHeight: 1,
            minWidth: 64, textAlign: 'center',
            color: timerColor,
            background: 'rgba(0,0,0,0.5)',
            border: `2px solid ${timerColor}`,
            borderRadius: 8,
            padding: '6px 12px',
            boxShadow: `0 0 12px ${timerColor}40, inset 0 0 8px ${timerColor}15`,
            letterSpacing: '0.05em',
            transition: 'color 0.3s, border-color 0.3s, box-shadow 0.3s',
          }}>
            {isUserTurn ? String(state.timer).padStart(2, '0') : '\u00B7\u00B7\u00B7'}
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
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>{team?.abbr}: <span style={{ color: POS_COLORS[ann.player?.pos] }}>{ann.player?.name}</span></div>
              <div style={{ color: 'var(--di-text-muted, #888)', fontSize: 12 }}>Rd {ann.round + 1}, Pick {ann.pickInRound + 1}</div>
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
                {state.draftOrder.slice(0, TOTAL_TEAMS).map(teamId => {
                  const team = TEAMS.find(t => t.id === teamId);
                  const isU = teamId === USER_TEAM_ID;
                  return <th key={teamId} style={{ color: isU ? 'var(--accent)' : undefined }}>{team?.abbr}</th>;
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
                      <td key={colIdx} className={`${cell.isCurrent ? 'current-cell' : ''}${isU && cell.pick ? ' user-pick' : ''}`} style={{
                        background: cell.isCurrent ? 'rgba(139,92,246,0.25)'
                          : cell.pick ? POS_BG[cell.pick.player?.pos] || 'transparent'
                          : isU ? 'rgba(139,92,246,0.05)' : 'transparent',
                      }}>
                        {cell.pick ? (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: POS_COLORS[cell.pick.player?.pos] }}>{cell.pick.player?.pos}</div>
                            <div style={{ fontSize: 15, lineHeight: 1.2, color: 'var(--di-text, #ddd)' }}>
                              {cell.pick.player?.name?.split(' ')[0]}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2, wordBreak: 'break-word', color: 'var(--di-text, #ddd)' }}>
                              {cell.pick.player?.name?.split(' ').slice(1).join(' ')}
                            </div>
                          </div>
                        ) : cell.isCurrent ? (
                          <span style={{ color: 'var(--accent)', fontSize: 11 }}>{'\u25CF'}</span>
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
              <h2 style={{ fontSize: 16 }}>Available Players <span style={{ fontWeight: 400, color: 'var(--di-text-muted, #888)', fontSize: 14 }}>({availablePlayers.length})</span></h2>
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
                style={{ marginLeft: 'auto', width: 140, padding: '4px 10px', fontSize: 14 }} />
            </div>
            <div className="ff-table-wrap" style={{ maxHeight: 'calc(100vh - 240px)' }}>
              <table className="ff-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th className={sortBy === 'proj' ? 'sort-active' : ''} onClick={() => setSortBy('proj')} style={{ textAlign: 'right', width: 52 }}>
                      Proj {sortBy === 'proj' && <span className="sort-arrow">{'\u25BC'}</span>}
                    </th>
                    <th className={sortBy === 'hex' ? 'sort-active' : ''} onClick={() => setSortBy('hex')} style={{ textAlign: 'right', color: 'var(--hex-purple)', width: 52 }}>
                      Hex {sortBy === 'hex' && <span className="sort-arrow">{'\u25BC'}</span>}
                    </th>
                    <th style={{ width: 62, textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {availablePlayers.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--di-text-muted, #888)', padding: 16, fontSize: 14 }}>No players available</td></tr>
                  )}
                  {availablePlayers.map(player => {
                    const inQueue = state.pickQueue.includes(player.id);
                    return (
                      <tr key={player.id} style={inQueue ? { background: 'rgba(139,92,246,0.08)' } : undefined}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', minWidth: 0 }}>
                            <PlayerHeadshot espnId={getEspnId(player.name)} name={player.name} size="xxs" pos={player.pos} team={player.team} />
                            <PosBadge pos={player.pos} />
                            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: '1 1 0' }}>{player.name}</span>
                            <span style={{ color: 'var(--di-text-faint, var(--text-muted))', fontSize: 12, flexShrink: 0 }}>{player.team}</span>
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
            <div style={{ display: 'flex', borderBottom: '1px solid var(--di-border, var(--gray-700))' }}>
              {[{ id: 'roster', label: 'Roster' }, { id: 'picks', label: 'Picks' }].map(tab => (
                <button key={tab.id} onClick={() => setRosterView(tab.id)} style={{
                  flex: 1, padding: '8px 0', background: 'none', border: 'none',
                  borderBottom: rosterView === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                  color: rosterView === tab.id ? 'var(--di-text)' : 'var(--di-text-muted)',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>{tab.label}</button>
              ))}
              <span style={{ fontSize: 12, color: 'var(--di-text-faint, #666)', padding: '8px 10px', display: 'flex', alignItems: 'center' }}>{userRoster.length}/{rounds}</span>
            </div>
            <div style={{ padding: '0 10px 10px', maxHeight: 480, overflowY: 'auto' }}>
              {rosterView === 'roster' ? (
                /* Roster Slots View */
                (() => {
                  const preset = rosterConfig;
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
                        borderBottom: '1px solid var(--di-border, var(--gray-700))', fontSize: 14,
                        opacity: !isStarter && !match ? 0.4 : 1,
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: POS_COLORS[slot.pos] || '#888', minWidth: 32, textTransform: 'uppercase' }}>{slot.pos}</span>
                        {match ? (
                          <>
                            <PosBadge pos={match.player?.pos} />
                            <span style={{ fontWeight: 500, color: 'var(--di-text, #ddd)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.player?.name}</span>
                            <span style={{ color: 'var(--di-text-faint, #666)', fontSize: 12 }}>{match.player?.team}</span>
                          </>
                        ) : (
                          <span style={{ color: isStarter ? 'var(--accent)' : '#444', fontStyle: 'italic', fontSize: 12 }}>{isStarter ? 'Need' : '-'}</span>
                        )}
                      </div>
                    );
                  });
                })()
              ) : (
                /* Draft Order View */
                userRoster.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--di-text-faint, #666)', fontSize: 14, padding: 16 }}>No picks yet</div>
                ) : (
                  userRoster.map((pick, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
                      borderBottom: '1px solid var(--di-border, var(--gray-700))', fontSize: 14,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--di-text-dim, #555)', minWidth: 28 }}>R{pick.round + 1}</span>
                      <span style={{ fontSize: 11, color: 'var(--di-text-dim, #555)', minWidth: 22 }}>{pick.pickInRound + 1}</span>
                      <PosBadge pos={pick.player?.pos} />
                      <span style={{ fontWeight: 500, color: 'var(--di-text, #ddd)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pick.player?.name}</span>
                      <span style={{ color: 'var(--hex-purple)', fontSize: 12, fontWeight: 700 }} className="tabular-nums">{formatHex(getHexScore(pick.playerId))}</span>
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
              <span style={{ fontSize: 14, fontWeight: 600, color: state.autoDraft ? 'var(--success-green, #22c55e)' : 'var(--di-text-muted, #aaa)' }}>
                Auto-Draft {state.autoDraft ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Pick Queue */}
          <div className="ff-card">
            <div className="ff-card-header" style={{ padding: '8px 12px' }}>
              <h3 style={{ fontSize: 14 }}>Queue</h3>
              <span style={{ fontSize: 12, color: 'var(--di-text-muted, #888)' }}>{state.pickQueue.length}</span>
            </div>
            <div style={{ padding: '0 10px 10px', maxHeight: 200, overflowY: 'auto' }}>
              {state.pickQueue.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--di-text-faint, #666)', fontSize: 14, padding: 12 }}>
                  Queue players for auto-pick
                </div>
              ) : state.pickQueue.map((pid, i) => {
                const player = PLAYER_MAP[pid];
                const taken = pickedIds.has(pid);
                return (
                  <div key={pid} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
                    borderBottom: '1px solid var(--di-border, var(--gray-700))', fontSize: 14,
                    opacity: taken ? 0.3 : 1, textDecoration: taken ? 'line-through' : 'none',
                  }}>
                    <span style={{ color: 'var(--di-text-faint, #666)', fontSize: 12, minWidth: 20 }}>{i + 1}</span>
                    <PosBadge pos={player?.pos} />
                    <span style={{ fontWeight: 500, color: 'var(--di-text, #ddd)' }}>{player?.name}</span>
                    <button onClick={() => removeFromQueue(pid)} style={{
                      marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--di-text-faint, #666)', fontSize: 14,
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
