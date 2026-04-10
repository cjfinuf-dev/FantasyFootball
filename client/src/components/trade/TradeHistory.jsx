import { useState } from 'react';
import { TEAMS } from '../../data/teams';
import { PLAYERS } from '../../data/players';
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
        <div style={{ padding: 24, textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
          No {filter} trades
        </div>
      ) : (
        filtered.map(trade => {
          const from = TEAMS.find(t => t.id === trade.fromTeamId);
          const to = TEAMS.find(t => t.id === trade.toTeamId);
          const isExpanded = expandedId === trade.id;
          const resolvedDate = trade.resolvedAt ? new Date(trade.resolvedAt).toLocaleDateString() : '';

          return (
            <div key={trade.id} className={`ff-tm-history-row status-${trade.status}`}>
              <div className="ff-tm-history-header" onClick={() => setExpandedId(isExpanded ? null : trade.id)}>
                <span className={`ff-tm-status-pill ${trade.status}`}>{trade.status}</span>
                <span className="ff-tm-history-teams">{from?.name} {'\u2194'} {to?.name}</span>
                <span className="ff-tm-history-date">{resolvedDate}</span>
                <span className={`ff-tm-history-arrow${isExpanded ? ' open' : ''}`}>{'\u25BC'}</span>
              </div>
              {isExpanded && (
                <div className="ff-tm-history-detail">
                  <div className="ff-tm-inbox-players" style={{ margin: '12px 0' }}>
                    <div>
                      <div className="ff-tm-inbox-side-label">{from?.name} Sent</div>
                      {trade.offeringPlayerIds.map(id => (
                        <TradePlayerRow key={id} playerId={id} />
                      ))}
                    </div>
                    <div>
                      <div className="ff-tm-inbox-side-label">{to?.name} Sent</div>
                      {trade.requestingPlayerIds.map(id => (
                        <TradePlayerRow key={id} playerId={id} />
                      ))}
                    </div>
                  </div>
                  {trade.message && (
                    <div className="ff-tm-inbox-message">"{trade.message}"</div>
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
