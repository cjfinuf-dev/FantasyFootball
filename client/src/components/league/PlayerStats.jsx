import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { PLAYERS } from '../../data/players';
import { NFL_TEAMS } from '../../data/nflColors';
import { getEspnId } from '../../data/espnIds';
import { getOpponent, getByeWeek } from '../../data/nflSchedule';
import { getHexData, getHexTier, getLeagueHexScores, getDynamicSituationEvents, formatHex } from '../../utils/hexScore';
import { getPlayerBio } from '../../data/playerBios';
import { PLAYER_AGES } from '../../data/playerAges';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PosBadge from '../ui/PosBadge';
import StatusLabel from '../ui/StatusLabel';
import ArchetypeBadge from '../ui/ArchetypeBadge';
import AnimatedNumber from '../ui/AnimatedNumber';
import HexBrand from '../ui/HexBrand';
import { getGrade } from '../../utils/grades';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

// User-facing dimension labels — derived from internal dimensions but reframed
const HEX_DIMENSIONS = [
  { key: 'production', label: 'Production', desc: 'Weighted scoring output across recent seasons' },
  { key: 'volume', label: 'Volume', desc: 'Usage share, target share, and touch dominance' },
  { key: 'consistency', label: 'Consistency', desc: 'Week-to-week scoring reliability and variance' },
  { key: 'durability', label: 'Durability', desc: 'Injury history, availability, and current health' },
  { key: 'situation', label: 'Situation', desc: 'Offensive scheme fit and team environment' },
  { key: 'scarcity', label: 'Scarcity', desc: 'Positional replacement value and draft premium' },
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

// Generate human-readable reason for a dimension score
function getDimReason(key, val, player) {
  const pct = Math.round(val * 100);
  if (key === 'production') {
    if (val >= 0.8) return `Elite producer — ${player.name} ranks among the top scorers at ${player.pos} with ${player.avg} pts/game average.`;
    if (val >= 0.6) return `Strong production — averaging ${player.avg} pts/game, a reliable weekly contributor at ${player.pos}.`;
    if (val >= 0.4) return `Moderate production — ${player.avg} pts/game is serviceable but not dominant at the position.`;
    return `Limited production — ${player.avg} pts/game places ${player.name} in the lower tier of ${player.pos}s.`;
  }
  if (key === 'volume') {
    if (val >= 0.8) return `Elite usage — ${player.name} commands a dominant share of ${player.team}'s touches and targets, making him a locked-in volume play.`;
    if (val >= 0.6) return `Strong volume — ${player.name} sees consistent involvement in ${player.team}'s game plan with a healthy target/touch share.`;
    if (val >= 0.4) return `Moderate volume — ${player.name} shares opportunities with other weapons, capping his weekly ceiling.`;
    return `Low volume — ${player.name} is not a featured part of ${player.team}'s offense, limiting fantasy upside.`;
  }
  if (key === 'consistency') {
    if (val >= 0.8) return `Extremely consistent — ${player.name} delivers reliable scores with minimal week-to-week variance.`;
    if (val >= 0.6) return `Solid floor — dependable weekly output you can count on in your lineup.`;
    if (val >= 0.4) return `Moderate consistency — some boom-or-bust tendencies in ${player.name}'s game.`;
    return `Volatile scorer — high variance makes ${player.name} risky as a weekly starter.`;
  }
  if (key === 'durability') {
    if (val >= 0.8) return `Ironman — ${player.name} has an excellent availability track record with minimal injury history.`;
    if (val >= 0.6) return `Generally durable — has missed some time but maintains solid availability.`;
    if (val >= 0.4) return `Injury concerns — ${player.name}'s history shows enough missed games to warrant caution.`;
    return `Fragile — significant injury history creates real risk of missed time in 2025.`;
  }
  if (key === 'situation') {
    if (val >= 0.8) return `Elite situation — ${player.team}'s offensive scheme and supporting cast are ideal for ${player.name}.`;
    if (val >= 0.6) return `Favorable setup — ${player.team} provides a good environment for fantasy production.`;
    if (val >= 0.4) return `Neutral situation — ${player.team}'s offense neither helps nor hurts ${player.name}'s outlook significantly.`;
    return `Poor situation — ${player.team}'s offensive context limits ${player.name}'s fantasy ceiling.`;
  }
  if (key === 'scarcity') {
    if (val >= 0.8) return `Elite scarcity — ${player.name} is one of the top ${player.pos}s in the league. Losing him would be nearly impossible to replace on waivers.`;
    if (val >= 0.6) return `Scarce asset — there are limited replacement options at ${player.pos} if ${player.name} were dropped or injured.`;
    if (val >= 0.4) return `Moderate scarcity — ${player.name} is a solid ${player.pos} but comparable options exist on the wire.`;
    return `Highly replaceable — there are many ${player.pos}s with similar production available, reducing ${player.name}'s draft premium.`;
  }
  return `Score: ${pct}/100`;
}

// Find the most similar player by Euclidean distance across hex dimensions
const DIM_KEYS = ['production', 'volume', 'consistency', 'durability', 'situation', 'scarcity'];

function findMostSimilar(playerId, hexData) {
  if (!hexData?.dimensions) return null;
  const player = PLAYER_MAP[playerId];
  if (!player) return null;
  const allScores = getLeagueHexScores('standard');
  const myVals = DIM_KEYS.map(k => getDimensionValue(hexData.dimensions, k));

  // Only compare within the same position group
  const candidates = [];
  allScores.forEach((entry, pid) => {
    if (pid === playerId || !entry.dimensions) return;
    const p = PLAYER_MAP[pid];
    if (!p || p.pos !== player.pos) return;
    const vals = DIM_KEYS.map(k => getDimensionValue(entry.dimensions, k));
    const dist = Math.sqrt(vals.reduce((sum, v, i) => sum + Math.pow(v - myVals[i], 2), 0));
    candidates.push({ pid, dist });
  });

  if (candidates.length === 0) return null;

  // Sort by distance, take the top 10 closest, pick one randomly
  candidates.sort((a, b) => a.dist - b.dist);
  const pool = candidates.slice(0, Math.min(10, candidates.length));
  const pick = pool[Math.floor(Math.random() * pool.length)];

  const p = PLAYER_MAP[pick.pid];
  const entry = allScores.get(pick.pid);
  const similarity = Math.round((1 - pick.dist / 2.45) * 100);
  return { player: p, hexScore: entry?.hexScore || 0, similarity };
}

// Interactive Hex Radar Chart
function HexRadar({ dimensions, hexData, player }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [animProgress, setAnimProgress] = useState(0);
  const animRef = useRef(null);
  const [compareQuery, setCompareQuery] = useState('');
  const [comparePlayer, setComparePlayer] = useState(null);

  const compareResults = useMemo(() => {
    if (!compareQuery || compareQuery.length < 2) return [];
    const q = compareQuery.toLowerCase();
    return PLAYERS.filter(p => p.id !== player.id && p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [compareQuery, player.id]);

  const compareHexData = comparePlayer ? getHexData(comparePlayer.id) : null;
  const similar = useMemo(() => findMostSimilar(player.id, hexData), [player.id, hexData]);

  useEffect(() => {
    const start = performance.now();
    const duration = 700;
    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setAnimProgress(eased);
      if (t < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // SVG draws the hex chart; labels are positioned inside the SVG via extra padding
  const maxR = 262;
  const pillW = 125, pillH = 64, pillGap = 22;
  // Compute max offset needed (at the angle that pushes the pill farthest out)
  const maxOffset = maxR + pillGap + Math.max(pillW/2, pillH/2) + pillH/2;
  const svgSize = Math.ceil(maxOffset * 2 + 20);
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const rings = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

  const angleOffset = -Math.PI / 2;
  const getPoint = (i, r) => {
    const angle = angleOffset + (i * 2 * Math.PI) / 6;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const dimValues = dimensions.map(dim => ({
    ...dim,
    val: getDimensionValue(hexData.dimensions, dim.key),
  }));

  const dataPoints = dimValues.map((d, i) => getPoint(i, d.val * maxR * animProgress));
  const dataPath = dataPoints.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z';

  // Tooltip data (always rendered, content swaps)
  const tipDim = hoveredIdx !== null ? dimValues[hoveredIdx] : null;
  const tipGrade = tipDim ? getDimGrade(tipDim.val) : null;

  return (
    <div className="ff-hex-radar-layout">
      {/* Left: Explanation panel */}
      <div className="ff-hex-radar-panel">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9999, padding: '4px 14px', marginBottom: 14 }}>Breakdown</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          {tipDim ? (
            <div style={{
              padding: '18px 20px', borderRadius: 12, width: '100%',
              background: 'var(--surface)', border: '1px solid var(--border)',
              fontSize: 13, lineHeight: 1.6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: tipGrade.color, fontSize: 16 }}>
                  {tipDim.label}
                </span>
                <span style={{ fontWeight: 800, color: tipGrade.color, fontSize: 20 }}>
                  {tipGrade.letter}
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }} className="tabular-nums">
                {(tipDim.val * 100).toFixed(1)}<span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>/100</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
                {getDimReason(tipDim.key, tipDim.val, player)}
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, opacity: 0.4 }}>
              Hover a dimension
            </div>
          )}
        </div>

        {/* Most similar player suggestion */}
        {similar && !comparePlayer && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Similar {player.pos}</div>
            <button
              onClick={() => { setComparePlayer(similar.player); setCompareQuery(''); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 'var(--radius-md)',
                background: 'var(--accent-10)', border: '1px solid var(--accent-20)',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-15)'; e.currentTarget.style.borderColor = 'var(--accent-30)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-10)'; e.currentTarget.style.borderColor = 'var(--accent-20)'; }}
            >
              <PlayerHeadshot espnId={getEspnId(similar.player.name)} name={similar.player.name} size="xs" pos={similar.player.pos} team={similar.player.team} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{similar.player.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  <PosBadge pos={similar.player.pos} /> {similar.player.team} &middot; {formatHex(similar.hexScore)} Hex
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--hex-purple)' }} className="tabular-nums">{similar.similarity}%</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>match</div>
              </div>
            </button>
          </div>
        )}

        {/* Compare player search */}
        <div style={{ marginTop: 10, position: 'relative' }}>
          <input
            className="ff-search-input"
            type="text"
            placeholder={comparePlayer ? `vs ${comparePlayer.name}` : 'Compare player...'}
            value={compareQuery}
            onChange={e => { setCompareQuery(e.target.value); if (!e.target.value) setComparePlayer(null); }}
            style={{ fontSize: 11, padding: '6px 10px', width: '100%' }}
          />
          {compareResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', marginTop: 2 }}>
              {compareResults.map(p => (
                <div key={p.id} className="ff-tm-player-row" style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}
                  onMouseDown={() => { setComparePlayer(p); setCompareQuery(''); }}>
                  <PosBadge pos={p.pos} />
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4, fontSize: 10 }}>{p.team}</span>
                </div>
              ))}
            </div>
          )}
          {comparePlayer && (
            <button onClick={() => { setComparePlayer(null); setCompareQuery(''); }}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}>
              {'\u2715'}
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="ff-hex-radar-divider" />

      {/* Right: Chart */}
      <div className="ff-hex-radar-chart">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9999, padding: '4px 14px', marginBottom: 14, alignSelf: 'flex-start' }}><HexBrand word="Chart" size="sm" /></div>
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ display: 'block', maxWidth: '100%' }} role="img" aria-label={`HexChart for ${player.name} — ${dimensions.map(d => `${d.label}: ${Math.round(getDimensionValue(hexData.dimensions, d.key) * 100)}`).join(', ')}`}>
        {/* Grade bands — one per 10% ring, simple color ramp */}
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
          const ringPoints = Array.from({ length: 6 }, (_, i) => getPoint(i, r * maxR));
          const path = ringPoints.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z';
          const val = Math.round(r * 100);
          const isOdd = (val / 10) % 2 === 1; // 10,30,50,70,90
          return <path key={r} d={path} fill="none"
            stroke={r === 1 ? '#8B5CF6' : isOdd ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.25)'}
            strokeWidth={r === 1 ? 4 : 1} />;
        })}

        {/* Ring value labels along top axis — every ring with .0 decimal */}
        {rings.map(r => {
          const val = (r * 100).toFixed(1);
          const isMajor = Math.round(r * 100) % 20 === 0;
          return (
            <text key={'rl' + r} x={cx + 12} y={cy - r * maxR + 5} fontSize={isMajor ? '13' : '10'} fontWeight={isMajor ? '700' : '500'} fill="var(--text-muted)" opacity={isMajor ? 0.6 : 0.35}>
              {val}
            </text>
          );
        })}

        {/* Axis lines */}
        {Array.from({ length: 6 }, (_, i) => {
          const [x, y] = getPoint(i, maxR);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--text-muted)" strokeWidth="1" opacity="0.4" />;
        })}

        {/* Comparison polygon (if comparing) */}
        {compareHexData && (() => {
          const compPoints = dimensions.map((dim, i) => getPoint(i, getDimensionValue(compareHexData.dimensions, dim.key) * maxR * animProgress));
          const compPath = compPoints.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z';
          return <path d={compPath} fill="var(--accent-secondary)" fillOpacity="0.1" stroke="var(--accent-secondary-text)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="8,4" />;
        })()}

        {/* Data polygon */}
        <path d={dataPath} fill="var(--hex-purple)" fillOpacity="0.15" stroke="var(--hex-purple)" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Data points — mini hexagons */}
        {dataPoints.map(([x, y], i) => {
          const isHovered = hoveredIdx === i;
          const grade = getDimGrade(dimValues[i].val);
          const hr = 9;
          const hexPts = Array.from({ length: 6 }, (_, j) => {
            const a = -Math.PI / 2 + (j * Math.PI * 2) / 6;
            return `${(x + hr * Math.cos(a)).toFixed(1)},${(y + hr * Math.sin(a)).toFixed(1)}`;
          }).join(' ');
          return (
            <polygon key={i} points={hexPts}
              fill={isHovered ? grade.color : 'var(--hex-purple)'}
              stroke={isHovered ? 'var(--bg-white)' : 'var(--border-strong)'}
              strokeWidth={isHovered ? 2 : 1.5}
              strokeLinejoin="round"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} />
          );
        })}

        {/* Invisible larger hit targets for easier hovering */}
        {dataPoints.map(([x, y], i) => (
          <circle key={'hit' + i} cx={x} cy={y} r={20} fill="transparent" style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} />
        ))}

        {/* Score tooltip on hover — shows decimal value near the data point */}
        {hoveredIdx !== null && (() => {
          const [px, py] = dataPoints[hoveredIdx];
          const val = (dimValues[hoveredIdx].val * 100).toFixed(1);
          const grade = getDimGrade(dimValues[hoveredIdx].val);
          // Position tooltip toward center so it doesn't clip outside SVG
          const dx = cx - px, dy = cy - py;
          const dist = Math.sqrt(dx*dx + dy*dy) || 1;
          const offsetX = (dx / dist) * 28;
          const offsetY = (dy / dist) * 28;
          return (
            <g>
              <rect x={px + offsetX - 24} y={py + offsetY - 12} width="48" height="22" rx="6" fill="var(--bg-white)" stroke={grade.color} strokeWidth="1.5" />
              <text x={px + offsetX} y={py + offsetY + 4} textAnchor="middle" fontSize="12" fontWeight="800" fill={grade.color}>{val}</text>
            </g>
          );
        })()}

        {/* Dimension labels inside SVG — no overflow, no layout shift */}
        {dimValues.map((d, i) => {
          // Per-vertex offset: pill edge is always exactly pillGap from hex outer ring
          const angle = angleOffset + (i * 2 * Math.PI) / 6;
          const dx = Math.cos(angle), dy = Math.sin(angle);
          // Minkowski projection: how far the pill's nearest edge extends toward hex center along this radial
          const radialExtent = Math.abs(dx) * pillW / 2 + Math.abs(dy) * pillH / 2;
          const offset = maxR + pillGap + radialExtent;
          const [lx, ly] = getPoint(i, offset);
          const hexBR = 15;
          const grade = getDimGrade(d.val);
          const isHovered = hoveredIdx === i;
          return (
            <foreignObject key={'label' + i} x={lx - pillW/2} y={ly - pillH/2} width={pillW} height={pillH}
              style={{ overflow: 'hidden', cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
              <div style={{
                width: pillW, height: pillH, borderRadius: 10,
                background: isHovered ? 'var(--accent-30)' : 'var(--accent-10)',
                border: `1.5px solid ${isHovered ? 'var(--accent)' : 'var(--accent-30)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: isHovered ? 'var(--on-accent)' : 'var(--hex-purple)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {d.label}
                </span>
                <span className="hex-grade-badge" style={{ background: grade.color }}>{grade.letter}</span>
              </div>
            </foreignObject>
          );
        })}
      </svg>
      </div>
    </div>
  );
}

const TIER_DESCRIPTIONS = {
  'Elite': 'Top-tier talent. Weekly must-start with league-winning upside.',
  'Starter+': 'Strong starter with above-average production and consistency.',
  'Starter': 'Reliable starter who contributes meaningful weekly points.',
  'Flex': 'Viable flex option with matchup-dependent upside.',
  'Bench': 'Roster-worthy depth piece. Spot start in favorable matchups.',
  'Depth': 'End-of-bench stash. Speculative value or handcuff.',
  'Waiver': 'Minimal fantasy relevance in current format.',
};

export default function PlayerStats({ playerId, onBack }) {
  const player = PLAYER_MAP[playerId];

  const nflTeam = useMemo(
    () => player ? NFL_TEAMS.find(t => t.id === player.team.toLowerCase()) : null,
    [player]
  );

  const hexData = useMemo(() => player ? getHexData(player.id) : null, [player]);

  // Percentile among all players
  const percentile = useMemo(() => {
    if (!hexData) return null;
    const allScores = getLeagueHexScores('standard');
    const scores = [];
    allScores.forEach(d => scores.push(d.hexScore));
    scores.sort((a, b) => a - b);
    const below = scores.filter(s => s < hexData.hexScore).length;
    return Math.round((below / scores.length) * 100);
  }, [hexData]);

  // Position rank by HexScore
  const hexPosRank = useMemo(() => {
    if (!player || !hexData) return '-';
    const allScores = getLeagueHexScores('standard');
    const posScores = [];
    allScores.forEach((d, pid) => {
      const p = PLAYER_MAP[pid];
      if (p && p.pos === player.pos) posScores.push({ pid, score: d.hexScore });
    });
    posScores.sort((a, b) => b.score - a.score);
    const idx = posScores.findIndex(x => x.pid === player.id);
    return idx >= 0 ? idx + 1 : '-';
  }, [player, hexData]);

  // Active news-driven situation events for this player
  const playerEvents = useMemo(() => {
    if (!player) return [];
    return getDynamicSituationEvents().filter(e =>
      e.playerId === player.id || (!e.playerId && e.team === player.team && e.eventType?.endsWith('_cascade'))
    );
  }, [player]);

  const opp = player ? getOpponent(player.team) : null;
  const byeWeek = player ? getByeWeek(player.team) : null;
  const age = player ? PLAYER_AGES[player.id] : null;
  const teamColor = nflTeam?.primary || 'var(--accent)';

  if (!player) {
    return (
      <div className="ff-card">
        <div className="ff-card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Player not found.
        </div>
      </div>
    );
  }

  const tier = hexData ? hexData.tier : getHexTier(0);
  const score = hexData ? hexData.hexScore : 0;
  const intensityClass = score >= 85 ? 'hex-val-elite'
    : score >= 75 ? 'hex-val-plus'
    : score >= 60 ? 'hex-val-starter'
    : score >= 45 ? 'hex-val-flex'
    : score >= 35 ? 'hex-val-bench'
    : score >= 20 ? 'hex-val-depth'
    : 'hex-val-waiver';

  return (
    <div>
      {/* Player Header — ESPN/Sleeper inspired */}
      <div className="ff-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: 5, background: teamColor }} />
        <div style={{
          display: 'flex', alignItems: 'stretch', gap: 0,
          background: `linear-gradient(135deg, ${teamColor}10, ${teamColor}04, transparent)`,
        }}>
          {/* Left: Photo */}
          <div style={{ display: 'flex', alignItems: 'flex-end', padding: '16px 0 0 20px', flexShrink: 0 }}>
            <PlayerHeadshot espnId={getEspnId(player.name)} name={player.name} size="lg" pos={player.pos} team={player.team} />
          </div>

          {/* Center: Name + Metadata */}
          <div style={{ flex: 1, padding: '20px 16px 16px', minWidth: 0 }}>
            {/* Name — first name lighter, last name bold */}
            <h1 style={{ fontSize: 26, margin: 0, lineHeight: 1.2, marginBottom: 6 }}>
              <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{player.name.split(' ')[0]} </span>
              <span style={{ fontWeight: 800 }}>{player.name.split(' ').slice(1).join(' ')}</span>
            </h1>

            {/* Team + Position + Age line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
              <PosBadge pos={player.pos} />
              <span style={{ fontWeight: 600 }}>{player.team}</span>
              {nflTeam && <span>&middot; {nflTeam.name}</span>}
              {age && <span>&middot; Age {age}</span>}
              <StatusLabel status={player.status} />
            </div>

            {/* Badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: teamColor, color: '#fff' }}>
                {player.pos}{hexPosRank}
              </span>
              <ArchetypeBadge playerId={player.id} pos={player.pos} size="sm" />
              {byeWeek && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  BYE {byeWeek}
                </span>
              )}
              {opp && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  Next: <strong style={{ color: 'var(--text)' }}>{opp.location === 'away' ? '@' : 'vs'} {opp.opp}</strong>
                  <span style={{ marginLeft: 4 }}>{opp.gameTime}</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Key Stats Panel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderLeft: '1px solid var(--border)', flexShrink: 0 }}>
            {/* Projection — hero number */}
            <div style={{ textAlign: 'center', padding: '16px 20px' }}>
              <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }} className="tabular-nums"><AnimatedNumber value={player.proj} /></div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 3 }}>Proj</div>
            </div>
            {/* Avg + Last — secondary stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 20px 16px 0' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1, color: player.proj > player.avg ? 'var(--success-green)' : player.proj < player.avg ? 'var(--red)' : 'var(--text)' }} className="tabular-nums">
                  {player.avg} {player.proj > player.avg ? '\u2191' : player.proj < player.avg ? '\u2193' : ''}
                </div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 1 }}>Season Avg</div>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }} className="tabular-nums">{player.pts}</div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 1 }}>Last Week</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Bio — compact, directly below header */}
      {getPlayerBio(player.id) && (
        <div style={{ marginBottom: 16, padding: '0 4px' }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)', margin: 0 }}>
            {getPlayerBio(player.id)}
          </p>
        </div>
      )}

      {/* HexScore Breakdown — wider than parent for chart space */}
      {hexData && (
        <div className="ff-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ height: 4, background: 'var(--accent)' }} />

          {/* Score Hero */}
          <div style={{
            padding: '24px 24px 20px',
            display: 'flex', alignItems: 'center', gap: 24,
            background: 'var(--accent-10)',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ position: 'relative', width: 88, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 88 96" width="88" height="96" style={{ position: 'absolute', top: 0, left: 0 }}>
                  <polygon points="44,2 84,24 84,72 44,94 4,72 4,24" fill="var(--accent-10)" stroke="currentColor" strokeWidth="2" className={intensityClass} opacity="0.5" />
                  <polygon points="44,8 78,27 78,69 44,88 10,69 10,27" fill="none" stroke="currentColor" strokeWidth="1" className={intensityClass} opacity="0.2" />
                </svg>
                <div className={`tabular-nums ${intensityClass}`} style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, position: 'relative', zIndex: 1 }}>
                  <AnimatedNumber value={score} duration={600} decimals={0} />
                </div>
              </div>
              <div style={{
                marginTop: 6, padding: '3px 12px', borderRadius: 'var(--radius-full)',
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                background: 'var(--accent-15)', color: 'var(--accent-text)',
              }}>
                {tier.tier}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}><HexBrand word="Score" size="md" filled /></div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8 }}>
                {TIER_DESCRIPTIONS[tier.tier]}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                {percentile !== null && (
                  <span>Top <strong style={{ color: 'var(--text)' }}>{100 - percentile}%</strong> overall</span>
                )}
                <span>{player.pos} rank: <strong style={{ color: 'var(--text)' }}>#{hexPosRank}</strong></span>
              </div>
            </div>
          </div>

          {/* Hex Radar Chart */}
          <div style={{ borderBottom: '1px solid var(--border)' }}>
            <HexRadar dimensions={HEX_DIMENSIONS} hexData={hexData} player={player} />
          </div>

          {/* Dimension Breakdown */}
          <div style={{ padding: '16px 24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9999, padding: '4px 14px', marginBottom: 12 }}>
              <HexBrand word="Stats" size="sm" /> Breakdown
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {HEX_DIMENSIONS.map(dim => {
                const val = getDimensionValue(hexData.dimensions, dim.key);
                const pct = Math.round(val * 100);
                const grade = getDimGrade(val);
                return (
                  <div key={dim.key}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--hex-purple)', background: 'var(--accent-10)', border: '1px solid var(--accent-20)', borderRadius: 9999, padding: '3px 12px' }}>
                          {dim.label}
                        </span>
                        <span className="hex-grade-badge" style={{ background: grade.color }}>{grade.letter}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{dim.desc}</span>
                      </div>
                    </div>
                    <div style={{
                      height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 3, width: `${pct}%`,
                        background: grade.color,
                        opacity: pct >= 50 ? 1 : 0.7,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score Context Footer */}
          <div style={{
            padding: '12px 24px', borderTop: '1px solid var(--border)',
            fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5,
            background: 'var(--surface)',
          }}>
            <HexBrand word="Score" icon={false} /> is a composite rating from 0-100 that evaluates fantasy value across production history, positional scarcity, team situation, health, and career trajectory. Higher scores indicate greater expected fantasy impact.
          </div>
        </div>
      )}

      {/* News Impact Events */}
      {playerEvents.length > 0 && (
        <div className="ff-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ height: 4, background: playerEvents[0].impact > 0 ? 'var(--success-green)' : 'var(--red)' }} />
          <div className="ff-card-header">
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>News Impact</h2>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{playerEvents.length} active event{playerEvents.length > 1 ? 's' : ''}</span>
          </div>
          <div className="ff-card-body" style={{ padding: 0 }}>
            {playerEvents.map((event, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                borderBottom: i < playerEvents.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 800, minWidth: 48, textAlign: 'center',
                  color: event.impact > 0 ? 'var(--success-green)' : 'var(--red)',
                }} className="tabular-nums">
                  {event.impact > 0 ? '+' : ''}{(event.impact * 100).toFixed(0)}%
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{event.note}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {event.eventType?.replace(/_/g, ' ')} — {Math.round(event.confidence * 100)}% confidence
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
