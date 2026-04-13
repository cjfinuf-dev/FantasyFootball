import { useState, useMemo, useCallback, useRef } from 'react';
import { PLAYERS } from '../../data/players';
import { getEspnId } from '../../data/espnIds';
import { getHexScore, getHexTier, getHistoricalData, formatHex } from '../../utils/hexScore';
import Sparkline from '../ui/Sparkline';
import PosBadge from '../ui/PosBadge';
import StatusLabel from '../ui/StatusLabel';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PlayerLink from '../ui/PlayerLink';

function RangeFilter({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      <input className="ff-filter-input" type="number" placeholder="Min" aria-label="Minimum"
        value={value.min} onChange={e => onChange({ ...value, min: e.target.value })} />
      <input className="ff-filter-input" type="number" placeholder="Max" aria-label="Maximum"
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

// Position-specific stat columns (shown when a position filter is active)
const POS_STAT_COLUMNS = {
  QB: [
    { key: 'gp', label: 'GP', w: 40 },
    { key: 'cmp', label: 'CMP', w: 48 },
    { key: 'att', label: 'ATT', w: 48 },
    { key: 'passYds', label: 'YDS', w: 52 },
    { key: 'passTd', label: 'TD', w: 40 },
    { key: 'int', label: 'INT', w: 40 },
    { key: 'sacks', label: 'SCK', w: 40 },
    { key: 'passEpa', label: 'EPA', w: 52 },
    { key: 'cpoe', label: 'CPOE', w: 52 },
    { key: 'rushYds', label: 'RYDS', w: 52 },
    { key: 'rushTd', label: 'RTD', w: 40 },
  ],
  RB: [
    { key: 'gp', label: 'GP', w: 40 },
    { key: 'carries', label: 'CAR', w: 48 },
    { key: 'rushYds', label: 'RYDS', w: 52 },
    { key: 'rushTd', label: 'RTD', w: 40 },
    { key: 'rushEpa', label: 'REPA', w: 52 },
    { key: 'rec', label: 'REC', w: 44 },
    { key: 'tgt', label: 'TGT', w: 44 },
    { key: 'recYds', label: 'RCYD', w: 52 },
    { key: 'recTd', label: 'RCTD', w: 44 },
    { key: 'tgtShare', label: 'TGT%', w: 48, fmt: v => v ? (v * 100).toFixed(1) + '%' : '—' },
    { key: 'fumLost', label: 'FL', w: 36 },
  ],
  WR: [
    { key: 'gp', label: 'GP', w: 40 },
    { key: 'rec', label: 'REC', w: 48 },
    { key: 'tgt', label: 'TGT', w: 48 },
    { key: 'recYds', label: 'YDS', w: 52 },
    { key: 'recTd', label: 'TD', w: 40 },
    { key: 'recEpa', label: 'EPA', w: 52 },
    { key: 'tgtShare', label: 'TGT%', w: 48, fmt: v => v ? (v * 100).toFixed(1) + '%' : '—' },
    { key: 'airShare', label: 'AIR%', w: 48, fmt: v => v ? (v * 100).toFixed(1) + '%' : '—' },
    { key: 'wopr', label: 'WOPR', w: 52 },
    { key: 'racr', label: 'RACR', w: 52 },
    { key: 'yac', label: 'YAC', w: 48 },
  ],
  TE: [
    { key: 'gp', label: 'GP', w: 40 },
    { key: 'rec', label: 'REC', w: 48 },
    { key: 'tgt', label: 'TGT', w: 48 },
    { key: 'recYds', label: 'YDS', w: 52 },
    { key: 'recTd', label: 'TD', w: 40 },
    { key: 'recEpa', label: 'EPA', w: 52 },
    { key: 'tgtShare', label: 'TGT%', w: 48, fmt: v => v ? (v * 100).toFixed(1) + '%' : '—' },
    { key: 'racr', label: 'RACR', w: 52 },
    { key: 'yac', label: 'YAC', w: 48 },
  ],
  K: [
    { key: 'gp', label: 'GP', w: 40 },
    { key: 'fgm', label: 'FGM', w: 44 },
    { key: 'fga', label: 'FGA', w: 44 },
    { key: 'fgPct', label: 'FG%', w: 48, fmt: v => v ? (v * 100).toFixed(0) + '%' : '—' },
    { key: 'fgLong', label: 'LNG', w: 44 },
    { key: 'fg50', label: '50+', w: 44 },
    { key: 'patm', label: 'PAT', w: 44 },
    { key: 'pata', label: 'PATA', w: 44 },
    { key: 'patPct', label: 'PAT%', w: 48, fmt: v => v ? (v * 100).toFixed(0) + '%' : '—' },
  ],
};

export default function PlayerRankings({ onPlayerClick }) {
  const [sortField, setSortField] = useState('hex');
  const [sortDir, setSortDir] = useState('desc');
  const [posFilter, setPosFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [rowLimit, setRowLimit] = useState(50);
  const [detailView, setDetailView] = useState(false);
  const [tableScrolled, setTableScrolled] = useState(false);
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const [csvToast, setCsvToast] = useState(false);
  const tableWrapRef = useRef(null);

  const handleTableScroll = useCallback((e) => {
    setTableScrolled(e.target.scrollLeft > 8);
    setScrolledEnd(e.target.scrollLeft + e.target.clientWidth >= e.target.scrollWidth - 4);
  }, []);

  // Detail view forces history on and max rows
  const effectiveShowHistory = detailView || showHistory;
  const effectiveRowLimit = detailView ? 260 : rowLimit;
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

  // Get active stat columns for the current position filter
  const statColumns = posFilter !== 'ALL' && POS_STAT_COLUMNS[posFilter] ? POS_STAT_COLUMNS[posFilter] : [];

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
        if (effectiveShowHistory) {
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
        const av = a[sortField] ?? 0, bv = b[sortField] ?? 0;
        if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortDir === 'asc' ? av - bv : bv - av;
      });
  }, [sortField, sortDir, posFilter, search, filters, yearFilters, showFilters, hasActiveFilters, effectiveShowHistory, historicalData, seasons]);

  const SortArrow = ({ field }) => {
    if (field !== sortField) return null;
    return <span className="sort-arrow">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
  };

  // Color scale instead of opacity — maintains WCAG contrast at all tiers
  const hexChipStyle = (score) => {
    const color = score >= 85 ? 'var(--hex-purple-hot)' : score >= 75 ? 'var(--hex-purple-vivid)' : score >= 60 ? 'var(--hex-purple)' : score >= 45 ? 'rgba(139,92,246,0.7)' : 'var(--text-muted)';
    const shadow = score >= 85 ? 'var(--hex-purple-glow)' : score >= 75 ? '0 0 4px rgba(139,92,246,0.25)' : 'none';
    return { fontWeight: 700, color, textShadow: shadow, fontFamily: 'monospace' };
  };

  const handleExportCSV = () => {
    const headers = ['Rank', 'Player', 'Team', 'POS', 'HEX', 'PTS', 'PROJ', 'AVG'];
    statColumns.forEach(col => headers.push(col.label));
    if (effectiveShowHistory) seasons.forEach(yr => headers.push(`${yr} GP`, `${yr} Total`, `${yr} PPG`));
    headers.push('Status');

    const rows = filtered.map((p, i) => {
      const row = [i + 1, `"${p.name}"`, p.team, p.pos, getHexScore(p.id), p.pts, p.proj, p.avg];
      statColumns.forEach(col => row.push(p[col.key] ?? ''));
      if (effectiveShowHistory) {
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
    setCsvToast(true);
    setTimeout(() => setCsvToast(false), 2000);
  };

  return (
    <div className="ff-card" style={detailView ? { maxWidth: 'none' } : undefined}>
      <div className="ff-card-top-accent" style={{ background: 'var(--brand-tan)' }} />

      {/* Row 1: Title + View Toggle + Count */}
      <div className="ff-card-header">
        <h2>Player Rankings</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button onClick={() => setDetailView(false)}
              style={{
                padding: '4px 12px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: !detailView ? 'var(--accent)' : 'var(--surface)',
                color: !detailView ? 'var(--on-accent)' : 'var(--text-muted)',
              }}>
              Card
            </button>
            <button onClick={() => setDetailView(true)}
              style={{
                padding: '4px 12px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                borderLeft: '1px solid var(--border)',
                background: detailView ? 'var(--accent)' : 'var(--surface)',
                color: detailView ? 'var(--on-accent)' : 'var(--text-muted)',
              }}>
              Detail
            </button>
          </div>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {Math.min(filtered.length, effectiveRowLimit)} of {filtered.length}
          </span>
        </div>
      </div>

      {/* Row 2: Position pills (left) + Tools (right) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', gap: 8, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {positions.map(pos => (
            <button key={pos}
              className={`ff-tm-filter-pill${posFilter === pos ? ' active' : ''}`}
              onClick={() => setPosFilter(pos)}
              data-pos={pos !== 'ALL' ? pos : undefined}>
              {pos}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!detailView && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={showHistory} onChange={e => setShowHistory(e.target.checked)}
                style={{ width: 12, height: 12, accentColor: 'var(--hex-purple)' }} />
              History
            </label>
          )}
          <button
            className={`ff-tm-filter-pill${showFilters ? ' active' : ''}`}
            onClick={() => setShowFilters(f => !f)}>
            Filters{hasActiveFilters ? ' *' : ''}
          </button>
          {!detailView && (
            <button
              className={`ff-tm-filter-pill${rowLimit > 50 ? ' active' : ''}`}
              onClick={() => setRowLimit(prev => prev > 50 ? 50 : 100)}>
              Top {rowLimit > 50 ? '100' : '50'}
            </button>
          )}
          <button className="ff-tm-filter-pill" onClick={handleExportCSV} title="Export CSV" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v8M4 7l4 4 4-4M2 13h12"/>
            </svg>
            CSV
          </button>
          <input className="ff-search-input ff-search-input-expand" type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 14, padding: '5px 8px' }} />
        </div>
      </div>
      {/* HexScore tier legend */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '4px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', fontSize: 12, color: 'var(--text-muted)',
        flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 1,
      }}>
        <span style={{ fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>HEX</span>
        {[
          { label: '85+ Elite', color: 'var(--hex-purple-hot)' },
          { label: '75+ Great', color: 'var(--hex-purple-vivid)' },
          { label: '60+ Good', color: 'var(--hex-purple)' },
          { label: '45+ Avg', color: 'rgba(139,92,246,0.7)' },
          { label: 'Below', color: 'var(--text-muted)' },
        ].map(({ label, color }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>
      <div className="ff-card-body" style={{ padding: detailView ? '4px 0 0' : '12px 0 0' }}>
        <div className={detailView ? '' : `ff-table-fade ff-table-scroll-hint${tableScrolled ? ' scrolled-right' : ''}${scrolledEnd ? ' scrolled-end' : ''}`} style={detailView ? { fontSize: 14 } : { position: 'relative' }}>
        <div className="ff-table-wrap" ref={tableWrapRef} onScroll={handleTableScroll} style={{ maxHeight: detailView ? 'none' : `min(calc(100vh - var(--player-table-offset)), ${effectiveRowLimit > 50 ? 800 : (effectiveShowHistory ? 600 : 440)}px)` }}>
          <table className="ff-table" style={detailView ? { fontSize: 14 } : undefined}>
            <thead>
              {/* Grouping header — shown when stat columns or history are on */}
              {(statColumns.length > 0 || effectiveShowHistory) && (
                <tr>
                  <th colSpan={4} style={{
                    textAlign: 'left', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: 'var(--text-muted)',
                    background: 'var(--surface)', borderBottom: '2px solid var(--border)',
                  }}>
                    Player
                  </th>
                  <th colSpan={4} style={{
                    textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: 'var(--text-muted)',
                    background: 'var(--surface)', borderBottom: '2px solid var(--border)',
                    borderLeft: '2px solid var(--border-strong)',
                  }}>
                    Fantasy
                  </th>
                  {statColumns.length > 0 && (
                    <th colSpan={statColumns.length} style={{
                      textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', color: 'var(--accent-text)',
                      background: 'var(--accent-10)', borderBottom: '2px solid var(--accent)',
                      borderLeft: '2px solid var(--border-strong)',
                    }}>
                      {posFilter} Stats
                    </th>
                  )}
                  {effectiveShowHistory && seasons.map((yr, i) => (
                    <th key={`grp_${yr}`} colSpan={3} style={{
                      textAlign: 'center', fontSize: 14, fontWeight: i === 0 ? 700 : 600, letterSpacing: '0.04em',
                      color: i === 0 ? 'var(--accent-text)' : 'var(--text-muted)',
                      background: i === 0 ? 'var(--accent-10)' : 'var(--surface)',
                      borderLeft: '2px solid var(--border-strong)',
                      borderBottom: i === 0 ? '2px solid var(--accent)' : '2px solid var(--border)',
                    }}>
                      {yr}
                    </th>
                  ))}
                </tr>
              )}
              {/* Sort headers */}
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th onClick={() => handleSort('name')} className={sortField === 'name' ? 'sort-active' : ''}>Player <SortArrow field="name" /></th>
                <th style={{ width: 48 }}>POS</th>
                <th style={{ width: 48 }} onClick={() => handleSort('status')} className={sortField === 'status' ? 'sort-active' : ''}>STS <SortArrow field="status" /></th>
                <th style={{ width: 60, borderLeft: (statColumns.length > 0 || effectiveShowHistory) ? '2px solid var(--border-strong)' : undefined }} onClick={() => handleSort('hex')} className={sortField === 'hex' ? 'sort-active' : ''}>
                  <span style={{ color: 'var(--hex-purple, #8B5CF6)' }}>HEX</span> <SortArrow field="hex" />
                </th>
                <th style={{ width: 60 }} onClick={() => handleSort('pts')} className={sortField === 'pts' ? 'sort-active' : ''}>PTS <SortArrow field="pts" /></th>
                <th style={{ width: 60 }} onClick={() => handleSort('proj')} className={sortField === 'proj' ? 'sort-active' : ''}>PROJ <SortArrow field="proj" /></th>
                <th style={{ width: 60 }} onClick={() => handleSort('avg')} className={sortField === 'avg' ? 'sort-active' : ''}>AVG <SortArrow field="avg" /></th>
                {statColumns.map((col, ci) => (
                  <th key={col.key} style={{ width: col.w, textAlign: 'right', cursor: 'pointer', borderLeft: ci === 0 ? '2px solid var(--border-strong)' : undefined }}
                    onClick={() => handleSort(col.key)}
                    className={sortField === col.key ? 'sort-active' : ''}>
                    {col.label} <SortArrow field={col.key} />
                  </th>
                ))}
                {!detailView && statColumns.length === 0 && !effectiveShowHistory && <th style={{ width: 60 }}>Trend</th>}
                {effectiveShowHistory && seasons.map((yr, i) => {
                  const yrColor = sortField === `yr_${yr}` ? '#fff' : 'var(--text-muted)';
                  const borderLeft = '2px solid var(--border-strong)';
                  return [
                    <th key={`${yr}_gp`} style={{ width: 40, textAlign: 'center', color: yrColor, borderLeft }}>GP</th>,
                    <th key={`${yr}_tot`} style={{ width: 52, textAlign: 'right', color: yrColor }}>Total</th>,
                    <th key={`${yr}_ppg`} style={{ width: 52, textAlign: 'right', cursor: 'pointer', color: yrColor }}
                      onClick={() => handleSort(`yr_${yr}`)}
                      className={sortField === `yr_${yr}` ? 'sort-active' : ''}>
                      PPG <SortArrow field={`yr_${yr}`} />
                    </th>,
                  ];
                })}
              </tr>
              {showFilters && (
                <tr style={{ background: 'var(--surface, var(--bg-alt))' }}>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th style={{ borderLeft: effectiveShowHistory ? '2px solid var(--border-strong)' : undefined }}><RangeFilter value={filters.hex} onChange={v => setFilter('hex', v)} /></th>
                  <th><RangeFilter value={filters.pts} onChange={v => setFilter('pts', v)} /></th>
                  <th><RangeFilter value={filters.proj} onChange={v => setFilter('proj', v)} /></th>
                  <th><RangeFilter value={filters.avg} onChange={v => setFilter('avg', v)} /></th>
                  {statColumns.map((col, ci) => (
                    <th key={`sf_${col.key}`} style={{ borderLeft: ci === 0 ? '2px solid var(--border-strong)' : undefined }}></th>
                  ))}
                  {effectiveShowHistory && seasons.map(yr => [
                    <th key={`${yr}_gp_f`} style={{ borderLeft: '2px solid var(--border-strong)' }}></th>,
                    <th key={`${yr}_tot_f`}></th>,
                    <th key={`${yr}_ppg_f`}>
                      <RangeFilter value={yearFilters[String(yr)] || EMPTY_RANGE} onChange={v => setYearFilter(String(yr), v)} />
                    </th>,
                  ])}
                </tr>
              )}
              {showFilters && hasActiveFilters && (
                <tr style={{ background: 'var(--surface, var(--bg-alt))' }}>
                  <th colSpan={8 + statColumns.length + (effectiveShowHistory ? seasons.length * 3 : 0)} style={{ textAlign: 'left', padding: '4px 12px' }}>
                    <button onClick={clearFilters}
                      style={{ background: 'none', border: 'none', color: 'var(--red, #ef4444)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}>
                      Clear all filters
                    </button>
                    <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                      Showing {filtered.length} of {PLAYERS.filter(p => posFilter === 'ALL' || p.pos === posFilter).length}
                    </span>
                  </th>
                </tr>
              )}
            </thead>
            <tbody>
              {filtered.slice(0, effectiveRowLimit).map((p, i) => {
                const hex = getHexScore(p.id);
                const history = getPlayerHistory(p.id);

                return (
                  <tr key={p.id}>
                    <td className="text-muted-sm" style={{ fontWeight: 600 }}>{i + 1}</td>
                    <td>
                      {detailView ? (
                        <span>
                          <PlayerLink name={p.name} playerId={p.id} onPlayerClick={onPlayerClick} />
                          <span className="player-team">{p.team}</span>
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <PlayerHeadshot espnId={getEspnId(p.name)} name={p.name} size="tiny" pos={p.pos} team={p.team} />
                          <div>
                            <PlayerLink name={p.name} playerId={p.id} onPlayerClick={onPlayerClick} />
                            <span className="player-team">{p.team}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td><PosBadge pos={p.pos} /></td>
                    <td><StatusLabel status={p.status} /></td>
                    <td className="tabular-nums" style={{ ...hexChipStyle(hex), borderLeft: (statColumns.length > 0 || effectiveShowHistory) ? '2px solid var(--border-strong)' : undefined }}>{formatHex(hex)}</td>
                    <td className="tabular-nums text-muted-sm">{p.pts}</td>
                    <td className="tabular-nums text-muted-sm">{p.proj}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text)' }} className="tabular-nums">{p.avg}</td>
                    {statColumns.map((col, ci) => {
                      const val = p[col.key];
                      const display = col.fmt ? col.fmt(val) : (val ?? '—');
                      return (
                        <td key={col.key} className="tabular-nums" style={{
                          textAlign: 'right',
                          color: val != null ? 'var(--text)' : 'var(--border)',
                          fontWeight: val != null ? 500 : 400,
                          borderLeft: ci === 0 ? '2px solid var(--border-strong)' : undefined,
                        }}>
                          {display}
                        </td>
                      );
                    })}
                    {!detailView && statColumns.length === 0 && !effectiveShowHistory && <td>{(() => {
                      const seed = parseInt(p.id.slice(1)) || 1;
                      const base = p.avg || p.proj || 10;
                      const weeks = Array.from({ length: 5 }, (_, w) => {
                        const noise = Math.sin(seed * 7 + w * 13) * 0.3;
                        return Math.max(0, base * (0.8 + noise + w * 0.05));
                      });
                      return <Sparkline data={weeks} />;
                    })()}</td>}
                    {effectiveShowHistory && seasons.map(yr => {
                      const s = history?.[String(yr)];
                      const yearBorder = { borderLeft: '2px solid var(--border-strong)' };
                      if (!s) return [
                        <td key={`${yr}_gp`} style={{ textAlign: 'center', color: 'var(--border)', ...yearBorder }}>&mdash;</td>,
                        <td key={`${yr}_tot`} style={{ textAlign: 'right', color: 'var(--border)' }}>&mdash;</td>,
                        <td key={`${yr}_ppg`} style={{ textAlign: 'right', color: 'var(--border)' }}>&mdash;</td>,
                      ];
                      return [
                        <td key={`${yr}_gp`} style={{ textAlign: 'center', color: 'var(--text-muted)', ...yearBorder }} className="tabular-nums">{s.gp}</td>,
                        <td key={`${yr}_tot`} style={{ textAlign: 'right', color: 'var(--text-muted)' }} className="tabular-nums">{s.totalPts}</td>,
                        <td key={`${yr}_ppg`} style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }} className="tabular-nums">{s.avgPts}</td>,
                      ];
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
        {effectiveShowHistory && historicalData?.meta && (
          <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            {historicalData.meta.scoringFormat.toUpperCase()} scoring &middot; {Object.keys(historicalData.players || {}).length} players &middot; Updated {new Date(historicalData.meta.lastUpdated).toLocaleDateString()}
          </div>
        )}
      </div>
      {csvToast && (
        <div className="ff-draft-toast" style={{ animation: 'toastUp 0.3s ease-out' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--success-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8l4 4 8-8"/></svg>
          CSV downloaded
        </div>
      )}
    </div>
  );
}
