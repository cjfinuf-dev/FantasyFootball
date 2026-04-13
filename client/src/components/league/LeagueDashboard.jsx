import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import MatchupWidget from '../dashboard/MatchupWidget';
import PlayerRankings from '../dashboard/PlayerRankings';
import NewsFeed from '../dashboard/NewsFeed';
import StandingsCard from '../sidebar/StandingsCard';
import WaiverWireCard from '../sidebar/WaiverWireCard';
import PowerRankingsCard from '../sidebar/PowerRankingsCard';
import CommandCenter from '../sidebar/CommandCenter';
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
import DetailViewLayout from './DetailViewLayout';
import * as leagueApi from '../../api/leagues';
import { SkeletonCard, SkeletonTable } from '../ui/Skeleton';

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
  news: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><path d="M5 5.5l2 2 2-2M5 8.5h4"/></svg>,
  locked: <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={HEX}/><rect x="5" y="7.5" width="4" height="3" rx="0.5"/><path d="M5.8 7.5V6.5a1.2 1.2 0 012.4 0v1"/></svg>,
};

// Primary league tabs — shown inline in the tab strip
const PRIMARY_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'matchups', label: 'Matchups' },
  { id: 'standings', label: 'Standings' },
  { id: 'lineup', label: 'Lineup' },
];
const PRIMARY_TAB_IDS = new Set(PRIMARY_TABS.map(t => t.id));

