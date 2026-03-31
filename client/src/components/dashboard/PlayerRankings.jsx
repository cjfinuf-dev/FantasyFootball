import { useState, useMemo } from 'react';
import { PLAYERS } from '../../data/players';
import { POS_COLORS } from '../../utils/helpers';
import { getEspnId } from '../../data/espnIds';
import PosBadge from '../ui/PosBadge';
import StatusLabel from '../ui/StatusLabel';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PlayerLink from '../ui/PlayerLink';

export default function PlayerRankings({ onPlayerClick }) {
  const [sortField, setSortField] = useState('pts');
  const [sortDir, setSortDir] = useState('desc');
  const [posFilter, setPosFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

  const handleSort = (field) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    return PLAYERS
      .filter(p => posFilter === 'ALL' || p.pos === posFilter)
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const av = a[sortField], bv = b[sortField];
        if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortDir === 'asc' ? av - bv : bv - av;
      });
  }, [sortField, sortDir, posFilter, search]);

  const SortArrow = ({ field }) => {
    if (field !== sortField) return null;
    return <span className="sort-arrow">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
  };

  return (
    <div className="ff-card">
      <div className="ff-card-top-accent" style={{ background: 'var(--brand-tan)' }} />
      <div className="ff-card-header">
        <h2>Player Rankings</h2>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} players</span>
      </div>
      <div className="ff-tabs">
        {positions.map(pos => (
          <button key={pos} className={`ff-tab ${posFilter === pos ? 'active' : ''}`} onClick={() => setPosFilter(pos)}
            style={posFilter === pos && pos !== 'ALL' ? { borderBottomColor: `var(${POS_COLORS[pos]})`, color: `var(${POS_COLORS[pos]})` } : {}}>
            {pos}
          </button>
        ))}
      </div>
      <div style={{ padding: '12px 20px 0' }}>
        <input className="ff-search-input" type="text" placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="ff-card-body" style={{ padding: '12px 0 0' }}>
        <div className="ff-table-wrap">
          <table className="ff-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th onClick={() => handleSort('name')} className={sortField === 'name' ? 'sort-active' : ''}>Player <SortArrow field="name" /></th>
                <th style={{ width: 56 }}>POS</th>
                <th style={{ width: 64 }} onClick={() => handleSort('pts')} className={sortField === 'pts' ? 'sort-active' : ''}>PTS <SortArrow field="pts" /></th>
                <th style={{ width: 64 }} onClick={() => handleSort('proj')} className={sortField === 'proj' ? 'sort-active' : ''}>PROJ <SortArrow field="proj" /></th>
                <th style={{ width: 64 }} onClick={() => handleSort('avg')} className={sortField === 'avg' ? 'sort-active' : ''}>AVG <SortArrow field="avg" /></th>
                <th style={{ width: 64 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <PlayerHeadshot espnId={getEspnId(p.name)} name={p.name} size="xs" pos={p.pos} team={p.team} />
                      <div>
                        <PlayerLink name={p.name} playerId={p.id} onPlayerClick={onPlayerClick} />
                        <span className="player-team">{p.team}</span>
                      </div>
                    </div>
                  </td>
                  <td><PosBadge pos={p.pos} /></td>
                  <td style={{ fontWeight: 600 }} className="tabular-nums">{p.pts}</td>
                  <td style={{ color: 'var(--text-muted)' }} className="tabular-nums">{p.proj}</td>
                  <td style={{ color: 'var(--text-muted)' }} className="tabular-nums">{p.avg}</td>
                  <td><StatusLabel status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
