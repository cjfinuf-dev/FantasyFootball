import { useState, useEffect, useRef } from 'react';
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
import TradeCenter from '../trade/TradeCenter';
import * as leagueApi from '../../api/leagues';

import { TEAMS } from '../../data/teams';

export default function LeagueDashboard({ league, onBack, activeTab: externalTab, onTabChange }) {
  const [internalTab, setInternalTab] = useState('overview');
  const activeTab = externalTab || internalTab;
  const setActiveTab = (tab) => { setInternalTab(tab); onTabChange?.(tab); };
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
          if (!externalTab) setActiveTab('overview');
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

  // Tabs that require a completed draft to show real content
  const draftRequiredTabs = new Set(['overview', 'lineup', 'matchups', 'standings', 'waivers', 'trades']);
  const isTabDisabled = (id) => !draftComplete && draftRequiredTabs.has(id);

  const primaryTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'lineup', label: 'My Lineup' },
    { id: 'trades', label: 'Trades' },
    { id: 'players', label: 'Players' },
    { id: 'standings', label: 'Standings' },
  ];
  const moreTabs = [
    { id: 'matchups', label: 'Matchups' },
    { id: 'waivers', label: 'Waivers' },
    { id: 'draft', label: 'Draft' },
  ];
  const allTabs = [...primaryTabs, ...moreTabs, { id: 'settings', label: 'Settings' }];
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setShowMoreMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const isMoreTabActive = moreTabs.some(t => t.id === activeTab);

  return (
    <div className="ff-league-layout">
      <div>
      {/* League Header */}
      <div className="ff-hero ff-hero-compact" style={{ marginTop: 48 }}>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <button onClick={onBack} className="ff-back-btn">{'\u2190'} My Leagues</button>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{league.type} &middot; {league.scoring_preset?.toUpperCase() || 'PPR'} &middot; {league.league_size} teams</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}>
            {league.name}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Your team: <strong style={{ color: 'var(--accent-secondary-text)' }}>{league.team_name}</strong> &middot; {league.role === 'commissioner' ? 'Commissioner' : 'Member'}
          </p>

          {/* League Nav Tabs */}
          <div className="ff-league-tabs-wrap">
            {primaryTabs.map(t => (
              <button key={t.id}
                onClick={() => !isTabDisabled(t.id) && setActiveTab(t.id)}
                className={`ff-league-tab${activeTab === t.id ? ' active' : ''}${isTabDisabled(t.id) ? ' disabled' : ''}`}
                title={isTabDisabled(t.id) ? 'Complete the draft first' : undefined}>
                {t.label}
              </button>
            ))}
            <div ref={moreMenuRef} style={{ position: 'relative', display: 'flex' }}>
              <button
                className={`ff-league-tab${isMoreTabActive ? ' active' : ''}`}
                onClick={() => setShowMoreMenu(prev => !prev)}>
                {isMoreTabActive ? moreTabs.find(t => t.id === activeTab)?.label : 'More'} {'\u25BE'}
              </button>
              {showMoreMenu && (
                <div className="ff-more-dropdown">
                  {moreTabs.map(t => (
                    <button key={t.id}
                      className={`ff-more-dropdown-item${activeTab === t.id ? ' active' : ''}${isTabDisabled(t.id) ? ' disabled' : ''}`}
                      onClick={() => { if (!isTabDisabled(t.id)) { setActiveTab(t.id); setShowMoreMenu(false); } }}
                      title={isTabDisabled(t.id) ? 'Complete the draft first' : undefined}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setActiveTab('settings')}
              className={`ff-league-tab ff-league-tab-gear${activeTab === 'settings' ? ' active' : ''}`}
              title="Settings">
              {'\u2699'}
            </button>
          </div>
        </div>
      </div>

      {/* Player Stats View */}
      {viewingPlayerId ? (
        <div className="ff-tab-content ff-tab-content-narrow">
          <PlayerStats playerId={viewingPlayerId} onBack={() => setViewingPlayerId(null)} />
        </div>
      ) : <>

      {/* Tab Content */}
      {activeTab === 'draft' && (
        <div className="ff-tab-content ff-tab-content-full">
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
            <div className="ff-empty-state">
              <div className="ff-empty-state-title">Complete the Draft First</div>
              <div className="ff-empty-state-desc">Your league overview will populate once the draft is complete.</div>
              <div className="ff-empty-state-actions">
                <button className="ff-btn ff-btn-primary" onClick={() => setActiveTab('draft')}>Go to Draft</button>
              </div>
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
        <div className="ff-tab-content ff-tab-content-narrow">
          {draftComplete ? (
            <MyLineup rosters={draftedRosters} onPlayerClick={handlePlayerClick} />
          ) : (
            <div className="ff-card">
              <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
              <div className="ff-card-body ff-empty-state">
                <div className="ff-empty-state-title">Complete the draft first</div>
                <div className="ff-empty-state-desc">Head to the Draft tab to draft your team before managing your lineup.</div>
                <div className="ff-empty-state-actions">
                  <button className="ff-btn ff-btn-primary" onClick={() => setActiveTab('draft')}>Go to Draft</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'matchups' && (
        <div className="ff-tab-content ff-tab-content-wide">
          <MatchupWidget mode="all" rosters={draftedRosters} onPlayerClick={handlePlayerClick} />
        </div>
      )}

      {activeTab === 'standings' && (
        <div className="ff-tab-content ff-tab-content-mid">
          <StandingsCard expanded rosters={draftedRosters} leagueName={league.name} />
        </div>
      )}

      {activeTab === 'waivers' && (
        <div className="ff-tab-content ff-tab-content-mid">
          <WaiverWireCard expanded rosters={draftedRosters} onPlayerClick={handlePlayerClick} />
        </div>
      )}

      {activeTab === 'trades' && (
        <div className="ff-tab-content ff-tab-content-wide">
          {draftComplete ? (
            <TradeCenter rosters={draftedRosters} onRostersChange={setDraftedRosters} scoringPreset={league.scoring_preset} />
          ) : (
            <div className="ff-card">
              <div className="ff-card-top-accent" style={{ background: 'var(--accent-secondary)' }} />
              <div className="ff-card-body ff-empty-state">
                <div className="ff-empty-state-title">Complete the Draft First</div>
                <div className="ff-empty-state-desc">Trade center requires rosters. Complete the draft to begin trading.</div>
                <div className="ff-empty-state-actions">
                  <button className="ff-btn ff-btn-primary" onClick={() => setActiveTab('draft')}>Go to Draft</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'players' && (
        <div className="ff-tab-content ff-tab-content-wide">
          <PlayerRankings onPlayerClick={handlePlayerClick} />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="ff-tab-content ff-tab-content-wide">
          <div className="ff-card" style={{ marginBottom: 16 }}>
            <div className="ff-card-top-accent" style={{ background: 'var(--charcoal-slate)' }} />
            <div className="ff-card-header"><h2>League Settings</h2></div>
            <div className="ff-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                <div><span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>League Type</span><br/>{league.type}</div>
                <div><span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Scoring</span><br/>{league.scoring_preset}</div>
                <div><span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Teams</span><br/>{league.league_size}</div>
                <div><span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Season</span><br/>{league.season}</div>
                {league.invite_code && (
                  <div style={{ gridColumn: '1 / -1', marginTop: 8, padding: '12px 16px', background: 'var(--surface, var(--bg-alt))', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Invite Code</span><br/>
                    <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--accent)' }}>{league.invite_code}</span>
                    <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--text-muted)' }}>Share this code so others can join your league</span>
                  </div>
                )}
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
      <div className="ff-league-ad-sidebar">
        <div className="ad-fill">
          <div className="ad-fill-label">Ad Space</div>
          <div className="ad-fill-size">160xFull</div>
        </div>
      </div>
    </div>
  );
}
