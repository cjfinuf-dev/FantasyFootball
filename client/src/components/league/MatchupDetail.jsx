import { useState, useMemo, useEffect, useRef } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { PLAYERS } from '../../data/players';
import { ROSTER_PRESETS } from '../../data/scoring';
import { getEspnId } from '../../data/espnIds';
import { getHexScore, getHexData, formatHex } from '../../utils/hexScore';
import { getMatchupWinProb } from '../../utils/winProb';
import PosBadge from '../ui/PosBadge';
import HexBrand from '../ui/HexBrand';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PlayerLink from '../ui/PlayerLink';
import AnimatedNumber from '../ui/AnimatedNumber';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

// 6 matchup-level dimensions
const MATCHUP_DIMS = [
  { key: 'firepower', label: 'Firepower', desc: 'Total projected points from starters' },
  { key: 'starPower', label: 'Star Power', desc: 'Strength of the top 3 players' },
  { key: 'depth', label: 'Depth', desc: 'Bench quality and roster completeness' },
  { key: 'consistency', label: 'Consistency', desc: 'Team-wide week-to-week reliability' },
  { key: 'ceiling', label: 'Ceiling', desc: 'Boom potential and best-case upside' },
  { key: 'health', label: 'Health', desc: 'Roster availability and injury risk' },
];

function calcTeamDims(teamId, rosters) {
  const playerIds = rosters?.[teamId] || [];
  const players = playerIds.map(pid => ({ player: PLAYER_MAP[pid], pid })).filter(r => r.player);
  if (players.length === 0) return MATCHUP_DIMS.map(() => 0);

  // Sort by HexScore descending
  players.sort((a, b) => getHexScore(b.pid) - getHexScore(a.pid));

  // Assign starters (top 9) and bench (rest)
  const starters = players.slice(0, 9);
  const bench = players.slice(9);

  // Firepower: total starter projections, normalized against a theoretical max (~200 pts)
  const firepower = Math.min(1, starters.reduce((s, r) => s + r.player.proj, 0) / 200);

  // Star Power: avg HexScore of top 3, normalized to 0-1
  const top3 = players.slice(0, 3);
  const starPower = Math.min(1, top3.reduce((s, r) => s + getHexScore(r.pid), 0) / (3 * 90));

  // Depth: avg HexScore of bench players, normalized
  const depth = bench.length > 0
    ? Math.min(1, bench.reduce((s, r) => s + getHexScore(r.pid), 0) / (bench.length * 60))
    : 0.2;

  // Consistency: avg consistency dimension across starters
  const consistency = starters.reduce((s, r) => {
    const hd = getHexData(r.pid);
    return s + (hd?.dimensions?.consistency || 0.5);
  }, 0) / starters.length;

  // Ceiling: sum of (proj × xFactor) for starters, normalized
  const ceiling = Math.min(1, starters.reduce((s, r) => {
    const hd = getHexData(r.pid);
    const xf = hd?.dimensions?.xFactor || 0.5;
    return s + (r.player.proj * (0.5 + xf * 0.5));
  }, 0) / 160);

  // Health: avg durability+health across roster
  const health = players.reduce((s, r) => {
    const hd = getHexData(r.pid);
    const dur = hd?.dimensions?.durability || 0.5;
    const hp = hd?.dimensions?.health || 1.0;
    return s + (dur * 0.7 + hp * 0.3);
  }, 0) / players.length;

  return [firepower, starPower, depth, consistency, ceiling, health];
}

function assignToSlots(playerIds) {
  const players = playerIds.map(pid => ({ player: PLAYER_MAP[pid], pid })).filter(r => r.player);
  players.sort((a, b) => getHexScore(b.pid) - getHexScore(a.pid));

  const preset = ROSTER_PRESETS.standard;
  const slots = [];
  Object.entries(preset).forEach(([pos, count]) => {
    if (pos === 'IR') return;
    for (let i = 0; i < count; i++) slots.push({ pos, label: count > 1 && pos !== 'BN' ? `${pos}${i + 1}` : pos });
  });

  const unassigned = [...players];
  return slots.map(slot => {
    const matchIdx = unassigned.findIndex(r => {
      if (slot.pos === 'FLEX') return ['RB', 'WR', 'TE'].includes(r.player?.pos);
      if (slot.pos === 'DST') return r.player?.pos === 'DEF';
      if (slot.pos === 'BN') return true;
      return r.player?.pos === slot.pos;
    });
    const match = matchIdx >= 0 ? unassigned.splice(matchIdx, 1)[0] : null;
    return { ...slot, pick: match };
  });
}

