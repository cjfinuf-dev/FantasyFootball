import { useState, useEffect, useRef } from 'react';
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
import TeamPage from './TeamPage';
import MatchupDetail from './MatchupDetail';
import TradeCenter from '../trade/TradeCenter';
import PlayerCompare from './PlayerCompare';
import LeagueSettings from './LeagueSettings';
import LeagueChat from './LeagueChat';
import PlayoffMachine from './PlayoffMachine';
import Breadcrumb from '../ui/Breadcrumb';
import * as leagueApi from '../../api/leagues';

import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { MATCHUPS } from '../../data/matchups';

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
  compare: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><line x1="5.5" y1="5" x2="5.5" y2="10.5"/><line x1="8.5" y1="5" x2="8.5" y2="10.5"/><line x1="4" y1="7.75" x2="10" y2="7.75"/></svg>,
  waivers: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><line x1="7" y1="5.5" x2="7" y2="10"/><line x1="4.5" y1="7.75" x2="9.5" y2="7.75"/></svg>,
  chat: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><path d="M5 6h4M5 8.5h2.5"/></svg>,
  playoffs: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><path d="M5 5.5v2h4v-2M7 7.5v3"/><circle cx="7" cy="5" r="0.5" fill="currentColor"/></svg>,
  locked: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><rect x="5" y="7.5" width="4" height="3" rx="0.5"/><path d="M5.8 7.5V6.5a1.2 1.2 0 012.4 0v1"/></svg>,
};

