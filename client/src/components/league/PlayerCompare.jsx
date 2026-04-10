import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { PLAYERS } from '../../data/players';
import { getEspnId } from '../../data/espnIds';
import { getHexData, getHexTier, formatHex, getHexScore, computeTradeTier } from '../../utils/hexScore';
import { classifyArchetype } from '../../utils/archetypeClassifier';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PosBadge from '../ui/PosBadge';
import HexBrand from '../ui/HexBrand';
import { getGrade } from '../../utils/grades';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

function getOwnerTeam(playerId, rosters) {
  if (!rosters) return null;
  for (const teamId of Object.keys(rosters)) {
    if (rosters[teamId]?.includes(playerId)) {
      return TEAMS.find(t => t.id === teamId) || null;
    }
  }
  return null;
}

const COLORS = ['#8B5CF6', '#06B6D4', '#F59E0B', '#EC4899', '#10B981', '#EF4444'];
const COLOR_NAMES = ['Purple', 'Cyan', 'Orange', 'Pink', 'Emerald', 'Red'];

const DIMS = [
  { key: 'production', label: 'Production' },
  { key: 'volume', label: 'Volume' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'durability', label: 'Durability' },
  { key: 'situation', label: 'Situation' },
  { key: 'scarcity', label: 'Scarcity' },
];

function getDimensionValue(dims, key) {
  if (!dims) return 0;
  switch (key) {
    case 'production': return dims.production || 0;
    case 'volume': return dims.xFactor || 0.5;
    case 'consistency': return dims.consistency || 0;
    case 'durability': return Math.min(1, ((dims.durability || 0) * 0.7 + (dims.health || 0) * 0.3));
    case 'situation': return dims.situation || 0;
    case 'scarcity': return dims.scarcity || 0;
    default: return 0;
  }
}

const getDimGrade = getGrade;

function generateAnalysis(playerData, scoringPreset) {
  const filled = playerData.filter(Boolean);
  if (filled.length < 2) return null;

  // Overall hex scores
  const scores = filled.map(pd => ({
    name: pd.player.name,
    hex: getHexScore(pd.player.id, scoringPreset),
    tier: getHexTier(getHexScore(pd.player.id, scoringPreset)).tier,
    archetype: classifyArchetype(pd.player, pd.player.pos),
    player: pd.player,
  }));
  const sorted = [...scores].sort((a, b) => b.hex - a.hex);
  const top = sorted[0];
  const second = sorted[1];
  const gap = top.hex - second.hex;

  // Verdict
  let verdict;
  if (filled.length === 2) {
    if (gap > 8) verdict = `${top.name} has a clear edge over ${second.name}`;
    else if (gap >= 4) verdict = `${top.name} holds an advantage over ${second.name}`;
    else verdict = `${top.name} and ${second.name} are neck-and-neck — both are strong options`;
  } else {
    const bottom = sorted[sorted.length - 1];
    const totalGap = top.hex - bottom.hex;
    if (totalGap > 8) verdict = `${top.name} leads the group with a clear edge`;
    else if (totalGap >= 4) verdict = `${top.name} holds a slight advantage over the field`;
    else verdict = `This group is incredibly tight — hard to go wrong with any of them`;
  }

  // Per-dimension breakdown
  const dimBreakdown = DIMS.map(dim => {
    const vals = filled.map(pd => ({
      name: pd.player.name,
      val: getDimensionValue(pd.hex.dimensions, dim.key),
    }));
    const dimSorted = [...vals].sort((a, b) => b.val - a.val);
    const winner = dimSorted[0];
    const runnerUp = dimSorted[1];
    const margin = (winner.val - runnerUp.val) * 100;
    const grade = getDimGrade(winner.val);

    let label;
    if (margin > 15) label = `${winner.name} dominates`;
    else if (margin >= 5) label = `Edge to ${winner.name}`;
    else label = 'Essentially even';

    return {
      dim: dim.label,
      key: dim.key,
      winner: winner.name,
      margin,
      label,
      grade,
      isTie: margin < 5,
      vals,
    };
  });

  // Key advantages — each player's biggest winning margin
  const advantages = filled.map(pd => {
    const wins = dimBreakdown
      .filter(d => d.winner === pd.player.name && !d.isTie)
      .sort((a, b) => b.margin - a.margin);
    const best = wins[0];
    return best
      ? { name: pd.player.name, dim: best.dim, grade: best.grade, margin: best.margin }
      : null;
  }).filter(Boolean);

  // Archetype context
  const archetypeLines = scores.map(s => ({
    name: s.name,
    archKey: s.archetype.key,
    desc: s.archetype.description,
  }));

  // Bottom line
  let bottomLine;
  if (gap > 8) bottomLine = `Go with ${top.name} — the gap is significant.`;
  else if (gap >= 4) bottomLine = `${top.name} is the stronger pick, but ${second.name} isn't far behind.`;
  else bottomLine = `You can't go wrong here — pick the one that fits your roster needs.`;

  return { verdict, dimBreakdown, advantages, archetypeLines, bottomLine, scores: sorted };
}

