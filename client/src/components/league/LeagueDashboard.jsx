import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import MatchupWidget from '../dashboard/MatchupWidget';
import PlayerRankings from '../dashboard/PlayerRankings';
import NewsFeed from '../dashboard/NewsFeed';
import StandingsCard from '../sidebar/StandingsCard';
import WaiverWireCard from '../sidebar/WaiverWireCard';
import PowerRankingsCard from '../sidebar/PowerRankingsCard';
import DraftBoard from './DraftBoard';
import MyLineup from './MyLineup';
import PlayerStats from './PlayerStats';
import TradeCenter from '../trade/TradeCenter';
import LeagueSettings from './LeagueSettings';
import * as leagueApi from '../../api/leagues';

import { TEAMS, USER_TEAM_ID } from '../../data/teams';

// Hex-branded tab icons — stroke-based SVGs using currentColor
const HEX = 'M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z'; // hexagon path
const TAB_ICONS = {
  overview: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><line x1="4" y1="6" x2="10" y2="6"/><line x1="4" y1="8" x2="8" y2="8"/></svg>,
  lineup: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><line x1="4.5" y1="5.5" x2="9.5" y2="5.5"/><line x1="4.5" y1="7.75" x2="9.5" y2="7.75"/><line x1="4.5" y1="10" x2="9.5" y2="10"/></svg>,
  draft: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><circle cx="7" cy="7.75" r="1.2"/><line x1="7" y1="4.5" x2="7" y2="6"/><line x1="7" y1="9.5" x2="7" y2="11"/><line x1="4.5" y1="7.75" x2="6" y2="7.75"/><line x1="8" y1="7.75" x2="9.5" y2="7.75"/></svg>,
  trades: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="10,3 13,3 13,6"/><line x1="13" y1="3" x2="8" y2="8"/><polyline points="4,11 1,11 1,8"/><line x1="1" y1="11" x2="6" y2="6"/></svg>,
  players: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><circle cx="7" cy="6" r="1.5"/><path d="M4.5 11a2.5 2.5 0 015 0"/></svg>,
  standings: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><line x1="4.5" y1="10.5" x2="4.5" y2="8"/><line x1="7" y1="10.5" x2="7" y2="5.5"/><line x1="9.5" y1="10.5" x2="9.5" y2="7"/></svg>,
  matchups: <svg viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 1.5L8 0 11 1.5v3L8 6 5 4.5z"/><path d="M5 7.5L8 6 11 7.5v3L8 12 5 10.5z" opacity="0.5"/></svg>,
  waivers: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><line x1="7" y1="5.5" x2="7" y2="10"/><line x1="4.5" y1="7.75" x2="9.5" y2="7.75"/></svg>,
  locked: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><rect x="5" y="7.5" width="4" height="3" rx="0.5"/><path d="M5.8 7.5V6.5a1.2 1.2 0 012.4 0v1"/></svg>,
};

