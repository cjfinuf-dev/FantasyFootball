import { useMemo } from 'react';
import { PLAYERS } from '../../data/players';
import { NFL_TEAMS } from '../../data/nflColors';
import { getEspnId } from '../../data/espnIds';
import { getOpponent } from '../../data/nflSchedule';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PosBadge from '../ui/PosBadge';
import StatusLabel from '../ui/StatusLabel';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

// Generate simulated weekly game log from season averages
function generateGameLog(player) {
  if (!player) return [];
  const weeks = 14;
  const log = [];
  const base = player.avg;
  // Seed-based pseudo-random per player for consistency
  let seed = player.id.replace(/\D/g, '') * 7 + 13;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed % 1000) / 1000; };

  for (let w = 1; w <= weeks; w++) {
    const variance = (rand() - 0.5) * base * 0.8;
    const pts = Math.max(0, +(base + variance).toFixed(1));
    const isHome = rand() > 0.5;
    const opp = NFL_TEAMS[Math.floor(rand() * 31) + 1];
    const won = rand() > 0.45;
    const homeScore = Math.floor(rand() * 20) + 14;
    const awayScore = Math.floor(rand() * 20) + 10;

    // Position-specific stats
    let stats = {};
    if (player.pos === 'QB') {
      const att = Math.floor(25 + rand() * 15);
      const cmp = Math.floor(att * (0.58 + rand() * 0.12));
      const yds = Math.floor(180 + rand() * 180);
      const td = Math.floor(rand() * 3.5);
      const int = rand() > 0.75 ? Math.floor(rand() * 2) + 1 : 0;
      stats = { cmp, att, yds, td, int };
    } else if (player.pos === 'RB') {
      const car = Math.floor(10 + rand() * 15);
      const rushYds = Math.floor(30 + rand() * 100);
      const rushTd = rand() > 0.6 ? Math.floor(rand() * 2) + 1 : 0;
      const rec = Math.floor(rand() * 5);
      const recYds = Math.floor(rand() * 50);
      stats = { car, rushYds, rushTd, rec, recYds };
    } else if (player.pos === 'WR' || player.pos === 'TE') {
      const tgt = Math.floor(3 + rand() * 9);
      const rec = Math.floor(tgt * (0.55 + rand() * 0.2));
      const yds = Math.floor(20 + rand() * 110);
      const td = rand() > 0.7 ? Math.floor(rand() * 2) + 1 : 0;
      stats = { tgt, rec, yds, td };
    } else if (player.pos === 'K') {
      const fg = Math.floor(rand() * 4);
      const fga = fg + (rand() > 0.8 ? 1 : 0);
      const xp = Math.floor(1 + rand() * 4);
      stats = { fg, fga, xp };
    }

    log.push({
      week: w,
      opp: opp?.id?.toUpperCase() || 'BYE',
      isHome,
      result: won ? 'W' : 'L',
      score: won ? `${Math.max(homeScore, awayScore)}-${Math.min(homeScore, awayScore)}` : `${Math.min(homeScore, awayScore)}-${Math.max(homeScore, awayScore)}`,
      fpts: pts,
      ...stats,
    });
  }
  return log;
}

