import { useState } from 'react';
import NewsFeed from '../dashboard/NewsFeed';
import AdSpace from '../ui/AdSpace';
import QuickTradeCalc from '../trade/QuickTradeCalc';
import ImportLeague from '../league/ImportLeague';
import * as leagueApi from '../../api/leagues';

export default function HubPage({ leagues, leaguesLoading, onSelectLeague, onCreateLeague, onDeleteLeague, onLeagueJoined, userName }) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [joinForm, setJoinForm] = useState({ inviteCode: '', teamName: '' });
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoinError('');
    if (!joinForm.inviteCode.trim() || !joinForm.teamName.trim()) {
      setJoinError('Invite code and team name are required.');
      return;
    }
    setJoining(true);
    try {
      const { league } = await leagueApi.joinLeague({
        inviteCode: joinForm.inviteCode.trim(),
        teamName: joinForm.teamName.trim(),
      });
      setShowJoinModal(false);
      setJoinForm({ inviteCode: '', teamName: '' });
      onLeagueJoined?.(league);
    } catch (err) {
      setJoinError(err.message || 'Failed to join league.');
    } finally {
      setJoining(false);
    }
  };

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
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={() => setShowImportModal(true)}>Import</button>
                  <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={() => setShowJoinModal(true)}>Join</button>
                  <button className="ff-btn ff-btn-copper ff-btn-sm" onClick={onCreateLeague}>+ New</button>
                </div>
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
                    <button className="ff-btn ff-btn-secondary" onClick={() => setShowJoinModal(true)}>Join a League</button>
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

          <QuickTradeCalc />
          <AdSpace size="sm" />
        </div>

        <div className="ff-hub-right">
          <NewsFeed />
          <AdSpace size="sm" />
        </div>
      </div>

      {/* Join League Modal */}
      {showJoinModal && (
        <div className="auth-overlay" onClick={e => { if (e.target === e.currentTarget) setShowJoinModal(false); }}>
          <div className="auth-modal" style={{ width: 420 }}>
            <button className="auth-close" onClick={() => setShowJoinModal(false)}>{'\u2715'}</button>
            <h2>Join a League</h2>
            <p className="auth-subtitle">Enter the invite code shared by the league commissioner.</p>
            <form onSubmit={handleJoin}>
              <div className="auth-input-group">
                <label>Invite Code</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="e.g. A3F2B1C8"
                  value={joinForm.inviteCode}
                  onChange={e => setJoinForm(f => ({ ...f, inviteCode: e.target.value.toUpperCase() }))}
                  style={{ letterSpacing: '0.15em', fontFamily: 'monospace', fontSize: 16, textAlign: 'center' }}
                  maxLength={12}
                  autoFocus
                />
              </div>
              <div className="auth-input-group">
                <label>Your Team Name</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Team Name"
                  value={joinForm.teamName}
                  onChange={e => setJoinForm(f => ({ ...f, teamName: e.target.value }))}
                />
              </div>
              {joinError && <p className="auth-error">{joinError}</p>}
              <button type="submit" className="auth-btn auth-btn-secondary" disabled={joining}>
                {joining ? 'Joining...' : 'Join League'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <ImportLeague
          onClose={() => setShowImportModal(false)}
          onImported={(league) => { onLeagueJoined?.(league); }}
        />
      )}
    </>
  );
}