// Dual Hex Radar Chart — matches player HexChart visual settings
function DualHexRadar({ dimsA, dimsB, teamA, teamB }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [animProgress, setAnimProgress] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 700;
    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      setAnimProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const maxR = 262;
  const mPillW = 125, mPillH = 36, mPillGap = 22;
  const mMaxOffset = maxR + mPillGap + Math.max(mPillW/2, mPillH/2) + mPillH/2;
  const svgSize = Math.ceil(mMaxOffset * 2 + 20);
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const rings = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const angleOffset = -Math.PI / 2;

  const getPoint = (i, r) => {
    const angle = angleOffset + (i * 2 * Math.PI) / 6;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const buildPath = (dims) =>
    dims.map((v, i) => getPoint(i, v * maxR * animProgress))
      .map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1))
      .join(' ') + ' Z';

  const pathA = buildPath(dimsA);
  const pathB = buildPath(dimsB);

  const tipDim = hoveredIdx !== null ? MATCHUP_DIMS[hoveredIdx] : null;
  const aWins = tipDim ? dimsA[hoveredIdx] > dimsB[hoveredIdx] : false;
  const diff = tipDim ? Math.abs(Math.round((dimsA[hoveredIdx] - dimsB[hoveredIdx]) * 100)) : 0;

  return (
    <div className="ff-hex-radar-layout">
      {/* Left: Explanation panel */}
      <div className="ff-hex-radar-panel">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9999, padding: '4px 14px', marginBottom: 14 }}>Breakdown</div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <div style={{ width: 16, height: 3, background: 'var(--hex-purple)', borderRadius: 2 }} />
            <span style={{ fontWeight: 600 }}>{teamA.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <div style={{ width: 16, height: 3, background: 'var(--accent-secondary-text)', borderRadius: 2, opacity: 0.6 }} />
            <span style={{ fontWeight: 600 }}>{teamB.name}</span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          {tipDim ? (
            <div style={{
              padding: '18px 20px', borderRadius: 12, width: '100%',
              background: 'var(--surface)', border: '1px solid var(--border)',
              fontSize: 15, lineHeight: 1.6,
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                {tipDim.label}
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 8, background: aWins ? 'var(--accent-10)' : 'transparent' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--hex-purple)', marginBottom: 4 }}>{teamA.name}</div>
                  <div style={{ fontSize: 30, fontWeight: 800 }} className="tabular-nums">{(dimsA[hoveredIdx] * 100).toFixed(1)}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 8, background: !aWins ? 'var(--accent-10)' : 'transparent' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-secondary-text)', marginBottom: 4 }}>{teamB.name}</div>
                  <div style={{ fontSize: 30, fontWeight: 800 }} className="tabular-nums">{(dimsB[hoveredIdx] * 100).toFixed(1)}</div>
                </div>
              </div>
              {diff > 0 && (
                <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--success-green)' }}>{aWins ? teamA.abbr : teamB.abbr}</strong> leads by <strong>{diff}</strong> points in {tipDim.label.toLowerCase()}. {tipDim.desc}.
                </div>
              )}
              {diff === 0 && (
                <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>
                  Dead even in {tipDim.label.toLowerCase()}. {tipDim.desc}.
                </div>
              )}
            </div>
          ) : (
            <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, opacity: 0.4 }}>
              Hover a dimension
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="ff-hex-radar-divider" />

      {/* Right: Chart */}
      <div className="ff-hex-radar-chart">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9999, padding: '4px 14px', marginBottom: 14, alignSelf: 'flex-start' }}>