function getSeasonStats(log, pos) {
  if (pos === 'QB') {
    return {
      cmp: log.reduce((s, g) => s + (g.cmp || 0), 0),
      att: log.reduce((s, g) => s + (g.att || 0), 0),
      yds: log.reduce((s, g) => s + (g.yds || 0), 0),
      td: log.reduce((s, g) => s + (g.td || 0), 0),
      int: log.reduce((s, g) => s + (g.int || 0), 0),
    };
  }
  if (pos === 'RB') {
    return {
      car: log.reduce((s, g) => s + (g.car || 0), 0),
      rushYds: log.reduce((s, g) => s + (g.rushYds || 0), 0),
      rushTd: log.reduce((s, g) => s + (g.rushTd || 0), 0),
      rec: log.reduce((s, g) => s + (g.rec || 0), 0),
      recYds: log.reduce((s, g) => s + (g.recYds || 0), 0),
    };
  }
  if (pos === 'WR' || pos === 'TE') {
    return {
      tgt: log.reduce((s, g) => s + (g.tgt || 0), 0),
      rec: log.reduce((s, g) => s + (g.rec || 0), 0),
      yds: log.reduce((s, g) => s + (g.yds || 0), 0),
      td: log.reduce((s, g) => s + (g.td || 0), 0),
    };
  }
  if (pos === 'K') {
    return {
      fg: log.reduce((s, g) => s + (g.fg || 0), 0),
      fga: log.reduce((s, g) => s + (g.fga || 0), 0),
      xp: log.reduce((s, g) => s + (g.xp || 0), 0),
    };
  }
  return {};
}

const STAT_TILES = {
  QB: ['PTS', 'PPG', 'YDS', 'TD', 'INT', 'CMP%'],
  RB: ['PTS', 'PPG', 'RUSH', 'YDS', 'TD', 'REC'],
  WR: ['PTS', 'PPG', 'TGT', 'REC', 'YDS', 'TD'],
  TE: ['PTS', 'PPG', 'TGT', 'REC', 'YDS', 'TD'],
  K: ['PTS', 'PPG', 'FG', 'FG%', 'XP'],
  DEF: ['PTS', 'PPG'],
};

const LOG_COLS = {
  QB: [{ key: 'cmp', label: 'CMP' }, { key: 'att', label: 'ATT' }, { key: 'yds', label: 'YDS' }, { key: 'td', label: 'TD' }, { key: 'int', label: 'INT' }],
  RB: [{ key: 'car', label: 'CAR' }, { key: 'rushYds', label: 'YDS' }, { key: 'rushTd', label: 'TD' }, { key: 'rec', label: 'REC' }, { key: 'recYds', label: 'REC YDS' }],
  WR: [{ key: 'tgt', label: 'TGT' }, { key: 'rec', label: 'REC' }, { key: 'yds', label: 'YDS' }, { key: 'td', label: 'TD' }],
  TE: [{ key: 'tgt', label: 'TGT' }, { key: 'rec', label: 'REC' }, { key: 'yds', label: 'YDS' }, { key: 'td', label: 'TD' }],
  K: [{ key: 'fg', label: 'FG' }, { key: 'fga', label: 'FGA' }, { key: 'xp', label: 'XP' }],
  DEF: [],
};

