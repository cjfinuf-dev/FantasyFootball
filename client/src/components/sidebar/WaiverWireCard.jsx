import { useState, useMemo } from 'react';
import { PLAYERS } from '../../data/players';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
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

// Waiver priority order (inverse of standings)
const WAIVER_ORDER = [...TEAMS].sort((a, b) => a.wins - b.wins || a.pf - b.pf).map(t => t.id);
const USER_WAIVER_POS = WAIVER_ORDER.indexOf(USER_TEAM_ID) + 1;

// Recent transactions (demo data)
const RECENT_TRANSACTIONS = [
  { type: 'claim', team: 't5', player: 'D. Robinson', pos: 'WR', bid: 12, ts: Date.now() - 30 * 3600000 },
  { type: 'drop', team: 't8', player: 'K. Toney', pos: 'WR', ts: Date.now() - 28 * 3600000 },
  { type: 'claim', team: 't3', player: 'J. Tucker', pos: 'K', bid: 3, ts: Date.now() - 20 * 3600000 },
  { type: 'drop', team: 't10', player: 'C. Otton', pos: 'TE', ts: Date.now() - 18 * 3600000 },
];

export default function WaiverWireCard({ expanded = false, rosters, onPlayerClick, onClaimPlayer }) {
  const [posFilter, setPosFilter] = useState('ALL');
  const [bidAmounts, setBidAmounts] = useState({});
  const [faabRemaining, setFaabRemaining] = useState(87); // simulated remaining
  const [showTransactions, setShowTransactions] = useState(false);
  const hasDraftData = rosters && Object.values(rosters).some(r => r.length > 0);

  const waiverPlayers = useMemo(() => {
    if (!hasDraftData) {
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
    Object.values(rosters).forEach(ids => ids.forEach(pid => draftedSet.add(pid)));

    let list = PLAYERS.filter(p => !draftedSet.has(p.id));
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
          reason: p.status !== 'healthy' ? `Status: ${p.status}` : TIER_LABELS[tier.cssClass] || `${p.avg} pts/g`,
          isDynamic: true,
        };
      });
  }, [rosters, expanded, posFilter, hasDraftData]);

  const handleClaim = (playerId) => {
    const bid = bidAmounts[playerId] || 0;
    if (bid > faabRemaining) return;
    setFaabRemaining(prev => prev - bid);
    setBidAmounts(prev => { const next = { ...prev }; delete next[playerId]; return next; });
    onClaimPlayer?.(playerId);
  };

  return (
    <div className={`ff-sidebar-card${expanded ? ' expanded' : ''}`}>
      <div className="ff-sidebar-card-header">
        <h3>{hasDraftData ? 'Free Agents' : 'Top Available'}</h3>
        <span className="ff-badge-count">{waiverPlayers.length}</span>
      </div>

      {/* FAAB & Waiver Status */}
      {hasDraftData && (
        <div style={{ padding: '0 14px 10px', display: 'flex', gap: 12, alignItems: 'center', fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--text-muted)' }}>FAAB:</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: faabRemaining > 30 ? 'var(--success-green)' : faabRemaining > 10 ? 'var(--warning-amber)' : 'var(--red)' }}>
              ${faabRemaining}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--text-muted)' }}>Priority:</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>#{USER_WAIVER_POS}</span>
          </div>
          {expanded && (
            <button
              className={`ff-tm-filter-pill${showTransactions ? ' active' : ''}`}
              style={{ marginLeft: 'auto', fontSize: 10 }}
              onClick={() => setShowTransactions(!showTransactions)}
            >
              Recent
            </button>
          )}
        </div>
      )}

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

      {/* Recent Transactions */}
      {showTransactions && expanded && (
        <div style={{ padding: '0 14px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
            Recent Transactions
          </div>
          {RECENT_TRANSACTIONS.map((tx, i) => {
            const team = TEAMS.find(t => t.id === tx.team);
            const hoursAgo = Math.round((Date.now() - tx.ts) / 3600000);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 11, borderBottom: i < RECENT_TRANSACTIONS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ color: tx.type === 'claim' ? 'var(--success-green)' : 'var(--red)', fontWeight: 700, width: 10 }}>
                  {tx.type === 'claim' ? '+' : '-'}
                </span>
                <span style={{ fontWeight: 600 }}>{tx.player}</span>
                <PosBadge pos={tx.pos} size="xs" />
                <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: 10 }}>
                  {team?.abbr}
                  {tx.bid !== undefined && <span style={{ marginLeft: 4, fontFamily: "'DM Mono', monospace" }}>${tx.bid}</span>}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: "'DM Mono', monospace" }}>{hoursAgo}h</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="ff-sidebar-card-body" style={{ padding: 0 }}>
        {waiverPlayers.length === 0 && (
          <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            No players available{posFilter !== 'ALL' ? ` at ${posFilter}` : ''}.
          </div>
        )}
        {waiverPlayers.map(w => (
          <div className="ff-waiver-row" key={w.playerId}>
            <PlayerHeadshot espnId={getEspnId(w.name)} name={w.name} size="xs" pos={w.pos} team={w.team} />
            <div className="ff-waiver-info">
              <div className="ff-waiver-name">
                <PlayerLink name={w.name} playerId={w.playerId} onPlayerClick={onPlayerClick} /> <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.team}</span>
                <PosBadge pos={w.pos} size="xs" />
                <span className={`ff-trend ${w.trend}`}>{w.trend === 'up' ? '\u25B2' : '\u25BC'} {w.trendPct}%</span>
              </div>
              <div className="ff-waiver-detail">{w.reason}</div>
            </div>
            <div className={`ff-waiver-pts tabular-nums ${w.isDynamic ? 'hex-val-' + (w.tier.cssClass === 'hex-starter-plus' ? 'plus' : w.tier.cssClass.replace('hex-', '')) : ''}`}>
              {w.isDynamic ? formatHex(w.hexScore) : w.proj}
            </div>
            {onClaimPlayer && hasDraftData && w.isDynamic && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  min={0}
                  max={faabRemaining}
                  value={bidAmounts[w.playerId] || ''}
                  placeholder="$"
                  onChange={e => setBidAmounts(prev => ({ ...prev, [w.playerId]: Number(e.target.value) }))}
                  style={{
                    width: 44, padding: '4px 4px', border: '1px solid var(--border)', borderRadius: 4,
                    fontSize: 11, textAlign: 'center', fontFamily: "'DM Mono', monospace",
                    background: 'var(--bg-white)', color: 'var(--text)',
                  }}
                />
                <button className="ff-btn ff-btn-copper ff-btn-sm" onClick={() => handleClaim(w.playerId)}>
                  Bid
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