<HexBrand word="Analysis" size="sm" />
        </div>
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ display: 'block', maxWidth: '100%' }} role="img" aria-label={`HexAnalysis comparison: ${teamA.name} vs ${teamB.name}`}>
          {/* Grade bands — one per 10% ring */}
          {[
            { inner: 0,   outer: 0.1, color: '#991b1b' },
            { inner: 0.1, outer: 0.2, color: '#dc2626' },
            { inner: 0.2, outer: 0.3, color: '#ea580c' },
            { inner: 0.3, outer: 0.4, color: '#d97706' },
            { inner: 0.4, outer: 0.5, color: '#ca8a04' },
            { inner: 0.5, outer: 0.6, color: '#65a30d' },
            { inner: 0.6, outer: 0.7, color: '#16a34a' },
            { inner: 0.7, outer: 0.8, color: '#15803d' },
            { inner: 0.8, outer: 0.9, color: '#22c55e' },
            { inner: 0.9, outer: 1.0, color: '#8B5CF6' },
          ].map(band => {
            const outerPts = Array.from({ length: 6 }, (_, i) => getPoint(i, band.outer * maxR));
            const innerPts = Array.from({ length: 6 }, (_, i) => getPoint(i, band.inner * maxR)).reverse();
            const outerPath = outerPts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z';
            const innerPath = band.inner > 0
              ? ' ' + innerPts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z'
              : '';
            return <path key={band.outer} d={outerPath + innerPath} fill={band.color} fillOpacity="0.12" fillRule="evenodd" />;
          })}

          {/* Grid rings — alternating light/dark strokes for contrast */}
          {rings.map(r => {
            const pts = Array.from({ length: 6 }, (_, i) => getPoint(i, r * maxR));
            const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z';
            const val = Math.round(r * 100);
            const isOdd = (val / 10) % 2 === 1;
            return <path key={r} d={path} fill="none"
              stroke={r === 1 ? '#8B5CF6' : isOdd ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.25)'}
              strokeWidth={r === 1 ? 4 : 1} />;
          })}

          {/* Ring value labels — every ring with .0 decimal */}
          {rings.map(r => {
            const val = (r * 100).toFixed(1);
            const isMajor = Math.round(r * 100) % 20 === 0;
            return (
              <text key={'rl' + r} x={cx + 10} y={cy - r * maxR + 4} fontSize={isMajor ? '12' : '10'} fontWeight={isMajor ? '700' : '500'} fill="var(--text-muted)" opacity={isMajor ? 0.6 : 0.35}>
                {val}
              </text>
            );
          })}

          {/* Axis lines */}
          {Array.from({ length: 6 }, (_, i) => {
            const [x, y] = getPoint(i, maxR);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--text-muted)" strokeWidth="1" opacity="0.4" />;
          })}

          {/* Team A polygon */}
          <path d={pathA} fill="#2563EB" fillOpacity="0.2" stroke="#2563EB" strokeWidth="2.5" strokeLinejoin="round" />

          {/* Team B polygon */}
          <path d={pathB} fill="#10B981" fillOpacity="0.12" stroke="#10B981" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="8,4" />

          {/* Score tooltips on hover — show both teams' decimal values */}
          {hoveredIdx !== null && (() => {
            const aVal = (dimsA[hoveredIdx] * 100).toFixed(1);
            const bVal = (dimsB[hoveredIdx] * 100).toFixed(1);
            const [ax, ay] = dimsA[hoveredIdx] > 0 ? getPoint(hoveredIdx, dimsA[hoveredIdx] * maxR) : [cx, cy];
            const [bx, by] = dimsB[hoveredIdx] > 0 ? getPoint(hoveredIdx, dimsB[hoveredIdx] * maxR) : [cx, cy];
            const aDx = cx - ax, aDy = cy - ay, aDist = Math.sqrt(aDx*aDx + aDy*aDy) || 1;
            const bDx = cx - bx, bDy = cy - by, bDist = Math.sqrt(bDx*bDx + bDy*bDy) || 1;
            return (
              <g>
                {/* Team A value */}
                <rect x={ax + (aDx/aDist)*24 - 22} y={ay + (aDy/aDist)*24 - 11} width="44" height="20" rx="5" fill="#2563EB" fillOpacity="0.9" />
                <text x={ax + (aDx/aDist)*24} y={ay + (aDy/aDist)*24 + 4} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">{aVal}</text>
                {/* Team B value */}
                <rect x={bx + (bDx/bDist)*24 - 22} y={by + (bDy/bDist)*24 - 11} width="44" height="20" rx="5" fill="#10B981" fillOpacity="0.8" />
                <text x={bx + (bDx/bDist)*24} y={by + (bDy/bDist)*24 + 4} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">{bVal}</text>
              </g>
            );
          })()}

          {/* Dimension labels + hover targets */}
          {MATCHUP_DIMS.map((dim, i) => {
            const angle = angleOffset + (i * 2 * Math.PI) / 6;
            const dx = Math.cos(angle), dy = Math.sin(angle);
            const radialExtent = Math.abs(dx) * mPillW / 2 + Math.abs(dy) * mPillH / 2;
            const offset = maxR + mPillGap + radialExtent;
            const [lx, ly] = getPoint(i, offset);
            const isHovered = hoveredIdx === i;
            return (
              <g key={i} style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                <circle cx={lx} cy={ly} r={42} fill="transparent" />
                <rect x={lx - mPillW/2} y={ly - mPillH/2} width={mPillW} height={mPillH} rx="10" fill="var(--hex-purple)" fillOpacity={isHovered ? 0.3 : 0.12} stroke="var(--hex-purple)" strokeWidth="1.5" strokeOpacity={isHovered ? 0.7 : 0.3} />
                <text x={lx} y={ly + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill={isHovered ? '#fff' : 'var(--hex-purple)'} style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {dim.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

const POS_COLORS = {
  QB: 'var(--pos-qb)', RB: 'var(--pos-rb)', WR: 'var(--pos-wr)',
  TE: 'var(--pos-te)', K: 'var(--pos-k)', DEF: 'var(--pos-def)',
};

export default function MatchupDetail({ matchup, rosters, onBack, onPlayerClick }) {
  const homeTeam = TEAMS.find(t => t.id === matchup.home.teamId);
  const awayTeam = TEAMS.find(t => t.id === matchup.away.teamId);
  const isUserMatchup = matchup.home.teamId === USER_TEAM_ID || matchup.away.teamId === USER_TEAM_ID;

  // Compute projections from rosters
  const homeProj = useMemo(() => {
    if (!rosters?.[matchup.home.teamId]) return matchup.home.projected;
    return rosters[matchup.home.teamId].reduce((s, pid) => s + (PLAYER_MAP[pid]?.proj || 0), 0);
  }, [rosters, matchup]);

  const awayProj = useMemo(() => {
    if (!rosters?.[matchup.away.teamId]) return matchup.away.projected;
    return rosters[matchup.away.teamId].reduce((s, pid) => s + (PLAYER_MAP[pid]?.proj || 0), 0);
  }, [rosters, matchup]);

  const homeRoster = rosters?.[matchup.home.teamId] || [];
  const awayRoster = rosters?.[matchup.away.teamId] || [];
  const homeWinProb = homeRoster.length && awayRoster.length
    ? getMatchupWinProb(homeRoster, awayRoster, PLAYER_MAP)
    : (homeProj + awayProj > 0 ? homeProj / (homeProj + awayProj) : 0.5);
  const homePct = (homeWinProb * 100).toFixed(2);
  const awayPct = (100 - homeWinProb * 100).toFixed(2);

  // Team dimensions for radar
  const homeDims = useMemo(() => calcTeamDims(matchup.home.teamId, rosters), [rosters, matchup]);
  const awayDims = useMemo(() => calcTeamDims(matchup.away.teamId, rosters), [rosters, matchup]);

  // Position-by-position comparison
  const homeSlots = useMemo(() => assignToSlots(rosters?.[matchup.home.teamId] || []), [rosters, matchup]);
  const awaySlots = useMemo(() => assignToSlots(rosters?.[matchup.away.teamId] || []), [rosters, matchup]);

  // Key advantages
  const advantages = MATCHUP_DIMS.map((dim, i) => {
    const diff = homeDims[i] - awayDims[i];
    if (Math.abs(diff) < 0.05) return null;
    return { dim: dim.label, winner: diff > 0 ? homeTeam : awayTeam, loser: diff > 0 ? awayTeam : homeTeam, margin: Math.abs(Math.round(diff * 100)) };
  }).filter(Boolean).sort((a, b) => b.margin - a.margin);

  return (
    <div>
      {/* Header */}
      <div className="ff-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: 5, background: isUserMatchup ? 'var(--accent)' : 'var(--charcoal-slate)' }} />
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            {/* Home */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{homeTeam.name}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{homeTeam.wins}-{homeTeam.losses} &middot; {homeTeam.streak}</div>
              <div style={{ fontSize: 38, fontWeight: 900, marginTop: 8, color: homeProj >= awayProj ? 'var(--success-green)' : 'var(--text)' }} className="tabular-nums">
                <AnimatedNumber value={homeProj} decimals={2} duration={600} />
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Projected</div>
            </div>

            {/* VS */}
            <div style={{ padding: '0 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>VS</div>
            </div>

            {/* Away */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{awayTeam.name}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{awayTeam.wins}-{awayTeam.losses} &middot; {awayTeam.streak}</div>
              <div style={{ fontSize: 38, fontWeight: 900, marginTop: 8, color: awayProj >= homeProj ? 'var(--success-green)' : 'var(--text)' }} className="tabular-nums">
                <AnimatedNumber value={awayProj} decimals={2} duration={600} />
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Projected</div>
            </div>
          </div>

          {/* Win Probability Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--hex-purple)', minWidth: 42 }} className="tabular-nums">{homePct}%</span>
            <div style={{ flex: 1, display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--surface2)' }}>
              <div style={{ width: `${homePct}%`, background: 'var(--hex-purple)', borderRadius: '4px 0 0 4px' }} />
              <div style={{ width: `${awayPct}%`, background: 'var(--accent-secondary)', borderRadius: '0 4px 4px 0' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-secondary-text)', minWidth: 42, textAlign: 'right' }} className="tabular-nums">{awayPct}%</span>
          </div>
        </div>
      </div>

      {/* Dual Radar Chart */}
      <div className="ff-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <DualHexRadar dimsA={homeDims} dimsB={awayDims} teamA={homeTeam} teamB={awayTeam} />
      </div>

      {/* Key Advantages */}
      {advantages.length > 0 && (
        <div className="ff-card" style={{ marginBottom: 16 }}>
          <div className="ff-card-header">
            <h2 style={{ fontSize: 18 }}>Key Advantages</h2>
          </div>
          <div className="ff-card-body" style={{ padding: '12px 20px' }}>
            {advantages.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                borderBottom: i < advantages.length - 1 ? '1px solid var(--border)' : 'none',
                fontSize: 15,
              }}>
                <span style={{ fontWeight: 700, color: a.winner.id === matchup.home.teamId ? 'var(--hex-purple)' : 'var(--accent-secondary-text)', minWidth: 46 }}>
                  {a.winner.name}
                </span>
                <span style={{ color: 'var(--success-green)', fontSize: 14, fontWeight: 700 }}>+{a.margin}</span>
                <span style={{ color: 'var(--text-muted)', flex: 1 }}>{a.dim}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>vs {a.loser.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Roster Comparison — High Density Table */}
      {(() => {
        const homeTotalProj = homeSlots.filter(s => s.pick && s.pos !== 'BN').reduce((s, sl) => s + sl.pick.player.proj, 0);
        const awayTotalProj = awaySlots.filter(s => s.pick && s.pos !== 'BN').reduce((s, sl) => s + sl.pick.player.proj, 0);
        const homeStarters = homeSlots.filter(s => s.pos !== 'BN');
        const awayStarters = awaySlots.filter(s => s.pos !== 'BN');
        const homeBench = homeSlots.filter(s => s.pos === 'BN');
        const awayBench = awaySlots.filter(s => s.pos === 'BN');
        const maxBench = Math.max(homeBench.length, awayBench.length);
        const allRows = [
          ...homeStarters.map((hs, i) => ({ home: hs, away: awayStarters[i], bench: false })),
          { separator: true },
          ...Array.from({ length: maxBench }, (_, i) => ({
            home: homeBench[i] || { pos: 'BN', label: 'BN', pick: null },
            away: awayBench[i] || { pos: 'BN', label: 'BN', pick: null },
            bench: true,
          })),
        ];

        return (
          <div className="ff-card ff-table-fade" style={{ marginBottom: 16, overflow: 'hidden' }}>
            <div className="ff-table-wrap">
              <table className="ff-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>{homeTeam.name}</th>
                    <th style={{ textAlign: 'left' }}>Team</th>
                    <th style={{ textAlign: 'right' }}>Proj</th>
                    <th style={{ textAlign: 'right', color: 'var(--hex-purple)' }}>Hex</th>
                    <th style={{ textAlign: 'center', width: 60 }}>Slot</th>
                    <th style={{ textAlign: 'center', width: 56 }}>+/-</th>
                    <th style={{ textAlign: 'right', color: 'var(--hex-purple)' }}>Hex</th>
                    <th style={{ textAlign: 'right' }}>Proj</th>
                    <th style={{ textAlign: 'right' }}>Team</th>
                    <th style={{ textAlign: 'right' }}>{awayTeam.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {allRows.map((row, idx) => {
                    if (row.separator) {
                      return (
                        <tr key="sep" style={{ background: 'var(--surface)' }}>
                          <td colSpan={10} style={{ padding: '4px 10px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                            Bench
                          </td>
                        </tr>
                      );
                    }
                    const hp = row.home?.pick;
                    const ap = row.away?.pick;
                    const hProj = hp ? hp.player.proj : 0;
                    const aProj = ap ? ap.player.proj : 0;
                    const hHex = hp ? getHexScore(hp.pid) : 0;
                    const aHex = ap ? getHexScore(ap.pid) : 0;
                    const diff = hProj - aProj;
                    const homeWins = diff > 0.05;
                    const awayWins = diff < -0.05;

                    return (
                      <tr key={idx} style={{ opacity: row.bench ? 0.65 : 1 }}>
                        {/* Home player */}
                        <td>
                          {hp ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <PlayerHeadshot espnId={getEspnId(hp.player.name)} name={hp.player.name} size="tiny" pos={hp.player.pos} team={hp.player.team} />
                              <PosBadge pos={hp.player.pos} />
                              <PlayerLink name={hp.player.name} playerId={hp.pid} onPlayerClick={onPlayerClick} />
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>-</span>}
                        </td>
                        <td className="player-team">{hp?.player?.team || ''}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">{hp ? hProj : ''}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--hex-purple)' }} className="tabular-nums">{hp ? formatHex(hHex) : ''}</td>

                        {/* Slot */}
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: POS_COLORS[row.home?.pos] || 'var(--text-muted)' }}>
                          {row.home?.label || 'BN'}
                        </td>

                        {/* Variance */}
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 14,
                          color: homeWins ? 'var(--success-green)' : awayWins ? 'var(--red)' : 'var(--text-muted)',
                        }} className="tabular-nums">
                          {(hp || ap) ? (homeWins ? '+' : '') + diff.toFixed(2) : ''}
                        </td>

                        {/* Away hex */}
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--hex-purple)' }} className="tabular-nums">{ap ? formatHex(aHex) : ''}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">{ap ? aProj : ''}</td>
                        <td style={{ textAlign: 'right' }} className="player-team">{ap?.player?.team || ''}</td>
                        <td style={{ textAlign: 'right' }}>
                          {ap ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                              <PlayerLink name={ap.player.name} playerId={ap.pid} onPlayerClick={onPlayerClick} />
                              <PosBadge pos={ap.player.pos} />
                              <PlayerHeadshot espnId={getEspnId(ap.player.name)} name={ap.player.name} size="tiny" pos={ap.player.pos} team={ap.player.team} />
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>-</span>}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total row */}
                  <tr style={{ fontWeight: 800, background: 'var(--surface)' }}>
                    <td colSpan={2} style={{ fontWeight: 800 }}>{homeTeam.name} Total</td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }} className="tabular-nums">{homeTotalProj.toFixed(2)}</td>
                    <td></td>
                    <td></td>
                    <td style={{ textAlign: 'center', fontWeight: 900, fontSize: 14,
                      color: homeTotalProj > awayTotalProj ? 'var(--success-green)' : homeTotalProj < awayTotalProj ? 'var(--red)' : 'var(--text-muted)',
                    }} className="tabular-nums">
                      {homeTotalProj > awayTotalProj ? '+' : ''}{(homeTotalProj - awayTotalProj).toFixed(2)}
                    </td>
                    <td></td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }} className="tabular-nums">{awayTotalProj.toFixed(2)}</td>
                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: 800 }}>{awayTeam.name} Total</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