function generateRosterContext(playerData, rosters, scoringPreset) {
  if (!rosters) return null;
  const filled = playerData.filter(Boolean);
  if (filled.length < 2) return null;

  const context = filled.map(pd => {
    const owner = getOwnerTeam(pd.player.id, rosters);
    if (!owner) return { name: pd.player.name, teamName: 'Free Agent', isYours: false, isFreeAgent: true, posRank: null, posDepth: 0, teamPosHexAvg: 0 };

    const isYours = owner.id === USER_TEAM_ID;
    const teammates = (rosters[owner.id] || [])
      .map(id => PLAYER_MAP[id])
      .filter(p => p && p.pos === pd.player.pos);
    const scored = teammates.map(p => ({ id: p.id, name: p.name, hex: getHexScore(p.id, scoringPreset) }))
      .sort((a, b) => b.hex - a.hex);
    const posRank = scored.findIndex(s => s.id === pd.player.id) + 1;
    const teamPosHexAvg = scored.length > 0
      ? scored.reduce((sum, s) => sum + s.hex, 0) / scored.length
      : 0;

    return {
      name: pd.player.name,
      teamName: owner.name,
      isYours,
      isFreeAgent: false,
      pos: pd.player.pos,
      posRank,
      posDepth: scored.length,
      teamPosHexAvg,
    };
  });

  const teams = [...new Set(context.filter(c => !c.isFreeAgent).map(c => c.teamName))];
  let teamComparison = null;
  if (teams.length === 2) {
    const teamAvgs = teams.map(tn => {
      const teamId = Object.keys(rosters).find(tid => {
        const tm = TEAMS.find(t => t.id === tid);
        return tm && tm.name === tn;
      });
      if (!teamId) return { name: tn, avg: 0 };
      const rosterHexes = (rosters[teamId] || [])
        .map(id => getHexScore(id, scoringPreset))
        .filter(h => h > 0);
      const avg = rosterHexes.length > 0
        ? rosterHexes.reduce((s, v) => s + v, 0) / rosterHexes.length
        : 0;
      return { name: tn, avg };
    });
    const sorted = [...teamAvgs].sort((a, b) => b.avg - a.avg);
    const gap = sorted[0].avg - sorted[1].avg;
    teamComparison = { teams: sorted, gap };
  }

  return { players: context, teamComparison };
}

