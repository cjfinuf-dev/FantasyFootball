import { useState, useMemo, useCallback } from 'react';
import { PLAYERS } from '../../data/players';
import { POS_COLORS } from '../../utils/helpers';
import { getEspnId } from '../../data/espnIds';
import { getHexScore, getHexTier, getHistoricalData } from '../../utils/hexScore';
import PosBadge from '../ui/PosBadge';
import StatusLabel from '../ui/StatusLabel';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PlayerLink from '../ui/PlayerLink';

const FILTER_INPUT_STYLE = {
  width: 44, padding: '3px 4px', fontSize: 10, border: '1px solid var(--border)',
  borderRadius: 3, background: 'var(--bg)', color: 'var(--text)', textAlign: 'center',
  outline: 'none', fontFamily: 'monospace',
};

const FILTER_SELECT_STYLE = {
  ...FILTER_INPUT_STYLE, width: 'auto', minWidth: 56, textAlign: 'left', fontFamily: 'inherit',
};

function RangeFilter({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      <input style={FILTER_INPUT_STYLE} type="number" placeholder="Min"
        value={value.min} onChange={e => onChange({ ...value, min: e.target.value })} />
      <input style={FILTER_INPUT_STYLE} type="number" placeholder="Max"
        value={value.max} onChange={e => onChange({ ...value, max: e.target.value })} />
    </div>
  );
}

function passesRange(val, range) {
  if (range.min !== '' && val < Number(range.min)) return false;
  if (range.max !== '' && val > Number(range.max)) return false;
  return true;
}

const EMPTY_RANGE = { min: '', max: '' };