export default function LeagueDashboard() {
  const { leagueId, tab } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = tab || 'overview';

  const [league, setLeague] = useState(null);
  const [leagueLoading, setLeagueLoading] = useState(true);
  const [draftComplete, setDraftComplete] = useState(false);
  const [draftedRosters, setDraftedRosters] = useState(null);
  const [savedDraft, setSavedDraft] = useState(null);
  const [draftLoading, setDraftLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [viewingPlayerId, setViewingPlayerId] = useState(() => searchParams.get('player') || null);

  const handlePlayerClick = (playerId) => {
    setViewingPlayerId(playerId);
    // Update URL without navigation so it's shareable
    const params = new URLSearchParams(searchParams);
    params.set('player', playerId);
    setSearchParams(params, { replace: true });
  };

  const setActiveTab = (tabId) => {
    navigate(`/league/${leagueId}/${tabId}`, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch league data
  useEffect(() => {
    setLeagueLoading(true);
    leagueApi.getLeague(leagueId)
      .then(data => {
        setLeague(data.league);
        setMembers(data.league.members || []);
      })
      .catch(() => navigate('/hub', { replace: true }))
      .finally(() => setLeagueLoading(false));
  }, [leagueId]);

  // Load saved draft
  useEffect(() => {
    setDraftLoading(true);
    setDraftComplete(false);
    setDraftedRosters(null);
    setSavedDraft(null);
    leagueApi.getDraft(leagueId)
      .then(({ draft }) => {
        if (draft && draft.phase === 'complete' && draft.picks?.length > 0) {
          setSavedDraft(draft);
          const rosters = {};
          TEAMS.forEach(t => { rosters[t.id] = []; });
          draft.picks.forEach(p => {
            if (rosters[p.teamId]) rosters[p.teamId].push(p.playerId);
          });
          setDraftedRosters(rosters);
          setDraftComplete(true);
        }
      })
      .catch(() => {})
      .finally(() => setDraftLoading(false));
  }, [leagueId]);

  const handleDraftComplete = async (rosters, picks, draftOrder) => {
    setDraftedRosters(rosters);
    setDraftComplete(true);
    try {
      await leagueApi.saveDraft(leagueId, { picks, draftOrder });
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  };

  const handleDraftReset = async () => {
    setDraftedRosters(null);
    setDraftComplete(false);
    setSavedDraft(null);
    try {
      await leagueApi.deleteDraft(leagueId);
    } catch (err) {
      console.error('Failed to delete draft:', err);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const { league: updated } = await leagueApi.removeMember(leagueId, memberId);
      setMembers(updated.members || []);
    } catch (err) { alert(err.message || 'Failed to remove member.'); }
  };

  const draftRequiredTabs = new Set(['overview', 'lineup', 'matchups', 'standings', 'waivers', 'trades']);
  const isTabDisabled = (id) => !draftComplete && draftRequiredTabs.has(id);

  const allTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'lineup', label: 'My Lineup' },
    { id: 'draft', label: 'Draft' },
    { id: 'trades', label: 'Trades' },
    { id: 'players', label: 'Players' },
    { id: 'standings', label: 'Standings' },
    { id: 'matchups', label: 'Matchups' },
    { id: 'waivers', label: 'Waivers' },
  ];

  const handleTabKeyDown = (e, idx) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (idx + 1) % allTabs.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + allTabs.length) % allTabs.length;
    if (next >= 0) {
      e.preventDefault();
      const nextTab = document.querySelector(`[data-tab-index="${next}"]`);
      if (nextTab) { nextTab.focus(); setActiveTab(allTabs[next].id); }
    }
  };

  if (leagueLoading || !league) {
    return <div className="ff-loading-screen"><svg className="ff-hex-spinner" viewBox="0 0 48 52"><polygon points="24,2 46,14 46,38 24,50 2,38 2,14" /></svg>Loading</div>;
  }

  return (
    <div>
      {/* League Header */}
      <div className="ff-hero ff-hero-compact" style={{ marginTop: 48 }}>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <Link to="/hub" className="ff-back-btn">{'\u2190'} My Leagues</Link>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{league.type} &middot; {league.scoring_preset?.toUpperCase() || 'PPR'} &middot; {league.league_size} teams</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}>
            {league.name}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Your team: <strong style={{ color: 'var(--accent-secondary-text)' }}>{league.team_name}</strong> &middot; {league.role === 'commissioner' ? 'Commissioner' : 'Member'}
          </p>

          {/* League Nav Tabs */}
          <div className="ff-league-tabs-wrap" role="tablist">
            {allTabs.map((t, idx) => (
              <button key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                data-tab-index={idx}
                tabIndex={activeTab === t.id ? 0 : -1}
                onClick={() => !isTabDisabled(t.id) && setActiveTab(t.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`ff-league-tab${activeTab === t.id ? ' active' : ''}${isTabDisabled(t.id) ? ' disabled' : ''}`}
                aria-disabled={isTabDisabled(t.id) || undefined}
                title={isTabDisabled(t.id) ? 'Complete the draft first' : undefined}>
                {isTabDisabled(t.id) ? TAB_ICONS.locked : TAB_ICONS[t.id]}{t.label}
              </button>
            ))}
            <button onClick={() => setActiveTab('settings')}
              className={`ff-league-tab ff-league-tab-gear${activeTab === 'settings' ? ' active' : ''}`}
              title="League Info">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ margin: 0 }}>
                <circle cx="7" cy="7" r="2"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.76 2.76l1.06 1.06M10.18 10.18l1.06 1.06M11.24 2.76l-1.06 1.06M3.82 10.18l-1.06 1.06"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Player Stats View */}
      {viewingPlayerId ? (
        <div className="ff-tab-content ff-tab-content-wide">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            <button onClick={() => {
              setViewingPlayerId(null);
              const params = new URLSearchParams(searchParams);
              params.delete('player');
              setSearchParams(params, { replace: true });
            }} className="ff-back-btn">{'\u2190'} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</button>
            <span style={{ color: 'var(--border-strong)' }}>/</span>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>Player Details</span>
          </div>
          <PlayerStats playerId={viewingPlayerId} onBack={() => {
            setViewingPlayerId(null);
            const params = new URLSearchParams(searchParams);
            params.delete('player');
            setSearchParams(params, { replace: true });
          }} />
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
            <div className="ff-tab-content-mid">
              <div className="ff-empty-state">
                <div className="ff-empty-state-title">Complete the Draft First</div>
                <div className="ff-empty-state-desc">Your league overview will populate once the draft is complete.</div>
                <div className="ff-empty-state-actions">
                  <button className="ff-btn ff-btn-primary" onClick={() => setActiveTab('draft')}>Go to Draft</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="ff-overview-layout">
              <div className="ff-overview-grid">
                <div className="ff-left">
                  <MatchupWidget rosters={draftedRosters} onPlayerClick={handlePlayerClick} />
                  <NewsFeed onPlayerClick={handlePlayerClick} />
                </div>
                <div className="ff-right">
                  <StandingsCard rosters={draftedRosters} leagueName={league.name} />
                  <WaiverWireCard rosters={draftedRosters} onPlayerClick={handlePlayerClick} onClaimPlayer={(playerId) => {
                    setDraftedRosters(prev => {
                      const next = { ...prev };
                      next[USER_TEAM_ID] = [...(next[USER_TEAM_ID] || []), playerId];
                      return next;
                    });
                  }} />
                  <PowerRankingsCard rosters={draftedRosters} />
                </div>
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
          <WaiverWireCard expanded rosters={draftedRosters} onPlayerClick={handlePlayerClick} onClaimPlayer={(playerId) => {
            setDraftedRosters(prev => {
              const next = { ...prev };
              next[USER_TEAM_ID] = [...(next[USER_TEAM_ID] || []), playerId];
              return next;
            });
          }} />
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
        <div className="ff-tab-content ff-tab-content-full">
          <PlayerRankings onPlayerClick={handlePlayerClick} />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="ff-tab-content ff-tab-content-wide">
          <LeagueSettings league={league} members={members} onRemoveMember={handleRemoveMember} />
        </div>
      )}
      </>}
    </div>
  );
}
