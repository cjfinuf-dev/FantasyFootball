import { useMemo } from 'react';
import { PLAYERS } from '../../data/players';
import { NFL_TEAMS } from '../../data/nflColors';
import { getEspnId } from '../../data/espnIds';
import { getOpponent } from '../../data/nflSchedule';
import { getHexData, getHexTier, getLeagueHexScores, getDynamicSituationEvents, formatHex } from '../../utils/hexScore';
import { getPlayerBio } from '../../data/playerBios';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PosBadge from '../ui/PosBadge';
import StatusLabel from '../ui/StatusLabel';
import ArchetypeBadge from '../ui/ArchetypeBadge';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

// User-facing dimension labels — derived from internal dimensions but reframed
const HEX_DIMENSIONS = [
  { key: 'production', label: 'Production', desc: 'Weighted scoring output across recent seasons' },
  { key: 'upside', label: 'Upside', desc: 'Scarcity, slot economics, usage share, and opportunity' },
  { key: 'consistency', label: 'Floor', desc: 'Reliability and week-to-week scoring stability' },
  { key: 'durability', label: 'Durability', desc: 'Availability track record and injury resilience' },
  { key: 'situation', label: 'Situation', desc: 'Offensive scheme fit and team environment' },
  { key: 'trajectory', label: 'Trajectory', desc: 'Age curve and career arc projection' },
];

function getDimensionValue(dims, key) {
  if (!dims) return 0;
  switch (key) {
    case 'production': return dims.production || 0;
    case 'upside': return Math.min(1, ((dims.scarcity || 0) * 0.35 + (dims.slotValue || 0) * 0.25 + (dims.xFactor || 0.5) * 0.25 + (dims.context || 0) * 0.15));
    case 'consistency': return dims.consistency || 0;
    case 'durability': return Math.min(1, ((dims.durability || 0) * 0.7 + (dims.health || 0) * 0.3));
    case 'situation': return dims.situation || 0;
    case 'trajectory': return dims.ageFactor || 0;
    default: return 0;
  }
}

function getDimGrade(val) {
  if (val >= 0.85) return { letter: 'A+', color: 'var(--hex-purple-hot)' };
  if (val >= 0.75) return { letter: 'A', color: 'var(--hex-purple-vivid)' };
  if (val >= 0.65) return { letter: 'B+', color: 'var(--hex-purple)' };
  if (val >= 0.55) return { letter: 'B', color: 'var(--accent-tertiary)' };
  if (val >= 0.45) return { letter: 'C+', color: 'var(--text-muted)' };
  if (val >= 0.35) return { letter: 'C', color: 'var(--text-muted)' };
  if (val >= 0.25) return { letter: 'D', color: 'var(--warning-amber)' };
  return { letter: 'F', color: 'var(--red)' };
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

  const tiles = [
    { label: 'PROJ', value: player.proj },
    { label: 'AVG', value: player.avg },
    { label: 'HEX', value: formatHex(score), isHex: true },
  ];

  return (
    <div>
      {/* Player Header */}
      <div className="ff-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: 4, background: teamColor }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px',
          background: `linear-gradient(135deg, ${teamColor}08, ${teamColor}03)`,
        }}>
          <PlayerHeadshot espnId={getEspnId(player.name)} name={player.name} size="lg" pos={player.pos} team={player.team} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{player.name}</h1>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                background: 'var(--accent)', color: 'var(--on-accent)',
              }}>{player.pos}{hexPosRank}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <PosBadge pos={player.pos} />
              <span style={{ fontWeight: 600 }}>{player.team}</span>
              {nflTeam && <span>&middot; {nflTeam.name}</span>}
              <StatusLabel status={player.status} />
              <ArchetypeBadge playerId={player.id} pos={player.pos} size="sm" />
            </div>
            {opp && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                Next: <strong style={{ color: 'var(--text)' }}>{opp.location === 'away' ? '@' : 'vs'} {opp.opp}</strong>
                <span style={{ marginLeft: 8 }}>{opp.gameTime}</span>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }} className="tabular-nums">{player.proj}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Week Proj</div>
          </div>
        </div>
      </div>

      {/* Player Bio */}
      {getPlayerBio(player.id) && (
        <div className="ff-card" style={{ marginBottom: 16 }}>
          <div className="ff-card-body" style={{ padding: '16px 20px' }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8,
            }}>
              About
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', margin: 0 }}>
              {getPlayerBio(player.id)}
            </p>
          </div>
        </div>
      )}

      {/* Stat Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 16 }}>
        {tiles.map(tile => (
          <div key={tile.label} className="ff-card" style={{
            textAlign: 'center', padding: '14px 8px',
            ...(tile.isHex ? { borderLeft: '3px solid var(--hex-purple)', background: 'var(--hex-purple-light)' } : {}),
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }} className={`tabular-nums ${tile.isHex ? intensityClass : ''}`}>{tile.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4, letterSpacing: '0.04em' }}>{tile.label}</div>
          </div>
        ))}
      </div>

      {/* HexScore Breakdown */}
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
                  {formatHex(score)}
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
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>HexScore</div>
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

          {/* Dimension Breakdown */}
          <div style={{ padding: '16px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
              HexStats Breakdown
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {HEX_DIMENSIONS.map(dim => {
                const val = getDimensionValue(hexData.dimensions, dim.key);
                const pct = Math.round(val * 100);
                const grade = getDimGrade(val);
                return (
                  <div key={dim.key}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{dim.label}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{dim.desc}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: grade.color, minWidth: 24, textAlign: 'right' }}>{grade.letter}</span>
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
            HexScore is a composite rating from 0-100 that evaluates fantasy value across production history, positional scarcity, team situation, health, and career trajectory. Higher scores indicate greater expected fantasy impact.
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