export default function PlayerRankings({ onPlayerClick }) {
  const [sortField, setSortField] = useState('hex');
  const [sortDir, setSortDir] = useState('desc');
  const [posFilter, setPosFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

  const [filters, setFilters] = useState({
    hex: { ...EMPTY_RANGE },
    pts: { ...EMPTY_RANGE },
    proj: { ...EMPTY_RANGE },
    avg: { ...EMPTY_RANGE },
    status: 'ALL',
  });
  const [yearFilters, setYearFilters] = useState({});

  const setFilter = useCallback((key, val) => setFilters(f => ({ ...f, [key]: val })), []);
  const setYearFilter = useCallback((yr, val) => setYearFilters(f => ({ ...f, [yr]: val })), []);

  const hasActiveFilters = useMemo(() => {
    const rangeActive = (r) => r.min !== '' || r.max !== '';
    if (rangeActive(filters.hex) || rangeActive(filters.pts) || rangeActive(filters.proj) || rangeActive(filters.avg)) return true;
    if (filters.status !== 'ALL') return true;
    if (Object.values(yearFilters).some(rangeActive)) return true;
    return false;
  }, [filters, yearFilters]);

  const clearFilters = () => {
    setFilters({ hex: { ...EMPTY_RANGE }, pts: { ...EMPTY_RANGE }, proj: { ...EMPTY_RANGE }, avg: { ...EMPTY_RANGE }, status: 'ALL' });
    setYearFilters({});
  };

  const handleSort = (field) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const historicalData = getHistoricalData();
  const seasons = historicalData?.meta?.seasons?.slice().sort((a, b) => b - a) || [];

  const getPlayerHistory = (playerId) => {
    if (!historicalData?.players) return null;
    return historicalData.players[playerId] || null;
  };

  const filtered = useMemo(() => {
    return PLAYERS
      .filter(p => posFilter === 'ALL' || p.pos === posFilter)
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      .filter(p => {
        if (!showFilters && !hasActiveFilters) return true;
        const hex = getHexScore(p.id);
        if (!passesRange(hex, filters.hex)) return false;
        if (!passesRange(p.pts, filters.pts)) return false;
        if (!passesRange(p.proj, filters.proj)) return false;
        if (!passesRange(p.avg, filters.avg)) return false;
        if (filters.status !== 'ALL' && p.status !== filters.status) return false;
        if (showHistory) {
          const history = historicalData?.players?.[p.id];
          for (const yr of seasons) {
            const yf = yearFilters[String(yr)];
            if (yf && (yf.min !== '' || yf.max !== '')) {
              const val = history?.[String(yr)]?.avgPts ?? 0;
              if (!passesRange(val, yf)) return false;
            }
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'hex') {
          const ah = getHexScore(a.id), bh = getHexScore(b.id);
          return sortDir === 'asc' ? ah - bh : bh - ah;
        }
        if (sortField.startsWith('yr_')) {
          const yr = sortField.slice(3);
          const ah = historicalData?.players?.[a.id]?.[yr]?.avgPts ?? 0;
          const bh = historicalData?.players?.[b.id]?.[yr]?.avgPts ?? 0;
          return sortDir === 'asc' ? ah - bh : bh - ah;
        }
        const av = a[sortField], bv = b[sortField];
        if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortDir === 'asc' ? av - bv : bv - av;
      });
  }, [sortField, sortDir, posFilter, search, filters, yearFilters, showFilters, hasActiveFilters, showHistory, historicalData, seasons]);

  const SortArrow = ({ field }) => {
    if (field !== sortField) return null;
    return <span className="sort-arrow">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
  };

  const hexChipStyle = (score) => {
    const opacity = score >= 85 ? 1.0 : score >= 75 ? 0.9 : score >= 60 ? 0.8 : score >= 45 ? 0.65 : 0.4;
    return { fontWeight: 700, color: `rgba(139, 92, 246, ${opacity})`, fontFamily: 'monospace' };
  };

  const handleExportCSV = () => {
    const headers = ['Rank', 'Player', 'Team', 'POS', 'HEX', 'PTS', 'PROJ', 'AVG'];
    if (showHistory) seasons.forEach(yr => headers.push(`${yr} GP`, `${yr} Total`, `${yr} PPG`));
    headers.push('Status');

    const rows = filtered.map((p, i) => {
      const row = [i + 1, `"${p.name}"`, p.team, p.pos, getHexScore(p.id), p.pts, p.proj, p.avg];
      if (showHistory) {
        const h = getPlayerHistory(p.id);
        seasons.forEach(yr => {
          const s = h?.[String(yr)];
          row.push(s?.gp ?? '', s?.totalPts ?? '', s?.avgPts ?? '');
        });
      }
      row.push(p.status);
      return row.join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hexmetrics-players-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ff-card">
      <div className="ff-card-top-accent" style={{ background: 'var(--brand-tan)' }} />
      <div className="ff-card-header">
        <h2>Player Rankings</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showHistory} onChange={e => setShowHistory(e.target.checked)}
              style={{ width: 14, height: 14, accentColor: 'var(--hex-purple, #8B5CF6)' }} />
            Historical
          </label>
          <button
            className={`ff-btn ff-btn-sm ${showFilters ? 'ff-btn-copper' : 'ff-btn-secondary'}`}
            onClick={() => setShowFilters(f => !f)}
            style={{ fontSize: 11 }}>
            Filters{hasActiveFilters ? ' *' : ''}
          </button>
          <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={handleExportCSV}
            title="Export CSV" style={{ fontSize: 14, padding: '4px 8px', lineHeight: 1 }}>
            {'\u2913'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} players</span>
        </div>
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
        <div className="ff-table-wrap" style={{ maxHeight: showHistory ? 600 : 440 }}>
          <table className="ff-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th onClick={() => handleSort('name')} className={sortField === 'name' ? 'sort-active' : ''}>Player <SortArrow field="name" /></th>
                <th style={{ width: 56 }}>POS</th>
                <th style={{ width: 56 }} onClick={() => handleSort('hex')} className={sortField === 'hex' ? 'sort-active' : ''}>
                  <span style={{ color: 'var(--hex-purple, #8B5CF6)' }}>HEX</span> <SortArrow field="hex" />
                </th>
                <th style={{ width: 56 }} onClick={() => handleSort('pts')} className={sortField === 'pts' ? 'sort-active' : ''}>PTS <SortArrow field="pts" /></th>
                <th style={{ width: 56 }} onClick={() => handleSort('proj')} className={sortField === 'proj' ? 'sort-active' : ''}>PROJ <SortArrow field="proj" /></th>
                <th style={{ width: 56 }} onClick={() => handleSort('avg')} className={sortField === 'avg' ? 'sort-active' : ''}>AVG <SortArrow field="avg" /></th>
                {showHistory && seasons.map(yr => (
                  <th key={yr} style={{ width: 96, textAlign: 'center', fontSize: 10, cursor: 'pointer',
                    color: sortField === `yr_${yr}` ? '#fff' : yr === seasons[0] ? 'var(--accent-text, var(--accent))' : 'var(--text-muted)' }}
                    onClick={() => handleSort(`yr_${yr}`)}
                    className={sortField === `yr_${yr}` ? 'sort-active' : ''}>
                    {yr} PPG <SortArrow field={`yr_${yr}`} />
                  </th>
                ))}
                <th style={{ width: 64 }}>Status</th>
              </tr>
              {showFilters && (
                <tr style={{ background: 'var(--surface, var(--bg-alt))' }}>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th><RangeFilter value={filters.hex} onChange={v => setFilter('hex', v)} /></th>
                  <th><RangeFilter value={filters.pts} onChange={v => setFilter('pts', v)} /></th>
                  <th><RangeFilter value={filters.proj} onChange={v => setFilter('proj', v)} /></th>
                  <th><RangeFilter value={filters.avg} onChange={v => setFilter('avg', v)} /></th>
                  {showHistory && seasons.map(yr => (
                    <th key={yr}>
                      <RangeFilter value={yearFilters[String(yr)] || EMPTY_RANGE} onChange={v => setYearFilter(String(yr), v)} />
                    </th>
                  ))}
                  <th>
                    <select style={FILTER_SELECT_STYLE} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
                      <option value="ALL">All</option>
                      <option value="healthy">Healthy</option>
                      <option value="questionable">Quest.</option>
                      <option value="doubtful">Doubt.</option>
                      <option value="out">Out</option>
                      <option value="ir">IR</option>
                    </select>
                  </th>
                </tr>
              )}
              {showFilters && hasActiveFilters && (
                <tr style={{ background: 'var(--surface, var(--bg-alt))' }}>
                  <th colSpan={7 + (showHistory ? seasons.length : 0) + 1} style={{ textAlign: 'left', padding: '4px 12px' }}>
                    <button onClick={clearFilters}
                      style={{ background: 'none', border: 'none', color: 'var(--red, #ef4444)', fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                      Clear all filters
                    </button>
                    <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                      Showing {filtered.length} of {PLAYERS.filter(p => posFilter === 'ALL' || p.pos === posFilter).length}
                    </span>
                  </th>
                </tr>
              )}
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const hex = getHexScore(p.id);
                const history = getPlayerHistory(p.id);

                return (
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
                    <td className="tabular-nums" style={hexChipStyle(hex)}>{hex}</td>
                    <td style={{ fontWeight: 600 }} className="tabular-nums">{p.pts}</td>
                    <td style={{ color: 'var(--text-muted)' }} className="tabular-nums">{p.proj}</td>
                    <td style={{ color: 'var(--text-muted)' }} className="tabular-nums">{p.avg}</td>
                    {showHistory && seasons.map(yr => {
                      const s = history?.[String(yr)];
                      if (!s) return <td key={yr} style={{ textAlign: 'center', color: 'var(--border)', fontSize: 11 }}>&mdash;</td>;
                      return (
                        <td key={yr} style={{ textAlign: 'center', fontSize: 11, lineHeight: 1.3 }}>
                          <div style={{ fontWeight: 600 }} className="tabular-nums">{s.avgPts}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>{s.gp}g &middot; {s.totalPts}</div>
                        </td>
                      );
                    })}
                    <td><StatusLabel status={p.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {showHistory && historicalData?.meta && (
          <div style={{ padding: '8px 16px', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            {historicalData.meta.scoringFormat.toUpperCase()} scoring &middot; {Object.keys(historicalData.players || {}).length} players &middot; Updated {new Date(historicalData.meta.lastUpdated).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