export default function PlayerStats({ playerId, onBack }) {
  const player = PLAYER_MAP[playerId];

  const nflTeam = useMemo(
    () => player ? NFL_TEAMS.find(t => t.id === player.team.toLowerCase()) : null,
    [player]
  );

  const gameLog = useMemo(() => player ? generateGameLog(player) : [], [player]);
  const seasonStats = useMemo(() => getSeasonStats(gameLog, player?.pos), [gameLog, player?.pos]);

  const totalFpts = useMemo(() => gameLog.reduce((s, g) => s + g.fpts, 0), [gameLog]);
  const ppg = gameLog.length > 0 ? (totalFpts / gameLog.length).toFixed(1) : '0.0';

  // Position rank among all players at same position
  const posRank = useMemo(() => {
    if (!player) return '-';
    const samePos = PLAYERS.filter(p => p.pos === player.pos).sort((a, b) => b.proj - a.proj);
    const idx = samePos.findIndex(p => p.id === player.id);
    return idx >= 0 ? `${player.pos}${idx + 1}` : '-';
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

  function getTileValue(label) {
    switch (label) {
      case 'PTS': return totalFpts.toFixed(1);
      case 'PPG': return ppg;
      case 'YDS': return (seasonStats.yds || seasonStats.rushYds || 0).toLocaleString();
      case 'TD': return seasonStats.td || seasonStats.rushTd || 0;
      case 'INT': return seasonStats.int || 0;
      case 'CMP%': return seasonStats.att > 0 ? `${Math.round((seasonStats.cmp / seasonStats.att) * 100)}%` : '-';
      case 'RUSH': return seasonStats.car || 0;
      case 'REC': return seasonStats.rec || 0;
      case 'TGT': return seasonStats.tgt || 0;
      case 'FG': return seasonStats.fg || 0;
      case 'FG%': return seasonStats.fga > 0 ? `${Math.round((seasonStats.fg / seasonStats.fga) * 100)}%` : '-';
      case 'XP': return seasonStats.xp || 0;
      default: return '-';
    }
  }

  const tiles = STAT_TILES[player.pos] || STAT_TILES.DEF;
  const logCols = LOG_COLS[player.pos] || [];

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} className="ff-back-btn" style={{ marginBottom: 12 }}>&larr; Back</button>

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
              }}>{posRank}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <PosBadge pos={player.pos} />
              <span style={{ fontWeight: 600 }}>{player.team}</span>
              {nflTeam && <span>&middot; {nflTeam.name}</span>}
              <StatusLabel status={player.status} />
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

      {/* Season Stat Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles.length}, 1fr)`, gap: 8, marginBottom: 16 }}>
        {tiles.map(label => (
          <div key={label} className="ff-card" style={{ textAlign: 'center', padding: '14px 8px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }} className="tabular-nums">{getTileValue(label)}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4, letterSpacing: '0.04em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* HexStats Placeholder */}
      <div className="ff-card" style={{ marginBottom: 16 }}>
        <div style={{ height: 4, background: 'var(--accent)' }} />
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>HexStats</h2>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Proprietary</span>
        </div>
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, margin: '0 auto 16px',
            background: 'var(--accent-10)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: 'var(--accent)',
          }}>H</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Advanced Analytics Coming Soon</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
            Proprietary HexMetrics player analysis including consistency rating, ceiling/floor projections, matchup-proof score, and efficiency metrics.
          </div>
        </div>
      </div>

      {/* Game Log */}
      {logCols.length > 0 && (
        <div className="ff-card">
          <div style={{ height: 4, background: 'var(--charcoal-slate, #334155)' }} />
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Game Log</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>2025 Season</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>WK</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>OPP</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>RESULT</th>
                  {logCols.map(c => (
                    <th key={c.key} style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{c.label}</th>
                  ))}
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>FPTS</th>
                </tr>
              </thead>
              <tbody>
                {gameLog.map((g, i) => {
                  const fptsColor = g.fpts >= player.avg * 1.2 ? 'var(--success-green, #22c55e)' : g.fpts < player.avg * 0.6 ? 'var(--red, #ef4444)' : 'var(--text)';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)', fontSize: 12 }}>{g.week}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12 }}>{g.isHome ? 'vs' : '@'} {g.opp}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12 }}>
                        <span style={{ color: g.result === 'W' ? 'var(--success-green, #22c55e)' : 'var(--red, #ef4444)', fontWeight: 600 }}>{g.result}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{g.score}</span>
                      </td>
                      {logCols.map(c => (
                        <td key={c.key} style={{ padding: '8px 12px', textAlign: 'right' }} className="tabular-nums">{g[c.key] ?? '-'}</td>
                      ))}
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: fptsColor }} className="tabular-nums">{g.fpts}</td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface, var(--bg-alt))' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700, fontSize: 12 }}>TOT</td>
                  <td style={{ padding: '8px 12px' }}></td>
                  <td style={{ padding: '8px 12px' }}></td>
                  {logCols.map(c => (
                    <td key={c.key} style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }} className="tabular-nums">
                      {gameLog.reduce((s, g) => s + (g[c.key] || 0), 0)}
                    </td>
                  ))}
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--accent)' }} className="tabular-nums">{totalFpts.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