// Secondary / always-available tabs — grouped in dropdown
const SECONDARY_TABS = [
  { id: 'players', label: 'Players' },
  { id: 'compare', label: 'Compare' },
  { id: 'news', label: 'News' },
];

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
  const [compareInitIds, setCompareInitIds] = useState(null);
  const [viewingPlayerId, setViewingPlayerId] = useState(() => searchParams.get('player') || null);
  const [viewingTeamId, setViewingTeamId] = useState(() => searchParams.get('team') || null);
  const [viewingMatchupId, setViewingMatchupId] = useState(() => searchParams.get('matchup') || null);
  const savedScrollRef = useRef(0);
  const tabScrollRef = useRef({});

  const saveScroll = () => { savedScrollRef.current = window.scrollY; };
  const restoreScroll = (top) => { requestAnimationFrame(() => window.scrollTo({ top: top ?? savedScrollRef.current, behavior: 'smooth' })); };

  const clearDetailParam = (...keys) => {
    const params = new URLSearchParams(searchParams);
    keys.forEach(k => params.delete(k));
    return params;
  };

  const closePlayer = () => {
    setViewingPlayerId(null);
    const params = clearDetailParam('player');
    setSearchParams(params, { replace: true });
    restoreScroll();
  };

  const closeTeam = () => {
    setViewingTeamId(null);
    const params = clearDetailParam('team');
    setSearchParams(params, { replace: true });
    restoreScroll();
  };

  const closeMatchup = () => {
    setViewingMatchupId(null);
    const params = clearDetailParam('matchup');
    setSearchParams(params, { replace: true });
    restoreScroll();
  };

  const handlePlayerClick = (playerId) => {
    saveScroll();
    setViewingTeamId(null);
    setViewingPlayerId(playerId);
    const params = new URLSearchParams(searchParams);
    params.set('player', playerId);
    setSearchParams(params, { replace: true });
  };

  const handleTeamClick = (teamId) => {
    saveScroll();
    setViewingPlayerId(null);
    setViewingTeamId(teamId);
    setViewingMatchupId(null);
    const params = clearDetailParam('player', 'matchup');
    params.set('team', teamId);
    setSearchParams(params, { replace: true });
    restoreScroll(0);
  };

  const handleMatchupClick = (matchupId) => {
    saveScroll();
    setViewingPlayerId(null);
    setViewingTeamId(null);
    setViewingMatchupId(matchupId);
    const params = clearDetailParam('player', 'team');
    params.set('matchup', matchupId);
    setSearchParams(params, { replace: true });
    restoreScroll(0);
  };

  const setActiveTab = (tabId) => {
    tabScrollRef.current[activeTab] = window.scrollY;
    if (activeTab === 'compare' && tabId !== 'compare') setCompareInitIds(null);
    navigate(`/league/${leagueId}/${tabId}`, { replace: true });
    const saved = tabScrollRef.current[tabId];
    window.scrollTo({ top: saved || 0, behavior: 'smooth' });
  };

  // Fetch league data
  useEffect(() => {
    const controller = new AbortController();
    setLeagueLoading(true);
    leagueApi.getLeague(leagueId, { signal: controller.signal })
      .then(data => {
        setLeague(data.league);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        navigate('/hub', { replace: true });
      })
      .finally(() => setLeagueLoading(false));
    return () => controller.abort();
  }, [leagueId]);

  // Load saved draft
  useEffect(() => {
    const controller = new AbortController();
    setDraftLoading(true);
    setDraftComplete(false);
    setDraftedRosters(null);
    setSavedDraft(null);
    leagueApi.getDraft(leagueId, { signal: controller.signal })
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
      .catch(err => {
        if (err.name === 'AbortError') return;
      })
      .finally(() => setDraftLoading(false));
    return () => controller.abort();
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
  const [lockToast, setLockToast] = useState(false);
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
      if (viewingPlayerId) closePlayer();
      else if (viewingTeamId) closeTeam();
      else if (viewingMatchupId) closeMatchup();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [viewingPlayerId, viewingTeamId, viewingMatchupId, searchParams]);

  const isTabDisabled = (id) => !draftComplete && DRAFT_REQUIRED_TABS.has(id);

  // Dropdown league tabs (everything not shown inline)
  const dropdownLeagueTabs = draftComplete
    ? [
        { id: 'playoffs', label: 'Playoffs' },
        { id: 'waivers', label: 'Waivers' },
        { id: 'trades', label: 'Trades' },
        { id: 'chat', label: 'League Chat' },
        { id: 'draft', label: 'Draft Results' },
      ]
    : [
        { id: 'draft', label: 'Draft' },
        { id: 'playoffs', label: 'Playoffs' },
        { id: 'waivers', label: 'Waivers' },
        { id: 'trades', label: 'Trades' },
        { id: 'chat', label: 'League Chat' },
      ];

  // Active tab in dropdown (for trigger label)
  const activeDropdownTab = [...dropdownLeagueTabs, ...SECONDARY_TABS].find(t => t.id === activeTab);

  // Keyboard nav for tab strip
  const handleTabKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const tabs = e.currentTarget.querySelectorAll('.ff-league-tab:not(.disabled)');
    const current = [...tabs].indexOf(e.target);
    if (current === -1) return;
    e.preventDefault();
    const next = e.key === 'ArrowRight' ? (current + 1) % tabs.length : (current - 1 + tabs.length) % tabs.length;
    tabs[next].focus();
  };


  if (leagueLoading || !league) {
    return (
      <div className="ff-overview-layout" style={{ paddingTop: 'calc(var(--navbar-height) + var(--hero-compact-height) + 20px)' }}>
        <div className="ff-overview-grid">
          <div className="ff-left">
            <SkeletonCard lines={5} />
            <SkeletonTable rows={4} cols={3} />
          </div>
          <div className="ff-right" style={{ position: 'static', maxHeight: 'none' }}>
            <SkeletonCard lines={4} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
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
          <div className="ff-hero-compact-inner">
            <Link to="/hub" className="ff-back-btn">{'\u2190'} My Leagues</Link>
            <h1>{league.name}</h1>
            <span className="ff-hero-meta">
              {league.type} &middot; {league.scoring_preset?.toUpperCase() || 'PPR'} &middot; {league.league_size}-Team &middot; <strong>{league.team_name}</strong>{league.role === 'commissioner' ? ' · Commissioner' : ''}
            </span>
            <button onClick={() => setActiveTab('settings')}
              className={`ff-hero-settings-btn${activeTab === 'settings' ? ' active' : ''}`}
              title="League Settings">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.1 1.5h1.8l.3 1.3.9.4 1.1-.7 1.3 1.3-.7 1.1.4.9 1.3.3v1.8l-1.3.3-.4.9.7 1.1-1.3 1.3-1.1-.7-.9.4-.3 1.3H6.1l-.3-1.3-.9-.4-1.1.7-1.3-1.3.7-1.1-.4-.9-1.3-.3V6.1l1.3-.3.4-.9-.7-1.1 1.3-1.3 1.1.7.9-.4z"/><circle cx="7" cy="7" r="2"/>
              </svg>
            </button>
          </div>

          {/* League Nav Tabs */}
          <span id="tab-lock-desc" hidden>Complete the draft first</span>
          <div className="ff-tabs-container" role="tablist" onKeyDown={handleTabKeyDown}>
          {/* Primary league tabs — inline */}
          {PRIMARY_TABS.map(t => {
            const locked = isTabDisabled(t.id);
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                aria-describedby={locked ? 'tab-lock-desc' : undefined}
                className={`ff-league-tab${activeTab === t.id ? ' active' : ''}${locked ? ' disabled' : ''}`}
                onClick={() => {
                  if (locked) {
                    setLockToast(true);
                    setTimeout(() => setLockToast(false), 2000);
                    return;
                  }
                  setActiveTab(t.id); setShowMoreMenu(false);
                }}>
                {locked ? TAB_ICONS.locked : TAB_ICONS[t.id]}{t.label}
              </button>
            );
          })}
          {/* Separator */}
          <div className="ff-tabs-separator" />
          {/* More dropdown — remaining league + tools */}
          <div className="ff-league-dropdown-wrapper" ref={moreMenuRef}>
            <button
              className={`ff-league-dropdown-trigger${activeDropdownTab ? ' has-active-tab' : ''}`}
              onClick={() => setShowMoreMenu(prev => !prev)}
              aria-haspopup="listbox"
              aria-expanded={showMoreMenu}>
              {activeDropdownTab?.label || 'More'} <span className="chevron">▾</span>
            </button>
            {showMoreMenu && (
              <div className="ff-more-tabs-menu">
                {dropdownLeagueTabs.map(t => {
                  const locked = isTabDisabled(t.id);
                  return (
                    <button key={t.id}
                      className={`ff-more-tab-item${activeTab === t.id ? ' active' : ''}${locked ? ' disabled' : ''}`}
                      aria-disabled={locked || undefined}
                      title={locked ? 'Complete the draft first' : undefined}
                      onClick={(e) => {
                        if (locked) {
                          e.currentTarget.animate([
                            { transform: 'translateX(0)' },
                            { transform: 'translateX(-3px)' },
                            { transform: 'translateX(3px)' },
                            { transform: 'translateX(-2px)' },
                            { transform: 'translateX(2px)' },
                            { transform: 'translateX(0)' },
                          ], { duration: 300, easing: 'ease-in-out' });
                          setLockToast(true);
                          setTimeout(() => setLockToast(false), 2000);
                          return;
                        }
                        setActiveTab(t.id); setShowMoreMenu(false);
                      }}>
                      {locked ? TAB_ICONS.locked : TAB_ICONS[t.id]}{t.label}
                    </button>
                  );
                })}
                <div className="ff-more-tabs-divider" />
                {SECONDARY_TABS.map(t => (
                  <button key={t.id}
                    className={`ff-more-tab-item${activeTab === t.id ? ' active' : ''}`}
                    onClick={() => { setActiveTab(t.id); setShowMoreMenu(false); }}>
                    {TAB_ICONS[t.id]}{t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </header>

      {/* Player / Team / Matchup detail views — keep sidebar visible */}
      {viewingPlayerId ? (
        <DetailViewLayout
          onBack={closePlayer}
          backLabel={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          currentLabel="Player Details"
          rosters={draftedRosters} leagueName={league.name} onTeamClick={handleTeamClick}
        >
          <PlayerStats playerId={viewingPlayerId} onBack={closePlayer} />
        </DetailViewLayout>
      ) : viewingTeamId ? (
        <DetailViewLayout
          onBack={closeTeam}
          backLabel={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          currentLabel="Team Details"
          rosters={draftedRosters} leagueName={league.name} onTeamClick={handleTeamClick}
        >
          <TeamPage teamId={viewingTeamId} rosters={draftedRosters} onBack={closeTeam} onPlayerClick={handlePlayerClick} />
        </DetailViewLayout>
      ) : viewingMatchupId ? (
        <DetailViewLayout
          onBack={closeMatchup}
          backLabel="Matchups"
          currentLabel="Matchup Detail"
          rosters={draftedRosters} leagueName={league.name} onTeamClick={handleTeamClick}
        >
          <MatchupDetail matchup={MATCHUPS.find(m => m.id === viewingMatchupId) || MATCHUPS[0]} rosters={draftedRosters} onBack={closeMatchup} onPlayerClick={handlePlayerClick} />
        </DetailViewLayout>
      ) : <>

      {/* Tab Content */}
      {activeTab === 'draft' && (
        <div className="ff-tab-content" style={{ padding: 0, maxWidth: 'none' }}>
          {draftLoading ? (
            <div className="ff-draft-loading">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
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
                  <CommandCenter
                    rosters={draftedRosters}
                    scoringPreset={league.scoring_preset || 'ppr'}
                    leagueName={league.name}
                    onPlayerClick={handlePlayerClick}
                    onMatchupClick={handleMatchupClick}
                    onTabSwitch={setActiveTab}
                  />
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
            <TradeCenter rosters={draftedRosters} onRostersChange={setDraftedRosters} scoringPreset={league.scoring_preset} leagueId={leagueId} onOpenCompare={(ids) => { setCompareInitIds(ids); setActiveTab('compare'); }} />
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
          <PlayerCompare
            rosters={draftedRosters}
            scoringPreset={league.scoring_preset}
            leagueId={leagueId}
            onOpenTrade={draftComplete ? (sendIds, receiveIds) => {
              setActiveTab('trades');
            } : undefined}
            initialPlayerIds={compareInitIds}
          />
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

      {activeTab === 'news' && (
        <div className="ff-tab-content">
          <div className="ff-overview-layout">
            <div className="ff-overview-grid">
              <div className="ff-left">
                <NewsFeed onPlayerClick={handlePlayerClick} />
              </div>
              <div className="ff-right">
                <StandingsCard rosters={draftedRosters} leagueName={league.name} onTeamClick={handleTeamClick} />
                <PowerRankingsCard rosters={draftedRosters} />
              </div>
            </div>
          </div>
        </div>
      )}
      </>}
      {lockToast && (
        <div className="ff-draft-toast" style={{ animation: 'toastUp 0.3s ease-out' }}>
          <svg viewBox="0 0 14 15.5" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d={HEX}/><rect x="5" y="7.5" width="4" height="3" rx="0.5"/><path d="M5.8 7.5V6.5a1.2 1.2 0 012.4 0v1"/>
          </svg>
          Complete the draft first
        </div>
      )}
    </div>
  );
}