function PlayerSlot({ player, color, onSelect, onRemove, excludeIds, scoringPreset, rosters }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return PLAYERS.filter(p => !excludeIds.has(p.id) && p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, excludeIds]);

  if (player) {
    const hex = getHexScore(player.id, scoringPreset);
    const ownerTeam = rosters ? getOwnerTeam(player.id, rosters) : null;
    const isYours = ownerTeam && ownerTeam.id === USER_TEAM_ID;
    const isFreeAgent = rosters && !ownerTeam;
    return (
      <div style={{
        background: 'var(--bg-white)', border: `2px solid ${color}`, borderRadius: 10,
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 4, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
        <PlayerHeadshot espnId={getEspnId(player.name)} name={player.name} size="xs" pos={player.pos} team={player.team} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <PosBadge pos={player.pos} /> {player.team} &middot; {formatHex(hex)} Hex
          </div>
          {rosters && (
            <span className={`ff-compare-owner-badge ${isYours ? 'yours' : isFreeAgent ? 'free-agent' : 'opponent'}`}>
              {isYours ? 'Your Team' : isFreeAgent ? 'Free Agent' : ownerTeam.name}
            </span>
          )}
        </div>
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>{'\u2715'}</button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        border: `2px dashed ${color}40`, borderRadius: 10, padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 4, height: 28, borderRadius: 2, background: `${color}40`, flexShrink: 0 }} />
        <input
          className="ff-search-input"
          type="text" placeholder="Add player..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          style={{ fontSize: 12, padding: '5px 8px', border: 'none', background: 'transparent', flex: 1, outline: 'none' }}
        />
      </div>
      {focused && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', marginTop: 2, maxHeight: 200, overflowY: 'auto',
        }}>
          {results.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}
              onMouseDown={() => { onSelect(p); setQuery(''); }}>
              <PosBadge pos={p.pos} />
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{p.team}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlayerCompare({ rosters, scoringPreset, leagueId, onOpenTrade, initialPlayerIds }) {
  const [slots, setSlots] = useState([null, null, null, null, null, null]);
  const [hoveredDim, setHoveredDim] = useState(null);
  const [animProgress, setAnimProgress] = useState(0);
  const [sortDim, setSortDim] = useState('hex');
  const [sortDir, setSortDir] = useState('desc');
  const [showResults, setShowResults] = useState(false);
  const [compareMode, setCompareMode] = useState(rosters ? 'league' : 'basic');
  const animRef = useRef(null);
  const initRef = useRef(null);

  const triggerAnimation = useCallback(() => {
    setAnimProgress(0);
    const start = performance.now();
    const duration = 700;
    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      setAnimProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Pre-populate slots from initialPlayerIds (cross-tab navigation)
  useEffect(() => {
    if (!initialPlayerIds || initialPlayerIds.length === 0) return;
    // Avoid re-triggering on the same set
    const key = initialPlayerIds.join(',');
    if (initRef.current === key) return;
    initRef.current = key;
    const newSlots = [null, null, null, null, null, null];
    initialPlayerIds.slice(0, 6).forEach((id, i) => {
      newSlots[i] = PLAYER_MAP[id] || null;
    });
    setSlots(newSlots);
    const filled = newSlots.filter(Boolean).length;
    if (filled >= 2) {
      setShowResults(true);
      // Trigger animation on next frame
      setTimeout(() => triggerAnimation(), 0);
    }
  }, [initialPlayerIds, triggerAnimation]);

  const excludeIds = useMemo(() => new Set(slots.filter(Boolean).map(p => p.id)), [slots]);

  const setSlot = (idx, player) => {
    setSlots(prev => { const n = [...prev]; n[idx] = player; return n; });
    setShowResults(false);
  };
  const clearSlot = (idx) => {
    setSlots(prev => { const n = [...prev]; n[idx] = null; return n; });
    setShowResults(false);
  };

  const handleCompare = () => {
    setShowResults(true);
    triggerAnimation();
  };
  const handleEdit = () => {
    setShowResults(false);
  };

  const playerData = slots.map(p => p ? { player: p, hex: getHexData(p.id, scoringPreset) } : null);
  const filledCount = playerData.filter(Boolean).length;
  const analysis = useMemo(() => showResults ? generateAnalysis(playerData, scoringPreset) : null, [showResults, playerData, scoringPreset]);

  const rosterContext = useMemo(
    () => (showResults && compareMode !== 'basic') ? generateRosterContext(playerData, rosters, scoringPreset) : null,
    [showResults, compareMode, playerData, rosters, scoringPreset]
  );

  const tradePartition = useMemo(() => {
    if (!showResults || compareMode !== 'trade' || !rosters) return null;
    const filled = playerData.filter(Boolean);
    if (filled.length < 2) return null;
    const yours = [], opponents = {};
    for (const pd of filled) {
      const owner = getOwnerTeam(pd.player.id, rosters);
      if (!owner) continue;
      if (owner.id === USER_TEAM_ID) yours.push(pd.player.id);
      else {
        if (!opponents[owner.id]) opponents[owner.id] = [];
        opponents[owner.id].push(pd.player.id);
      }
    }
    const opponentTeamIds = Object.keys(opponents);
    if (yours.length === 0 || opponentTeamIds.length !== 1) return null;
    const partnerId = opponentTeamIds[0];
    const partnerTeam = TEAMS.find(t => t.id === partnerId);
    const sendIds = yours;
    const receiveIds = opponents[partnerId];
    const userRoster = rosters[USER_TEAM_ID] || [];
    const partnerRoster = rosters[partnerId] || [];
    const tier = computeTradeTier(sendIds, receiveIds, userRoster, partnerRoster, scoringPreset);
    return { sendIds, receiveIds, partnerId, partnerTeamName: partnerTeam?.name || 'Opponent', tier };
  }, [showResults, compareMode, playerData, rosters, scoringPreset]);

  // Chart geometry — large hex with rich label pills outside
  const maxR = 300;
  const pillW = 125, pillH = 64, pillGap = 22;
  const maxOffset = maxR + pillGap + Math.max(pillW / 2, pillH / 2) + pillH / 2;
  const svgSize = Math.ceil(maxOffset * 2 + 20);
  const cx = svgSize / 2, cy = svgSize / 2;
  const rings = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const angleOffset = -Math.PI / 2;
  const getPoint = (i, r) => {
    const angle = angleOffset + (i * 2 * Math.PI) / 6;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  // --- Shared chart SVG (used in both layouts) ---
  const hexChart = (
    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ display: 'block', maxWidth: '100%' }}
      role="img" aria-label="Player comparison HexChart">

      {/* Grade bands */}
      {[
        { inner: 0, outer: 0.1, color: '#991b1b' }, { inner: 0.1, outer: 0.2, color: '#dc2626' },
        { inner: 0.2, outer: 0.3, color: '#ea580c' }, { inner: 0.3, outer: 0.4, color: '#d97706' },
        { inner: 0.4, outer: 0.5, color: '#ca8a04' }, { inner: 0.5, outer: 0.6, color: '#65a30d' },
        { inner: 0.6, outer: 0.7, color: '#16a34a' }, { inner: 0.7, outer: 0.8, color: '#15803d' },
        { inner: 0.8, outer: 0.9, color: '#22c55e' }, { inner: 0.9, outer: 1.0, color: '#8B5CF6' },
      ].map(band => {
        const outerPts = Array.from({ length: 6 }, (_, i) => getPoint(i, band.outer * maxR));
        const innerPts = Array.from({ length: 6 }, (_, i) => getPoint(i, band.inner * maxR)).reverse();
        const d = outerPts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z'
          + (band.inner > 0 ? ' ' + innerPts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z' : '');
        return <path key={band.outer} d={d} fill={band.color} fillOpacity="0.1" fillRule="evenodd" />;
      })}

      {/* Grid rings */}
      {rings.map(r => {
        const pts = Array.from({ length: 6 }, (_, i) => getPoint(i, r * maxR));
        const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z';
        const val = Math.round(r * 100);
        const isOdd = (val / 10) % 2 === 1;
        return <path key={r} d={path} fill="none"
          stroke={r === 1 ? '#8B5CF6' : isOdd ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.25)'}
          strokeWidth={r === 1 ? 4 : 1} />;
      })}

      {/* Ring labels */}
      {rings.map(r => (
        <text key={'rl' + r} x={cx + 12} y={cy - r * maxR + 5} fontSize={Math.round(r * 100) % 20 === 0 ? '13' : '10'}
          fontWeight={Math.round(r * 100) % 20 === 0 ? '700' : '500'} fill="var(--text-muted)" opacity={Math.round(r * 100) % 20 === 0 ? 0.6 : 0.35}>
          {(r * 100).toFixed(1)}
        </text>
      ))}

      {/* Axis lines */}
      {Array.from({ length: 6 }, (_, i) => {
        const [x, y] = getPoint(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--text-muted)" strokeWidth="1" opacity="0.4" />;
      })}

      {/* Player polygons */}
      {playerData.map((pd, idx) => {
        if (!pd) return null;
        const vals = DIMS.map(dim => getDimensionValue(pd.hex.dimensions, dim.key));
        const pts = vals.map((v, i) => getPoint(i, v * maxR * animProgress));
        const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z';
        return <path key={idx} d={path} fill={COLORS[idx]} fillOpacity="0.12" stroke={COLORS[idx]} strokeWidth={2.5}
          strokeLinejoin="round" strokeDasharray={idx === 0 ? 'none' : '8,4'} />;
      })}

      {/* Dimension labels — rich pills with grade badges */}
      {DIMS.map((dim, i) => {
        const angle = angleOffset + (i * 2 * Math.PI) / 6;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        const radialExtent = Math.abs(dx) * pillW / 2 + Math.abs(dy) * pillH / 2;
        const offset = maxR + pillGap + radialExtent;
        const [lx, ly] = getPoint(i, offset);
        const isHovered = hoveredDim === i;

        const filledVals = playerData.filter(Boolean).map(pd => getDimensionValue(pd.hex.dimensions, dim.key));
        const avgVal = filledVals.length > 0 ? filledVals.reduce((s, v) => s + v, 0) / filledVals.length : 0.5;
        const grade = getDimGrade(avgVal);

        return (
          <foreignObject key={'label' + i} x={lx - pillW / 2} y={ly - pillH / 2} width={pillW} height={pillH}
            style={{ overflow: 'hidden', cursor: 'pointer' }}
            onMouseEnter={() => setHoveredDim(i)} onMouseLeave={() => setHoveredDim(null)}>
            <div style={{
              width: pillW, height: pillH, borderRadius: 10,
              background: isHovered ? 'var(--accent-30)' : 'var(--accent-10)',
              border: `1.5px solid ${isHovered ? 'var(--accent)' : 'var(--accent-30)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: isHovered ? 'var(--on-accent)' : 'var(--hex-purple)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {dim.label}
              </span>
              {filledCount > 0 && (
                <span className="hex-grade-badge" style={{ background: grade.color }}>{grade.letter}</span>
              )}
            </div>
          </foreignObject>
        );
      })}

      {/* Hover tooltip — show all player values */}
      {hoveredDim !== null && filledCount > 0 && (
        <foreignObject x={cx - 100} y={cy - 30} width="200" height={filledCount * 24 + 20} style={{ overflow: 'visible' }}>
          <div style={{
            background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '8px 12px', boxShadow: 'var(--shadow-lg)', fontSize: 12,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text)', textAlign: 'center' }}>{DIMS[hoveredDim].label}</div>
            {playerData.map((pd, idx) => {
              if (!pd) return null;
              const val = getDimensionValue(pd.hex.dimensions, DIMS[hoveredDim].key);
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[idx], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pd.player.name}</span>
                  <span style={{ fontWeight: 700 }} className="tabular-nums">{(val * 100).toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </foreignObject>
      )}
    </svg>
  );

  // --- Analysis Panel ---
  const analysisPanel = analysis && (
    <div style={{
      width: 320, flexShrink: 0, background: 'var(--bg-white)', borderRadius: 10,
      border: '1px solid var(--border)', borderLeft: '3px solid var(--hex-purple)',
      padding: 16, overflowY: 'auto', maxHeight: svgSize, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Verdict */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Verdict</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>{analysis.verdict}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {analysis.scores.map((s, i) => (
            <span key={i} style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
              background: 'var(--accent-10)', color: 'var(--hex-purple)',
            }}>
              {s.name}: {formatHex(s.hex)} ({s.tier})
            </span>
          ))}
        </div>
      </div>

      {/* Dimension breakdown */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Dimension Breakdown</div>
        {analysis.dimBreakdown.map(d => {
          const winnerIdx = playerData.findIndex(pd => pd && pd.player.name === d.winner);
          const dotColor = d.isTie ? 'var(--text-muted)' : (winnerIdx >= 0 ? COLORS[winnerIdx] : 'var(--text-muted)');
          return (
            <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{d.dim}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>{d.label}</span>
              </div>
              <span className="hex-grade-badge" style={{ background: d.grade.color, transform: 'scale(0.75)', transformOrigin: 'right center' }}>{d.grade.letter}</span>
            </div>
          );
        })}
      </div>

      {/* Key advantages */}
      {analysis.advantages.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Key Advantages</div>
          {analysis.advantages.map((a, i) => {
            const pIdx = playerData.findIndex(pd => pd && pd.player.name === a.name);
            return (
              <div key={i} style={{ fontSize: 12, padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: pIdx >= 0 ? COLORS[pIdx] : 'var(--text-muted)', flexShrink: 0 }} />
                <span><strong>{a.name}</strong>'s biggest edge is <strong>{a.dim}</strong> ({a.grade.letter})</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Archetype context */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Player Profiles</div>
        {analysis.archetypeLines.map((a, i) => (
          <div key={i} style={{ fontSize: 12, padding: '2px 0', color: 'var(--text)' }}>
            <strong>{a.name}</strong> — <span style={{ color: 'var(--hex-purple)', fontWeight: 600 }}>{a.desc}</span>
          </div>
        ))}
      </div>

      {/* Roster Context — League + Trade modes */}
      {rosterContext && compareMode === 'league' && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Roster Context</div>
          {rosterContext.players.map((rc, i) => (
            <div key={i} style={{ fontSize: 12, padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
              <strong>{rc.name}</strong>
              {rc.isFreeAgent ? (
                <span style={{ color: '#3b82f6', marginLeft: 6 }}>Free Agent</span>
              ) : (
                <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                  {rc.pos}{rc.posRank} on {rc.isYours ? 'your roster' : rc.teamName} ({rc.posDepth} at pos, avg {formatHex(rc.teamPosHexAvg)})
                </span>
              )}
            </div>
          ))}
          {rosterContext.teamComparison && (
            <div style={{ fontSize: 12, marginTop: 6, padding: '6px 8px', background: 'var(--surface)', borderRadius: 6 }}>
              <strong>{rosterContext.teamComparison.teams[0].name}</strong> roster avg {formatHex(rosterContext.teamComparison.teams[0].avg)}
              {' vs '}
              <strong>{rosterContext.teamComparison.teams[1].name}</strong> avg {formatHex(rosterContext.teamComparison.teams[1].avg)}
              {rosterContext.teamComparison.gap > 3
                ? ` — ${rosterContext.teamComparison.teams[0].name} has a stronger overall roster`
                : ' — rosters are closely matched'}
            </div>
          )}
        </div>
      )}

      {/* Trade Analysis — Trade mode */}
      {compareMode === 'trade' && tradePartition && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Trade Analysis</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: tradePartition.tier.css === 'fair' ? 'var(--success-green)' : tradePartition.tier.css === 'uneven' ? '#d97706' : '#dc2626' }}>
              {tradePartition.tier.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            Sending: {formatHex(tradePartition.tier.sendTotal)} Hex → Receiving: {formatHex(tradePartition.tier.receiveTotal)} Hex ({tradePartition.tier.delta >= 0 ? '+' : ''}{formatHex(tradePartition.tier.delta)})
          </div>
          <div style={{ height: 4, width: '100%', background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: tradePartition.tier.css === 'fair' ? 'var(--success-green)' : tradePartition.tier.css === 'uneven' ? '#d97706' : '#dc2626',
              width: `${Math.min(100, Math.max(10, 50 + tradePartition.tier.ratio * 100))}%`,
            }} />
          </div>
          {rosterContext && rosterContext.players.filter(rc => !rc.isFreeAgent).map((rc, i) => (
            <div key={i} style={{ fontSize: 11, padding: '2px 0', color: 'var(--text-muted)' }}>
              {rc.name}: {rc.pos}{rc.posRank} on {rc.isYours ? 'your roster' : rc.teamName}
            </div>
          ))}
          {onOpenTrade && (
            <button
              onClick={() => onOpenTrade(tradePartition.sendIds, tradePartition.receiveIds)}
              style={{
                marginTop: 10, width: '100%', background: 'var(--hex-purple)', color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Open in Trade Center →
            </button>
          )}
        </div>
      )}

      {/* Trade mode — invalid sides guidance */}
      {compareMode === 'trade' && !tradePartition && (
        <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Select players from your team and one opponent's team to analyze this trade.
        </div>
      )}

      {/* Bottom line — hidden in trade mode */}
      {compareMode !== 'trade' && (
        <div style={{
          marginTop: 'auto', background: 'var(--accent-10)', borderRadius: 8,
          padding: '10px 12px', borderLeft: '3px solid var(--hex-purple)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--hex-purple)', marginBottom: 4 }}>Bottom Line</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{analysis.bottomLine}</div>
        </div>
      )}
    </div>
  );

  // --- Comparison Table (shared) ---
  const comparisonTable = filledCount >= 2 && showResults && (() => {
    const handleSort = (key) => {
      if (sortDim === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else { setSortDim(key); setSortDir('desc'); }
    };
    const SortArrow = ({ field }) => {
      if (field !== sortDim) return null;
      return <span style={{ fontSize: 10, marginLeft: 3 }}>{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
    };

    const filled = playerData.map((pd, idx) => pd ? { pd, idx } : null).filter(Boolean);
    const sorted = [...filled].sort((a, b) => {
      let av, bv;
      if (sortDim === 'hex') {
        av = getHexScore(a.pd.player.id, scoringPreset);
        bv = getHexScore(b.pd.player.id, scoringPreset);
      } else {
        av = getDimensionValue(a.pd.hex.dimensions, sortDim);
        bv = getDimensionValue(b.pd.hex.dimensions, sortDim);
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    const colMax = {};
    DIMS.forEach(dim => {
      const vals = filled.map(f => getDimensionValue(f.pd.hex.dimensions, dim.key));
      colMax[dim.key] = Math.max(...vals);
    });
    const hexVals = filled.map(f => getHexScore(f.pd.player.id, scoringPreset));
    colMax.hex = Math.max(...hexVals);

    return (
      <div className="ff-card" style={{ marginBottom: 16 }}>
        <div className="ff-card-header">
          <h2 style={{ fontSize: 16 }}>Dimension Comparison</h2>
        </div>
        <div className="ff-table-wrap">
          <table className="ff-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Player</th>
                {DIMS.map(dim => (
                  <th key={dim.key} style={{ textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={() => handleSort(dim.key)}
                    className={sortDim === dim.key ? 'sort-active' : ''}>
                    {dim.label} <SortArrow field={dim.key} />
                  </th>
                ))}
                <th style={{ textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={() => handleSort('hex')}
                  className={sortDim === 'hex' ? 'sort-active' : ''}>
                  <span style={{ color: sortDim === 'hex' ? undefined : 'var(--hex-purple)' }}>HexScore</span> <SortArrow field="hex" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ pd, idx }, rank) => {
                const hex = getHexScore(pd.player.id, scoringPreset);
                const isHexWinner = hex === colMax.hex && hexVals.filter(v => v === colMax.hex).length === 1;
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{rank + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[idx], flexShrink: 0 }} />
                        <PlayerHeadshot espnId={getEspnId(pd.player.name)} name={pd.player.name} size="tiny" pos={pd.player.pos} team={pd.player.team} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{pd.player.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}><PosBadge pos={pd.player.pos} /> {pd.player.team}</div>
                        </div>
                      </div>
                    </td>
                    {DIMS.map(dim => {
                      const val = getDimensionValue(pd.hex.dimensions, dim.key);
                      const grade = getDimGrade(val);
                      const dimVals = filled.map(f => getDimensionValue(f.pd.hex.dimensions, dim.key));
                      const isWinner = val === colMax[dim.key] && dimVals.filter(v => v === colMax[dim.key]).length === 1;
                      return (
                        <td key={dim.key} style={{ textAlign: 'center', background: isWinner ? `${COLORS[idx]}12` : 'transparent' }}>
                          <span className="tabular-nums" style={{ fontWeight: 700 }}>{(val * 100).toFixed(1)}</span>
                          <span className="hex-grade-badge" style={{ background: grade.color, marginLeft: 6, transform: 'scale(0.8)', display: 'inline-flex' }}>{grade.letter}</span>
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', background: isHexWinner ? `${COLORS[idx]}12` : 'var(--surface)', fontWeight: 800 }}>
                      <span className="tabular-nums" style={{ color: 'var(--hex-purple)' }}>{formatHex(hex)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  })();

  return (
    <div>
      <div className="ff-card" style={{ marginBottom: 16, overflow: 'visible' }}>
        <div className="ff-card-header">
          <h2 style={{ fontSize: 18 }}>
            <HexBrand word="Compare" size="lg" filled />
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {scoringPreset && (
              <span className="ff-compare-scoring-badge">
                {scoringPreset === 'ppr' ? 'PPR' : scoringPreset === 'half_ppr' ? 'Half PPR' : scoringPreset === 'standard' ? 'Standard' : scoringPreset.toUpperCase()} Scoring
              </span>
            )}
            {rosters && (
              <select
                className="ff-compare-mode-select"
                value={compareMode}
                onChange={e => setCompareMode(e.target.value)}
              >
                <option value="basic">Basic Compare</option>
                <option value="league">League Context</option>
                <option value="trade">Trade Context</option>
              </select>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Compare up to 6 players</span>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {/* --- SELECTION MODE (no results yet) --- */}
          {!showResults && (
            <>
              {/* Top row: slots 1–3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <PlayerSlot player={slots[0]} color={COLORS[0]} onSelect={p => setSlot(0, p)} onRemove={() => clearSlot(0)} excludeIds={excludeIds} scoringPreset={scoringPreset} rosters={compareMode !== 'basic' ? rosters : null} />
                <PlayerSlot player={slots[1]} color={COLORS[1]} onSelect={p => setSlot(1, p)} onRemove={() => clearSlot(1)} excludeIds={excludeIds} scoringPreset={scoringPreset} rosters={compareMode !== 'basic' ? rosters : null} />
                <PlayerSlot player={slots[2]} color={COLORS[2]} onSelect={p => setSlot(2, p)} onRemove={() => clearSlot(2)} excludeIds={excludeIds} scoringPreset={scoringPreset} rosters={compareMode !== 'basic' ? rosters : null} />
              </div>

              {/* Compare button — always visible, inactive until 2+ players selected */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                <button onClick={filledCount >= 2 ? handleCompare : undefined} disabled={filledCount < 2} style={{
                  background: filledCount >= 2 ? 'var(--hex-purple)' : 'var(--text-muted)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '12px 40px', fontSize: 15, fontWeight: 800,
                  cursor: filledCount >= 2 ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.04em',
                  boxShadow: filledCount >= 2 ? '0 2px 12px rgba(139,92,246,0.3)' : 'none',
                  opacity: filledCount >= 2 ? 1 : 0.4,
                  transition: 'transform 0.15s, box-shadow 0.15s, background 0.2s, opacity 0.2s',
                }}
                  onMouseEnter={e => { if (filledCount >= 2) { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(139,92,246,0.45)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = filledCount >= 2 ? '0 2px 12px rgba(139,92,246,0.3)' : 'none'; }}>
                  Compare
                </button>
              </div>

              {/* Bottom row: slots 4–6 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16, paddingBottom: 220, marginBottom: -200 }}>
                <PlayerSlot player={slots[3]} color={COLORS[3]} onSelect={p => setSlot(3, p)} onRemove={() => clearSlot(3)} excludeIds={excludeIds} scoringPreset={scoringPreset} rosters={compareMode !== 'basic' ? rosters : null} />
                <PlayerSlot player={slots[4]} color={COLORS[4]} onSelect={p => setSlot(4, p)} onRemove={() => clearSlot(4)} excludeIds={excludeIds} scoringPreset={scoringPreset} rosters={compareMode !== 'basic' ? rosters : null} />
                <PlayerSlot player={slots[5]} color={COLORS[5]} onSelect={p => setSlot(5, p)} onRemove={() => clearSlot(5)} excludeIds={excludeIds} scoringPreset={scoringPreset} rosters={compareMode !== 'basic' ? rosters : null} />
              </div>
            </>
          )}

          {/* --- RESULTS MODE --- */}
          {showResults && (
            <>
              {/* Compact player row + edit button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {slots.map((p, idx) => p && (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-white)',
                      border: `1.5px solid ${COLORS[idx]}`, borderRadius: 8, padding: '5px 10px',
                    }}>
                      <div style={{ width: 3, height: 20, borderRadius: 2, background: COLORS[idx], flexShrink: 0 }} />
                      <PlayerHeadshot espnId={getEspnId(p.name)} name={p.name} size="tiny" pos={p.pos} team={p.team} />
                      <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{p.name}</span>
                    </div>
                    {compareMode === 'trade' && tradePartition && (
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: tradePartition.sendIds.includes(p.id) ? '#dc2626' : tradePartition.receiveIds.includes(p.id) ? 'var(--success-green)' : 'var(--text-muted)' }}>
                        {tradePartition.sendIds.includes(p.id) ? 'Sending' : tradePartition.receiveIds.includes(p.id) ? 'Receiving' : ''}
                      </span>
                    )}
                  </div>
                ))}
                <button onClick={handleEdit} style={{
                  marginLeft: 'auto', background: 'none', border: '1.5px solid var(--border)',
                  borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  Edit {'\u2715'}
                </button>
              </div>

              {/* Two-column: analysis + chart */}
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', margin: '0 -20px', padding: '0 20px' }}>
                {analysisPanel}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
                  {hexChart}
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16, position: 'relative', zIndex: 0 }}>
                {playerData.map((pd, idx) => pd && (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <div style={{ width: 16, height: 3, background: COLORS[idx], borderRadius: 2, ...(idx > 0 ? { backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, var(--bg-white) 4px, var(--bg-white) 6px)' } : {}) }} />
                    <span style={{ fontWeight: 600 }}>{pd.player.name}</span>
                  </div>
                ))}
              </div>

            </>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      {comparisonTable}
    </div>
  );
}
