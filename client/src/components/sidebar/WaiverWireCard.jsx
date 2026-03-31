import { useMemo } from 'react';
import { WAIVERS } from '../../data/waivers';
import { PLAYERS } from '../../data/players';
import { getEspnId } from '../../data/espnIds';
import PosBadge from '../ui/PosBadge';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PlayerLink from '../ui/PlayerLink';

export default function WaiverWireCard({ expanded = false, rosters, onPlayerClick }) {
  const waiverPlayers = useMemo(() => {
    if (!rosters || !Object.values(rosters).some(r => r.length > 0)) {
      // No draft data — show hardcoded waivers
      return WAIVERS.map(w => ({ ...w, isDynamic: false }));
    }

    // Draft completed — show top undrafted players
    const draftedSet = new Set();
    Object.values(rosters).forEach(playerIds => {
      playerIds.forEach(pid => draftedSet.add(pid));
    });

    return PLAYERS
      .filter(p => !draftedSet.has(p.id) && p.pos !== 'DEF')
      .sort((a, b) => b.proj - a.proj)
      .slice(0, expanded ? 15 : 5)
      .map(p => ({
        playerId: p.id,
        name: p.name,
        team: p.team,
        pos: p.pos,
        proj: p.proj,
        trend: p.proj > p.avg ? 'up' : 'down',
        trendPct: Math.abs(Math.round(((p.proj - p.avg) / (p.avg || 1)) * 100)),
        reason: p.status !== 'healthy' ? `Status: ${p.status}` : `Avg: ${p.avg} pts`,
        isDynamic: true,
      }));
  }, [rosters, expanded]);

  const hasDraftData = rosters && Object.values(rosters).some(r => r.length > 0);

  return (
    <div className={`ff-sidebar-card${expanded ? ' expanded' : ''}`}>
      <div className="ff-sidebar-card-header">
        <h3>{hasDraftData ? 'Free Agents' : 'Top Available'}</h3>
        <span className="ff-badge-count">{waiverPlayers.length}</span>
      </div>
      <div className="ff-sidebar-card-body">
        {waiverPlayers.map(w => (
          <div className="ff-waiver-row" key={w.playerId}>
            <PlayerHeadshot espnId={getEspnId(w.name)} name={w.name} size="xs" pos={w.pos} team={w.team} />
            <div className="ff-waiver-info">
              <div className="ff-waiver-name">
                <PlayerLink name={w.name} playerId={w.playerId} onPlayerClick={onPlayerClick} /> <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.team}</span>
                <PosBadge pos={w.pos} />
              </div>
              <div className="ff-waiver-detail">{w.reason}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <div className="ff-waiver-pts tabular-nums">{w.proj}</div>
              <span className={`ff-trend ${w.trend}`}>{w.trend === 'up' ? '\u25B2' : '\u25BC'} {w.trendPct}%</span>
            </div>
            <button className="ff-btn ff-btn-copper ff-btn-sm">+ Add</button>
          </div>
        ))}
      </div>
    </div>
  );
}
