import NewsFeed from '../dashboard/NewsFeed';
import AdSpace from '../ui/AdSpace';

export default function HubPage({ leagues, leaguesLoading, onSelectLeague, onCreateLeague, onDeleteLeague, userName }) {
  return (
    <>
      <div className="ff-hub-banner">
        <div>
          <h1>Welcome back{userName ? `, ${userName.split(' ')[0]}` : ''}</h1>
          <p>Your fantasy football hub.</p>
        </div>
      </div>

      <div className="ff-hub-grid">
        <div className="ff-hub-left">
          <div className="ff-card">
            <div className="ff-card-top-accent" style={{ background: 'var(--copper)' }} />
            <div className="ff-card-header">
              <h2>My Leagues</h2>
              {leagues.length > 0 && (
                <button className="ff-btn ff-btn-copper ff-btn-sm" onClick={onCreateLeague}>+ New</button>
              )}
            </div>
            <div className="ff-card-body">
              {leaguesLoading ? (
                <div className="ff-loading-inline">Loading leagues...</div>
              ) : leagues.length === 0 ? (
                <div className="ff-empty-state">
                  <div className="ff-empty-state-title">No leagues yet</div>
                  <div className="ff-empty-state-desc">Create your first league or join one to get started.</div>
                  <div className="ff-empty-state-actions">
                    <button className="ff-btn ff-btn-copper" onClick={onCreateLeague}>+ Create a League</button>
                    <button className="ff-btn ff-btn-secondary">Join a League</button>
                  </div>
                </div>
              ) : (
                <div className="ff-league-card-grid">
                  {leagues.map(lg => (
                    <div key={lg.id}
                      className="ff-league-card"
                      tabIndex={0}
                      role="button"
                      onClick={() => onSelectLeague(lg)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectLeague(lg); } }}>
                      <div className="ff-league-card-row">
                        <div className="ff-league-card-row-inner">
                          <div className="ff-league-card-name">{lg.name}</div>
                          <div className="ff-league-card-meta">{lg.team_name} &middot; {lg.role === 'commissioner' ? 'Commissioner' : 'Member'}</div>
                        </div>
                        {lg.role === 'commissioner' && (
                          <button
                            className="ff-league-delete-btn"
                            onClick={e => { e.stopPropagation(); onDeleteLeague(lg.id); }}
                            title="Delete league"
                          >{'\u2715'}</button>
                        )}
                      </div>
                      <div className="ff-league-card-badges">
                        <span className="ff-league-card-badge">{lg.type}</span>
                        <span className="ff-league-card-badge">{lg.scoring_preset}</span>
                        <span className="ff-league-card-badge">{lg.league_size} teams</span>
                        <span className="ff-league-card-season">{lg.season}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="ff-card">
            <div className="ff-card-top-accent" style={{ background: 'var(--brand-tan)' }} />
            <div className="ff-card-header">
              <h2>Trade Calculator</h2>
              <span className="ff-trade-calc-placeholder-sub">Generic values &middot; Join a league for personalized analysis</span>
            </div>
            <div className="ff-card-body ff-trade-calc-placeholder">
              <div className="ff-trade-calc-placeholder-title">Compare player trade values across formats</div>
              <div className="ff-trade-calc-placeholder-sub">League-specific trade analysis available inside your leagues</div>
            </div>
          </div>
          <AdSpace size="sm" />
        </div>

        <div className="ff-hub-right">
          <NewsFeed />
          <AdSpace size="sm" />
        </div>
      </div>
    </>
  );
}
