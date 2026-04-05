import { useState, useMemo } from 'react';
import { PLAYERS } from '../../data/players';
import { getEspnId } from '../../data/espnIds';
import { getHexScore, getHexTier, formatHex } from '../../utils/hexScore';
import PosBadge from '../ui/PosBadge';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PlayerLink from '../ui/PlayerLink';

const TIER_LABELS = {
  'hex-elite': 'Elite',
  'hex-starter-plus': 'Starter+',
  'hex-starter': 'Starter-caliber',
  'hex-flex': 'Flex-caliber',
  'hex-bench': 'Bench depth',
  'hex-depth': 'Deep depth',
  'hex-waiver': 'Speculative',
};

export default function WaiverWireCard({ expanded = false, rosters, onPlayerClick, onClaimPlayer }) {
  const [posFilter, setPosFilter] = useState('ALL');
  const hasDraftData = rosters && Object.values(rosters).some(r => r.length > 0);

  const waiverPlayers = useMemo(() => {
    if (!hasDraftData) {
      // Pre-draft: show top available players by HexScore (no roster filter)
      let list = [...PLAYERS];
      if (!expanded) list = list.filter(p => p.pos !== 'K' && p.pos !== 'DEF');
      if (expanded && posFilter !== 'ALL') list = list.filter(p => p.pos === posFilter);
      return list
        .sort((a, b) => getHexScore(b.id) - getHexScore(a.id))
        .slice(0, expanded ? 25 : 5)
        .map(p => {
          const hex = getHexScore(p.id);
          const tier = getHexTier(hex);
          return {
            playerId: p.id, name: p.name, team: p.team, pos: p.pos,
            hexScore: hex, tier,
            trend: p.proj > p.avg ? 'up' : 'down',
            trendPct: Math.abs(Math.round(((p.proj - p.avg) / (p.avg || 1)) * 100)),
            reason: tier.tier + ' tier',
            isDynamic: true,
          };
        });
    }

    const draftedSet = new Set();
    Object.values(rosters).forEach(playerIds => {
      playerIds.forEach(pid => draftedSet.add(pid));
    });

    let list = PLAYERS.filter(p => !draftedSet.has(p.id));

    // In compact mode, skip K/DEF (easily replaceable)
    if (!expanded) list = list.filter(p => p.pos !== 'K' && p.pos !== 'DEF');

    // Apply position filter when expanded
    if (expanded && posFilter !== 'ALL') list = list.filter(p => p.pos === posFilter);

    return list
      .sort((a, b) => getHexScore(b.id) - getHexScore(a.id))
      .slice(0, expanded ? 25 : 5)
      .map(p => {
        const hex = getHexScore(p.id);
        const tier = getHexTier(hex);
        return {
          playerId: p.id,
          name: p.name,
          team: p.team,
          pos: p.pos,
          hexScore: hex,
          tier,
          trend: p.proj > p.avg ? 'up' : 'down',
          trendPct: Math.abs(Math.round(((p.proj - p.avg) / (p.avg || 1)) * 100)),
          reason: p.status !== 'healthy'
            ? `Status: ${p.status}`
            : TIER_LABELS[tier.cssClass] || `${p.avg} pts/g`,
          isDynamic: true,
        };
      });
  }, [rosters, expanded, posFilter, hasDraftData]);

  return (
    <div className={`ff-sidebar-card${expanded ? ' expanded' : ''}`}>
      <div className="ff-sidebar-card-header">
        <h3>{hasDraftData ? 'Free Agents' : 'Top Available'}</h3>
        <span className="ff-badge-count">{waiverPlayers.length}</span>
      </div>

      {/* Position filters (expanded only) */}
      {expanded && hasDraftData && (
        <div style={{ padding: '0 12px 8px', display: 'flex', gap: 4 }}>
          {['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map(pos => (
            <button key={pos}
              className={`ff-tm-filter-pill${posFilter === pos ? ' active' : ''}`}
              onClick={() => setPosFilter(pos)}>
              {pos}
            </button>
          ))}
        </div>
      )}

      <div className="ff-sidebar-card-body">
        {waiverPlayers.map(w => (
          <div className="ff-waiver-row" key={w.playerId}>
            <PlayerHeadshot espnId={getEspnId(w.name)} name={w.name} size="xs" pos={w.pos} team={w.team} />
            <div className="ff-waiver-info">
              <div className="ff-waiver-name">
                <PlayerLink name={w.name} playerId={w.playerId} onPlayerClick={onPlayerClick} /> <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.team}</span>
                <PosBadge pos={w.pos} />
                <span className={`ff-trend ${w.trend}`}>{w.trend === 'up' ? '\u25B2' : '\u25BC'} {w.trendPct}%</span>
              </div>
              <div className="ff-waiver-detail">{w.reason}</div>
            </div>
            <div className={`ff-waiver-pts tabular-nums ${w.isDynamic ? 'hex-val-' + (w.tier.cssClass === 'hex-starter-plus' ? 'plus' : w.tier.cssClass.replace('hex-', '')) : ''}`}>
              {w.isDynamic ? formatHex(w.hexScore) : w.proj}
            </div>
            {onClaimPlayer && hasDraftData && w.isDynamic && (
              <button className="ff-btn ff-btn-copper ff-btn-sm" onClick={() => onClaimPlayer(w.playerId)}>
                + Add
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