// Tabs that require a completed draft before they become clickable
const DRAFT_REQUIRED_TABS = new Set(['overview', 'lineup', 'matchups', 'standings', 'playoffs', 'waivers', 'trades', 'chat']);


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
  const members = league?.members || [];
  const [viewingPlayerId, setViewingPlayerId] = useState(() => searchParams.get('player') || null);
  const [viewingTeamId, setViewingTeamId] = useState(() => searchParams.get('team') || null);
  const [viewingMatchupId, setViewingMatchupId] = useState(() => searchParams.get('matchup') || null);
  const savedScrollRef = useRef(0);
  const tabScrollRef = useRef({});

  const handlePlayerClick = (playerId) => {
    savedScrollRef.current = window.scrollY;
    setViewingTeamId(null);
    setViewingPlayerId(playerId);
    const params = new URLSearchParams(searchParams);
    params.set('player', playerId);
    setSearchParams(params, { replace: true });
  };

  const handleTeamClick = (teamId) => {
    savedScrollRef.current = window.scrollY;
    setViewingPlayerId(null);
    setViewingTeamId(teamId);
    setViewingMatchupId(null);
    const params = new URLSearchParams(searchParams);
    params.delete('player');
    params.delete('matchup');
    params.set('team', teamId);
    setSearchParams(params, { replace: true });
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const handleMatchupClick = (matchupId) => {
    savedScrollRef.current = window.scrollY;
    setViewingPlayerId(null);
    setViewingTeamId(null);
    setViewingMatchupId(matchupId);
    const params = new URLSearchParams(searchParams);
    params.delete('player');
    params.delete('team');
    params.set('matchup', matchupId);
    setSearchParams(params, { replace: true });
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const setActiveTab = (tabId) => {
    tabScrollRef.current[activeTab] = window.scrollY;
    navigate(`/league/${leagueId}/${tabId}`, { replace: true });
    const saved = tabScrollRef.current[tabId];
    window.scrollTo({ top: saved || 0, behavior: 'smooth' });
  };

  // Fetch league data
  useEffect(() => {
    setLeagueLoading(true);
    leagueApi.getLeague(leagueId)
      .then(data => {
        setLeague(data.league);
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
      setLeague(updated);
    } catch (err) { alert(err.message || 'Failed to remove member.'); }
  };

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);

  // Close more-tabs menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu]);

  // Escape key closes any open detail view
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (viewingPlayerId) {
        setViewingPlayerId(null);
        const params = new URLSearchParams(searchParams);
        params.delete('player');
        setSearchParams(params, { replace: true });
        requestAnimationFrame(() => window.scrollTo({ top: savedScrollRef.current, behavior: 'smooth' }));
      } else if (viewingTeamId) {
        setViewingTeamId(null);
        const params = new URLSearchParams(searchParams);
        params.delete('team');
        setSearchParams(params, { replace: true });
        requestAnimationFrame(() => window.scrollTo({ top: savedScrollRef.current, behavior: 'smooth' }));
      } else if (viewingMatchupId) {
        setViewingMatchupId(null);
        const params = new URLSearchParams(searchParams);
        params.delete('matchup');
        setSearchParams(params, { replace: true });
        requestAnimationFrame(() => window.scrollTo({ top: savedScrollRef.current, behavior: 'smooth' }));
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [viewingPlayerId, viewingTeamId, viewingMatchupId, searchParams]);

  const isTabDisabled = (id) => !draftComplete && DRAFT_REQUIRED_TABS.has(id);

  const allTabs = draftComplete
    ? [
        { id: 'overview', label: 'League Overview' },
        { id: 'lineup', label: 'My Lineup' },
        { id: 'matchups', label: 'Matchups' },
        { id: 'standings', label: 'League Standings' },
        { id: 'playoffs', label: 'Playoffs' },
        { id: 'players', label: 'Players' },
        { id: 'compare', label: 'Compare' },
        { id: 'waivers', label: 'Waivers' },
        { id: 'trades', label: 'Trades' },
        { id: 'chat', label: 'League Chat' },
        { id: 'draft', label: 'Draft Results' },
      ]
    : [
        { id: 'draft', label: 'Draft' },
        { id: 'overview', label: 'League Overview' },
        { id: 'players', label: 'Players' },
        { id: 'compare', label: 'Compare' },
        { id: 'lineup', label: 'My Lineup' },
        { id: 'matchups', label: 'Matchups' },
        { id: 'standings', label: 'League Standings' },
        { id: 'playoffs', label: 'Playoffs' },
        { id: 'waivers', label: 'Waivers' },
        { id: 'trades', label: 'Trades' },
        { id: 'chat', label: 'League Chat' },
      ];


  if (leagueLoading || !league) {
    return (
      <div style={{ padding: 'calc(var(--navbar-height) + var(--hero-compact-height, 90px) + 20px) clamp(16px, 4vw, 32px) 20px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(300px, 360px)', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="skeleton" style={{ height: 420, borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 280, borderRadius: 8 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="skeleton" style={{ height: 300, borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* League Header */}
      <header className="ff-hero ff-hero-compact">
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <Link to="/hub" className="ff-back-btn">{'\u2190'} My Leagues</Link>
            <h1 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)', margin: 0 }}>
              {league.name}
            </h1>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {league.type} &middot; {league.scoring_preset?.toUpperCase() || 'PPR'} &middot; {league.league_size}-Team &middot; <strong style={{ color: 'var(--accent-text)', fontWeight: 600 }}>{league.team_name}</strong>{league.role === 'commissioner' ? ' · Commissioner' : ''}
            </span>
          </div>

          {/* League Nav Tabs */}
          <span id="tab-lock-desc" hidden>Complete the draft first</span>
          <div className="ff-tabs-container">
          <div style={{ position: 'relative' }} ref={moreMenuRef}>
            <button
              className="ff-league-dropdown-trigger"
              onClick={() => setShowMoreMenu(prev => !prev)}
              aria-haspopup="listbox"
              aria-expanded={showMoreMenu}>
              Hex Fantasy League <span className="chevron">▾</span>
            </button>
            {showMoreMenu && (
              <div className="ff-more-tabs-menu">
                {allTabs.map(t => {
                  const locked = isTabDisabled(t.id);
                  return (
                    <button key={t.id}
                      className={`ff-more-tab-item${activeTab === t.id ? ' active' : ''}${locked ? ' disabled' : ''}`}
                      aria-disabled={locked || undefined}
                      title={locked ? 'Complete the draft first' : undefined}
                      onClick={(e) => {
                        if (locked) {
                          e.currentTarget.classList.remove('shake');
                          void e.currentTarget.offsetWidth;
                          e.currentTarget.classList.add('shake');
                          return;
                        }
                        setActiveTab(t.id); setShowMoreMenu(false);
                      }}>
                      {locked ? TAB_ICONS.locked : TAB_ICONS[t.id]}{t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="ff-tab-actions">
            <button onClick={() => setActiveTab('settings')}
              role="tab"
              aria-selected={activeTab === 'settings'}
              className={`ff-league-tab ff-league-tab-gear${activeTab === 'settings' ? ' active' : ''}`}
              title="League Info">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ margin: 0 }}>
                <path d="M6.1 1.5h1.8l.3 1.3.9.4 1.1-.7 1.3 1.3-.7 1.1.4.9 1.3.3v1.8l-1.3.3-.4.9.7 1.1-1.3 1.3-1.1-.7-.9.4-.3 1.3H6.1l-.3-1.3-.9-.4-1.1.7-1.3-1.3.7-1.1-.4-.9-1.3-.3V6.1l1.3-.3.4-.9-.7-1.1 1.3-1.3 1.1.7.9-.4z"/><circle cx="7" cy="7" r="2"/>
              </svg>
            </button>
          </div>
          </div>
        </div>
      </header>

      {/* Player / Team / Matchup detail views — keep sidebar visible */}
      {viewingPlayerId ? (
        <div className="ff-overview-layout">
          <div className="ff-overview-grid">
            <div className="ff-left ff-detail-view">
              <Breadcrumb
                onBack={() => {
                  setViewingPlayerId(null);
                  const params = new URLSearchParams(searchParams);
                  params.delete('player');
                  setSearchParams(params, { replace: true });
                  requestAnimationFrame(() => window.scrollTo({ top: savedScrollRef.current, behavior: 'smooth' }));
                }}
                backLabel={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                currentLabel="Player Details"
              />
              <PlayerStats playerId={viewingPlayerId} onBack={() => {
                setViewingPlayerId(null);
                const params = new URLSearchParams(searchParams);
                params.delete('player');
                setSearchParams(params, { replace: true });
                window.scrollTo({ top: savedScrollRef.current, behavior: 'smooth' });
              }} />
            </div>
            <div className="ff-right">
              <StandingsCard rosters={draftedRosters} leagueName={league.name} onTeamClick={handleTeamClick} />
              <PowerRankingsCard rosters={draftedRosters} />
            </div>
          </div>
        </div>
      ) : viewingTeamId ? (
        <div className="ff-overview-layout">
          <div className="ff-overview-grid">
            <div className="ff-left ff-detail-view">
              <Breadcrumb
                onBack={() => {
                  setViewingTeamId(null);
                  const params = new URLSearchParams(searchParams);
                  params.delete('team');
                  setSearchParams(params, { replace: true });
                  requestAnimationFrame(() => window.scrollTo({ top: savedScrollRef.current, behavior: 'smooth' }));
                }}
                backLabel={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                currentLabel="Team Details"
              />
              <TeamPage teamId={viewingTeamId} rosters={draftedRosters} onBack={() => {
                setViewingTeamId(null);
                const params = new URLSearchParams(searchParams);
                params.delete('team');
                setSearchParams(params, { replace: true });
                window.scrollTo({ top: savedScrollRef.current, behavior: 'smooth' });
              }} onPlayerClick={handlePlayerClick} />
            </div>
            <div className="ff-right">
              <StandingsCard rosters={draftedRosters} leagueName={league.name} onTeamClick={handleTeamClick} />
              <PowerRankingsCard rosters={draftedRosters} />
            </div>
          </div>
        </div>
      ) : viewingMatchupId ? (
        <div className="ff-overview-layout">
          <div className="ff-overview-grid">
            <div className="ff-left ff-detail-view">
              <Breadcrumb
                onBack={() => {
                  setViewingMatchupId(null);
                  const params = new URLSearchParams(searchParams);
                  params.delete('matchup');
                  setSearchParams(params, { replace: true });
                  requestAnimationFrame(() => window.scrollTo({ top: savedScrollRef.current, behavior: 'smooth' }));
                }}
                backLabel="Matchups"
                currentLabel="Matchup Detail"
              />
              <MatchupDetail matchup={MATCHUPS.find(m => m.id === viewingMatchupId) || MATCHUPS[0]} rosters={draftedRosters} onBack={() => {
                setViewingMatchupId(null);
                const params = new URLSearchParams(searchParams);
                params.delete('matchup');
                setSearchParams(params, { replace: true });
                window.scrollTo({ top: savedScrollRef.current, behavior: 'smooth' });
              }} onPlayerClick={handlePlayerClick} />
            </div>
            <div className="ff-right">
              <StandingsCard rosters={draftedRosters} leagueName={league.name} onTeamClick={handleTeamClick} />
              <PowerRankingsCard rosters={draftedRosters} />
            </div>
          </div>
        </div>
      ) : <>

      {/* Tab Content */}
      {activeTab === 'draft' && (
        <div className="ff-tab-content" style={{ padding: 0, maxWidth: 'none' }}>
          {draftLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Loading draft...</div>
          ) : (
            <DraftBoard
              onDraftComplete={handleDraftComplete}
              onDraftReset={handleDraftReset}
              leagueName={league.name}
              initialDraft={savedDraft}
              scoringPreset={league.scoring_preset || 'ppr'}
              leagueSize={league.league_size || 12}
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
                  <MatchupWidget rosters={draftedRosters} onPlayerClick={handlePlayerClick} onMatchupClick={handleMatchupClick} />
                  <NewsFeed onPlayerClick={handlePlayerClick} />
                </div>
                <div className="ff-right">
                  <StandingsCard rosters={draftedRosters} leagueName={league.name} onTeamClick={handleTeamClick} />
                  <PowerRankingsCard rosters={draftedRosters} />
                  <WaiverWireCard rosters={draftedRosters} onPlayerClick={handlePlayerClick} onClaimPlayer={(playerId) => {
                    if (!window.confirm('Add this player to your roster?')) return;
                    setDraftedRosters(prev => {
                      const next = { ...prev };
                      next[USER_TEAM_ID] = [...(next[USER_TEAM_ID] || []), playerId];
                      return next;
                    });
                  }} />
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
          <MatchupWidget mode="all" rosters={draftedRosters} onPlayerClick={handlePlayerClick} onMatchupClick={handleMatchupClick} />
        </div>
      )}

      {activeTab === 'standings' && (
        <div className="ff-tab-content ff-tab-content-wide">
          <StandingsCard expanded rosters={draftedRosters} leagueName={league.name} onTeamClick={handleTeamClick} />
        </div>
      )}

      {activeTab === 'waivers' && (
        <div className="ff-tab-content ff-tab-content-wide">
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

      {activeTab === 'compare' && (
        <div className="ff-tab-content ff-tab-content-wide">
          <PlayerCompare />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="ff-tab-content ff-tab-content-wide">
          <LeagueSettings league={league} members={members} onRemoveMember={handleRemoveMember} />
        </div>
      )}

      {activeTab === 'playoffs' && (
        <div className="ff-tab-content ff-tab-content-wide">
          <PlayoffMachine rosters={draftedRosters} onPlayerClick={handlePlayerClick} onTeamClick={handleTeamClick} />
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="ff-tab-content ff-tab-content-mid">
          <LeagueChat league={league} leagueId={leagueId} />
        </div>
      )}
      </>}
    </div>
  );
}
