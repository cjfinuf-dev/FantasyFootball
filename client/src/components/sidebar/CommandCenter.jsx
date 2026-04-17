import { useState, useMemo } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { MATCHUPS } from '../../data/matchups';
import { PLAYERS } from '../../data/players';
import { WAIVERS } from '../../data/waivers';
import { TRADES_SEED } from '../../data/rosters';
import { getByeWeek } from '../../data/nflSchedule';
import { useLiveTick, useAnyGameActive } from '../../hooks/useLiveTick';
import { useLiveDelta } from '../../hooks/useLiveDelta';
import { getHexScore, formatHex } from '../../utils/hexScore';
import { getStarterIds } from '../../utils/winProb';
import { computeLiveTeamScore } from '../../utils/liveScoring';
import { runSimulations, getStatus, getMagicNumber, GAMES_PLAYED } from '../../utils/playoffCalc';
import { getAllAlerts } from '../../utils/rosterAlerts';
import PosBadge from '../ui/PosBadge';
import AnimatedNumber from '../ui/AnimatedNumber';
import ScoreDelta from '../ui/ScoreDelta';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

const CURRENT_WEEK = GAMES_PLAYED + 1;

// Position grades (from PowerRankingsCard pattern)
const STARTER_COUNTS = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 };

function getPositionGrades(teamId, rosters, scoringPreset) {
  if (!rosters || !rosters[teamId]) return {};
  const players = rosters[teamId].map(pid => PLAYER_MAP[pid]).filter(Boolean);
  const grades = {};
  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    const posPlayers = players.filter(p => p.pos === pos);
    const hexes = posPlayers.map(p => getHexScore(p.id, scoringPreset)).sort((a, b) => b - a);
    const starterCount = STARTER_COUNTS[pos] || 1;
    const starterHex = hexes.slice(0, starterCount);
    const avgStarterHex = starterHex.length > 0 ? starterHex.reduce((a, b) => a + b, 0) / starterHex.length : 0;
    let grade;
    if (avgStarterHex >= 80) grade = 'A';
    else if (avgStarterHex >= 65) grade = 'B';
    else if (avgStarterHex >= 50) grade = 'C';
    else if (avgStarterHex >= 35) grade = 'D';
    else grade = 'F';
    grades[pos] = grade;
  }
  return grades;
}

