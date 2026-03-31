import { useState, useEffect } from 'react';
import MatchupWidget from '../dashboard/MatchupWidget';
import PlayerRankings from '../dashboard/PlayerRankings';
import NewsFeed from '../dashboard/NewsFeed';
import StandingsCard from '../sidebar/StandingsCard';
import WaiverWireCard from '../sidebar/WaiverWireCard';
import PowerRankingsCard from '../sidebar/PowerRankingsCard';
import DraftBoard from './DraftBoard';
import MyLineup from './MyLineup';
import PlayerStats from './PlayerStats';
import AdSpace from '../ui/AdSpace';
import * as leagueApi from '../../api/leagues';
import { TEAMS } from '../../data/teams';

export default function LeagueDashboard({ league, onBack }) {
  const [activeTab, setActiveTab] = useState('draft');
  const [draftComplete, setDraftComplete] = useState(false);
  const [draftedRosters, setDraftedRosters] = useState(null);
  const [savedDraft, setSavedDraft] = useState(null);
  const [draftLoading, setDraftLoading] = useState(true);
  const [members, setMembers] = useState(league.members || []);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [removeConfirmId, setRemoveConfirmId] = useState(null);
  const [viewingPlayerId, setViewingPlayerId] = useState(null);

  const handlePlayerClick = (playerId) => setViewingPlayerId(playerId);

  // Load saved draft on mount
  useEffect(() => {
    setDraftLoading(true);
    leagueApi.getDraft(league.id)
      .then(({ draft }) => {
        if (draft && draft.phase === 'complete' && draft.picks?.length > 0) {
          setSavedDraft(draft);
          // Compute rosters from picks
          const rosters = {};
          TEAMS.forEach(t => { rosters[t.id] = []; });
          draft.picks.forEach(p => {
            if (rosters[p.teamId]) rosters[p.teamId].push(p.playerId);
          });
          setDraftedRosters(rosters);
          setDraftComplete(true);
          setActiveTab('overview');
        }
      })
      .catch(() => {}) // No saved draft — that's fine
      .finally(() => setDraftLoading(false));
  }, [league.id]);

  const handleDraftComplete = async (rosters, picks, draftOrder) => {
    setDraftedRosters(rosters);
    setDraftComplete(true);
    // Persist to server
    try {
      await leagueApi.saveDraft(league.id, { picks, draftOrder });
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  };

  const handleDraftReset = async () => {
    setDraftedRosters(null);
    setDraftComplete(false);
    setSavedDraft(null);
    // Delete from server
    try {
      await leagueApi.deleteDraft(league.id);
    } catch (err) {
      console.error('Failed to delete draft:', err);
    }
  };

  const handleRemoveMember = async (memberId) => {
    setRemovingMemberId(memberId);
    try {
      const { league: updated } = await leagueApi.removeMember(league.id, memberId);
      setMembers(updated.members || []);
      setRemoveConfirmId(null);
    } catch (err) { alert(err.message || 'Failed to remove member.'); }
    finally { setRemovingMemberId(null); }
  };

  const tabs = [
    { id: 'draft', label: 'Draft' },
    { id: 'overview', label: 'Overview' },
    { id: 'lineup', label: 'My Lineup' },
    { id: 'matchups', label: 'Matchups' },
    { id: 'standings', label: 'Standings' },
    { id: 'waivers', label: 'Waivers' },
    { id: 'trades', label: 'Trades' },
    { id: 'players', label: 'Players' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div>
      {/* League Header */}
      <div className="ff-hero" style={{ marginTop: 48, paddingBottom: 0 }}>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <button onClick={onBack} className="ff-back-btn">{'\u2190'} My Leagues</button>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{league.type} &middot; {league.scoring_preset?.toUpperCase() || 'PPR'} &middot; {league.league_size} teams</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            {league.name}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            Your team: <strong style={{ color: 'var(--accent-secondary-text)' }}>{league.team_name}</strong> &middot; {league.role === 'commissioner' ? 'Commissioner' : 'Member'}
          </p>

          {/* League Nav Tabs */}
          <div className="ff-league-tabs-wrap">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`ff-league-tab${activeTab === t.id ? ' active' : ''}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Player Stats View */}
      {viewingPlayerId ? (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 900, margin: '0 auto' }}>
          <PlayerStats playerId={viewingPlayerId} onBack={() => setViewingPlayerId(null)} />
        </div>
      ) : <>

      {/* Tab Content */}
      {activeTab === 'draft' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1600, margin: '0 auto' }}>
          {draftLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Loading draft...</div>
          ) : (
            <DraftBoard
              onDraftComplete={handleDraftComplete}
              onDraftReset={handleDraftReset}
              leagueName={league.name}
              initialDraft={savedDraft}
            />
          )}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="ff-tab-content">
          {!draftComplete ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
                            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Complete the Draft First</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Your league overview will populate once the draft is complete.</div>
              <button className="ff-btn ff-btn-primary" style={{ fontSize: 13, padding: '10px 20px' }} onClick={() => setActiveTab('draft')}>Go to Draft</button>
            </div>
          ) : (
            <div className="ff-main-grid">
              <div className="ff-left">
                <MatchupWidget rosters={draftedRosters} onPlayerClick={handlePlayerClick} />
                <NewsFeed />
              </div>
              <div className="ff-right">
                <StandingsCard rosters={draftedRosters} leagueName={league.name} />
                <WaiverWireCard rosters={draftedRosters} onPlayerClick={handlePlayerClick} />
                <PowerRankingsCard rosters={draftedRosters} />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'lineup' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 900, margin: '0 auto' }}>
          {draftComplete ? (
            <MyLineup rosters={draftedRosters} onPlayerClick={handlePlayerClick} />
          ) : (
            <div className="ff-card">
              <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
              <div className="ff-card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Complete the draft first</div>
                <div style={{ fontSize: 12 }}>Head to the Draft tab to draft your team before managing your lineup.</div>
                <button className="ff-btn ff-btn-primary" style={{ marginTop: 16, fontSize: 13, padding: '10px 20px' }} onClick={() => setActiveTab('draft')}>Go to Draft</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'matchups' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
          <MatchupWidget mode="all" rosters={draftedRosters} onPlayerClick={handlePlayerClick} />
        </div>
      )}

      {activeTab === 'standings' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1000, margin: '0 auto' }}>
          <StandingsCard expanded rosters={draftedRosters} leagueName={league.name} />
        </div>
      )}

      {activeTab === 'waivers' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1000, margin: '0 auto' }}>
          <WaiverWireCard expanded rosters={draftedRosters} onPlayerClick={handlePlayerClick} />
        </div>
      )}

      {activeTab === 'trades' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
          <div className="ff-card">
            <div className="ff-card-top-accent" style={{ background: 'var(--accent-secondary)' }} />
            <div className="ff-card-header"><h2>Trade Center</h2></div>
            <div className="ff-card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
              League-specific trade center coming soon. Propose trades, analyze values based on your league's scoring, and manage offers.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'players' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
          <PlayerRankings onPlayerClick={handlePlayerClick} />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
          <div className="ff-card" style={{ marginBottom: 16 }}>
            <div className="ff-card-top-accent" style={{ background: 'var(--charcoal-slate)' }} />
            <div className="ff-card-header"><h2>League Settings</h2></div>
            <div className="ff-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                <div><span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>League Type</span><br/>{league.type}</div>
                <div><span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Scoring</span><br/>{league.scoring_preset}</div>
                <div><span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Teams</span><br/>{league.league_size}</div>
                <div><span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Season</span><br/>{league.season}</div>
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="ff-card">
            <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
            <div className="ff-card-header">
              <h2>Members</h2>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{members.length} / {league.league_size}</span>
            </div>
            <div className="ff-card-body">
              {members.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>No members yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {members.map(member => (
                    <div key={member.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                      borderBottom: '1px solid var(--border)', fontSize: 13,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 14,
                      }}>
                        {(member.user_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{member.user_name || 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {member.team_name} &middot; {member.role === 'commissioner' ? 'Commissioner' : 'Member'}
                        </div>
                      </div>
                      {league.role === 'commissioner' && member.role !== 'commissioner' && (
                        removeConfirmId === member.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Remove?</span>
                            <button onClick={() => handleRemoveMember(member.id)} disabled={removingMemberId === member.id}
                              style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: 'var(--red, #ef4444)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                              {removingMemberId === member.id ? '...' : 'Yes'}
                            </button>
                            <button onClick={() => setRemoveConfirmId(null)}
                              style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 11, cursor: 'pointer' }}>
                              No
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setRemoveConfirmId(member.id)}
                            style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>
                            Remove
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
