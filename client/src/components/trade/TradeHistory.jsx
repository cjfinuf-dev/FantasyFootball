import { useState } from 'react';
import { TEAMS } from '../../data/teams';
import { PLAYERS } from '../../data/players';
import { getHexScore } from '../../utils/hexScore';
import TradePlayerRow from './TradePlayerRow';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

export default function TradeHistory({ history }) {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filters = ['all', 'completed', 'rejected', 'expired'];
  const filtered = filter === 'all' ? history : history.filter(t => t.status === filter);

  if (history.length === 0) {
    return (
      <div className="ff-empty-state">
        <div className="ff-empty-state-title">No trade history</div>
        <div className="ff-empty-state-desc">Completed and rejected trades will appear here.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="ff-tm-filter-bar">
        {filters.map(f => (
          <button key={f} className={`ff-tm-filter-pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          No {filter} trades
        </div>
      ) : (
        filtered.map(trade => {
          const from = TEAMS.find(t => t.id === trade.fromTeamId);
          const to = TEAMS.find(t => t.id === trade.toTeamId);
          const isExpanded = expandedId === trade.id;
          const resolvedDate = trade.resolvedAt ? new Date(trade.resolvedAt).toLocaleDateString() : '';

          return (
            <div key={trade.id} className="ff-tm-history-row">
              <div className="ff-tm-history-header" onClick={() => setExpandedId(isExpanded ? null : trade.id)}>
                <span className={`ff-tm-status-pill ${trade.status}`}>{trade.status}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{from?.abbr} {'\u2194'} {to?.abbr}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{resolvedDate}</span>
                <span className={`ff-tm-history-arrow${isExpanded ? ' open' : ''}`}>{'\u25BC'}</span>
              </div>
              {isExpanded && (
                <div className="ff-tm-history-detail">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 0' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                        {from?.abbr} Sent
                      </div>
                      {trade.offeringPlayerIds.map(id => (
                        <TradePlayerRow key={id} playerId={id} />
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                        {to?.abbr} Sent
                      </div>
                      {trade.requestingPlayerIds.map(id => (
                        <TradePlayerRow key={id} playerId={id} />
                      ))}
                    </div>
                  </div>
                  {trade.message && (
                    <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text-muted)', paddingBottom: 8 }}>
                      "{trade.message}"
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