export default function CommandCenter({ rosters, scoringPreset, leagueName, onPlayerClick, onMatchupClick, onTabSwitch }) {
  const tick = useLiveTick();
  const gamesActive = useAnyGameActive();

  // ─── Matchup Snapshot ───
  const matchup = useMemo(() => {
    return MATCHUPS.find(m => m.home.teamId === USER_TEAM_ID || m.away.teamId === USER_TEAM_ID);
  }, []);

  const matchupData = useMemo(() => {
    if (!matchup || !rosters) return null;
    const isHome = matchup.home.teamId === USER_TEAM_ID;
    const userSide = isHome ? matchup.home : matchup.away;
    const oppSide = isHome ? matchup.away : matchup.home;
    const oppTeam = TEAMS.find(t => t.id === oppSide.teamId);

    // Live-aware projections: sum actual + remaining (projected) across starters.
    // Pre-game this equals pure projection; in-game it evolves as points lock in.
    const userStarters = getStarterIds(rosters[userSide.teamId] || [], PLAYER_MAP);
    const oppStarters = getStarterIds(rosters[oppSide.teamId] || [], PLAYER_MAP);
    const userLive = computeLiveTeamScore(userStarters, PLAYER_MAP);
    const oppLive = computeLiveTeamScore(oppStarters, PLAYER_MAP);

    const userProj = userLive.projected || userSide.projected;
    const oppProj = oppLive.projected || oppSide.projected;

    const totalProj = userProj + oppProj;
    const userWinProb = totalProj > 0 ? userProj / totalProj : 0.5;

    let label, labelClass;
    if (userWinProb >= 0.6) { label = 'Favored'; labelClass = 'cc-wp-favored'; }
    else if (userWinProb <= 0.4) { label = 'Underdog'; labelClass = 'cc-wp-underdog'; }
    else { label = 'Coin Flip'; labelClass = 'cc-wp-coinflip'; }

    return {
      userProj,
      oppProj,
      userActual: userLive.actual,
      oppActual: oppLive.actual,
      oppAbbr: oppTeam?.abbr || '???',
      oppRecord: oppTeam ? `${oppTeam.wins}-${oppTeam.losses}` : '',
      winProb: userWinProb,
      label,
      labelClass,
      matchupId: matchup.id,
      isLive: userLive.playing > 0 || oppLive.playing > 0 || userLive.final > 0 || oppLive.final > 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchup, rosters, tick]);

  // ─── Action Items ───
  const alerts = useMemo(() => {
    if (!rosters) return [];
    return getAllAlerts(rosters, PLAYER_MAP, CURRENT_WEEK, TRADES_SEED, USER_TEAM_ID);
  }, [rosters, tick]);

  // ─── Playoff Pulse ───
  const playoffData = useMemo(() => {
    const results = runSimulations(TEAMS);
    const userResult = results.find(t => t.id === USER_TEAM_ID);
    if (!userResult) return null;
    const status = getStatus(userResult);
    const magic = getMagicNumber(userResult);

    let contextLine;
    if (status?.cls === 'clinched') contextLine = 'Playoff spot clinched';
    else if (magic === 1) contextLine = 'Win and clinch';
    else if (status?.cls === 'eliminated') contextLine = 'Eliminated from contention';
    else if (magic && magic > 1) contextLine = `${magic} wins to clinch`;
    else contextLine = 'On the bubble';

    return {
      playoffPct: userResult.playoffPct,
      status,
      contextLine,
    };
  }, []);

  // ─── Your Standing ───
  const standingData = useMemo(() => {
    const sorted = [...TEAMS].sort((a, b) => b.wins - a.wins || b.pf - a.pf);
    const userTeam = TEAMS.find(t => t.id === USER_TEAM_ID);
    const currentRank = sorted.findIndex(t => t.id === USER_TEAM_ID) + 1;
    const movement = userTeam.rank - currentRank; // positive = moved up
    const grades = rosters ? getPositionGrades(USER_TEAM_ID, rosters, scoringPreset) : null;

    return {
      rank: currentRank,
      total: TEAMS.length,
      movement,
      record: `${userTeam.wins}-${userTeam.losses}`,
      streak: userTeam.streak,
      grades,
    };
  }, [rosters, scoringPreset]);

  // ─── Trending Pickups ───
  const trending = useMemo(() => {
    return WAIVERS.slice(0, 3).map(w => ({
      ...w,
      hexScore: getHexScore(w.playerId, scoringPreset),
    }));
  }, [scoringPreset]);

  const { delta: userDelta, tier: userTier } = useLiveDelta(matchupData?.userProj ?? null);
  const { delta: oppDelta, tier: oppTier } = useLiveDelta(matchupData?.oppProj ?? null);

  const [collapsed, setCollapsed] = useState({ playoff: true, standing: true, trending: true });
  const toggleSection = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const chevron = (key) => (
    <svg className={`cc-section-chevron${!collapsed[key] ? ' open' : ''}`} viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="1,1 5,5 9,1"/></svg>
  );

  const hasDraftData = rosters && Object.values(rosters).some(r => r.length > 0);

  if (!hasDraftData) {
    return (
      <div className="ff-sidebar-card">
        <div className="ff-sidebar-card-header"><h3>Command Center</h3></div>
        <div className="ff-sidebar-card-body">
          <div className="ff-empty-state" style={{ padding: '24px 16px' }}>
            <div className="ff-empty-state-title">Draft Pending</div>
            <div className="ff-empty-state-desc">Your command center activates once the draft is complete.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ff-sidebar-card cc-command-center">
      <div className="ff-sidebar-card-header">
        <h3>
          <svg viewBox="0 0 14 15.5" width="14" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px', marginRight: '4px' }}>
            <path d="M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z"/>
          </svg>
          Command Center
        </h3>
      </div>
      {/* ═══ 1. MATCHUP SNAPSHOT ═══ */}
      {matchupData && (
        <div className="cc-section cc-matchup">
          <div className="cc-section-label">This Week's Matchup</div>
          <button type="button" className="cc-matchup-btn" onClick={() => onMatchupClick?.(matchupData.matchupId)}>
          <div className="cc-matchup-row">
            <div className="cc-matchup-you">
              <span className="cc-matchup-proj tabular-nums">
                <AnimatedNumber value={matchupData.userProj} decimals={1} />
                <ScoreDelta value={userDelta} tier={userTier} position="inline" />
              </span>
              <span className="cc-matchup-side">You</span>
            </div>
            <div className="cc-matchup-vs">
              <span className={`cc-wp-label ${matchupData.labelClass}`}>{matchupData.label}</span>
              <div className="ff-winprob-bar cc-wp-bar">
                <div className="ff-winprob-fill cc-wp-fill-user" style={{ width: `${(matchupData.winProb * 100).toFixed(1)}%` }} />
                <div className="ff-winprob-fill cc-wp-fill-opp" style={{ width: `${((1 - matchupData.winProb) * 100).toFixed(1)}%` }} />
              </div>
              <span className="cc-wp-pct tabular-nums"><AnimatedNumber value={matchupData.winProb * 100} decimals={0} suffix="%" /></span>
            </div>
            <div className="cc-matchup-opp">
              <span className="cc-matchup-proj tabular-nums">
                <AnimatedNumber value={matchupData.oppProj} decimals={1} />
                <ScoreDelta value={oppDelta} tier={oppTier} position="inline" />
              </span>
              <span className="cc-matchup-side">{matchupData.oppAbbr} <span className="cc-matchup-rec">{matchupData.oppRecord}</span></span>
            </div>
          </div>
          </button>
        </div>
      )}

      {/* ═══ 2. ACTION ITEMS ═══ */}
      <div className="cc-section cc-actions">
        <div className="cc-section-label">Action Items</div>
        {alerts.length === 0 ? (
          <div className="cc-actions-empty">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="var(--success-green)" strokeWidth="2" strokeLinecap="round"><path d="M3.5 8.5l3 3 6-7"/></svg>
            <span>You're all set this week</span>
          </div>
        ) : (
          <div className="cc-actions-list">
            {alerts.map((alert, i) => (
              <button
                key={i}
                className="cc-action-row"
                onClick={() => {
                  if (alert.type === 'trade') onTabSwitch?.('trades');
                  else onTabSwitch?.('lineup');
                }}
              >
                <span className={`cc-severity-dot cc-severity-${alert.severity}`} />
                <span className="cc-action-text">
                  {alert.type === 'bye' && `${alert.player.name} on bye (${alert.slotLabel})`}
                  {alert.type === 'injury' && `${alert.player.name} ruled OUT (${alert.slotLabel})`}
                  {alert.type === 'start-sit' && `Start ${alert.bench.name} over ${alert.starter.name} (+${alert.delta})`}
                  {alert.type === 'empty' && `Empty ${alert.slotLabel} slot`}
                  {alert.type === 'trade' && `${alert.count} pending trade${alert.count > 1 ? 's' : ''}`}
                </span>
                <svg className="cc-action-chevron" viewBox="0 0 8 12" width="6" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1.5 1l5 5-5 5"/></svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══ 3. PLAYOFF PULSE ═══ */}
      {playoffData && (
        <div className={`cc-section cc-playoff${collapsed.playoff ? ' cc-collapsed' : ''}`}>
          <button className="cc-section-toggle" onClick={() => toggleSection('playoff')}>
            <span className="cc-section-label">Playoff Pulse</span>
            {chevron('playoff')}
          </button>
          {!collapsed.playoff && <div className="cc-playoff-row">
            <div className="cc-playoff-big tabular-nums"><AnimatedNumber value={playoffData.playoffPct} decimals={1} suffix="%" /></div>
            <div className="cc-playoff-detail">
              {playoffData.status && (
                <span className={`cc-playoff-badge cc-playoff-badge--${playoffData.status.cls}`}>
                  {playoffData.status.label}
                </span>
              )}
              <span className="cc-playoff-context">{playoffData.contextLine}</span>
            </div>
          </div>}
        </div>
      )}

      {/* ═══ 4. YOUR STANDING ═══ */}
      <div className={`cc-section cc-standing${collapsed.standing ? ' cc-collapsed' : ''}`}>
        <button className="cc-section-toggle" onClick={() => toggleSection('standing')}>
          <span className="cc-section-label">Your Standing</span>
          {chevron('standing')}
        </button>
        {!collapsed.standing && <div className="cc-standing-row">
          <span className="cc-standing-rank tabular-nums">#{standingData.rank}<span className="cc-standing-of"> of {standingData.total}</span></span>
          <span className={`cc-standing-movement${standingData.movement > 0 ? ' cc-move-up' : standingData.movement < 0 ? ' cc-move-down' : ''}`}>
            {standingData.movement > 0 ? '\u25B2' : standingData.movement < 0 ? '\u25BC' : '\u2022'}
          </span>
          <span className="cc-standing-record tabular-nums">{standingData.record}</span>
          <span className={`cc-standing-streak${standingData.streak.startsWith('W') ? ' cc-streak-w' : ' cc-streak-l'}`}>{standingData.streak}</span>
          {standingData.grades && (
            <div className="cc-grades">
              {Object.entries(standingData.grades).map(([pos, grade]) => (
                <span key={pos} className={`cc-grade-chip cc-grade-${grade.toLowerCase()}`}>
                  <span className="cc-grade-pos">{pos}</span>
                  <span className="cc-grade-letter">{grade}</span>
                </span>
              ))}
            </div>
          )}
        </div>}
      </div>

      {/* ═══ 5. TRENDING PICKUPS ═══ */}
      <div className={`cc-section cc-trending${collapsed.trending ? ' cc-collapsed' : ''}`}>
        <button className="cc-section-toggle" onClick={() => toggleSection('trending')}>
          <span className="cc-section-label">Trending Pickups</span>
          {chevron('trending')}
        </button>
        {!collapsed.trending && <>
        {trending.map(w => (
          <button type="button" key={w.playerId} className="cc-trending-row cc-trending-btn" onClick={() => onPlayerClick?.(w.playerId)}>
            <PosBadge pos={w.pos} size="xs" />
            <span className="cc-trending-name">{w.name}</span>
            <span className={`cc-trending-trend cc-trend-${w.trend}`}>{w.trend === 'up' ? '\u25B2' : '\u25BC'} {w.trendPct}%</span>
            <span className="cc-trending-hex tabular-nums">{formatHex(w.hexScore)}</span>
          </button>
        ))}
        <button className="cc-view-all" onClick={() => onTabSwitch?.('waivers')}>
          View all <span className="cc-arrow">&rarr;</span>
        </button>
        </>}
      </div>
    </div>
  );
}