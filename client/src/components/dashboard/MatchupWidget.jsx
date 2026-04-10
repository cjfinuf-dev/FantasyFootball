import { useState, useMemo } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { MATCHUPS } from '../../data/matchups';
import { PLAYERS } from '../../data/players';
import { getEspnId } from '../../data/espnIds';
import { getMatchupWinProb } from '../../utils/winProb';
import PosBadge from '../ui/PosBadge';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PlayerLink from '../ui/PlayerLink';
import HexBrand from '../ui/HexBrand';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

function getTeamProjection(teamId, rosters) {
  if (!rosters || !rosters[teamId]) return 0;
  return rosters[teamId].reduce((sum, pid) => {
    const p = PLAYER_MAP[pid];
    return sum + (p ? p.proj : 0);
  }, 0);
}

function getTopPlayers(teamId, rosters, count = 3) {
  if (!rosters || !rosters[teamId]) return [];
  return rosters[teamId]
    .map(pid => PLAYER_MAP[pid])
    .filter(Boolean)
    .sort((a, b) => b.proj - a.proj)
    .slice(0, count);
}

function WinProbBar({ homeProb }) {
  const homePct = (homeProb * 100).toFixed(1);
  const awayPct = (100 - homeProb * 100).toFixed(1);

  return (
    <div className="ff-winprob" aria-label={`Win probability: Home ${homePct}%, Away ${awayPct}%`}>
      <span className="ff-winprob-label tabular-nums" style={{ color: 'var(--accent)', fontWeight: 700 }}>{homePct}%</span>
      <div className="ff-winprob-bar" style={{ position: 'relative' }}>
        <div className="ff-winprob-fill" style={{ width: `${homePct}%`, background: 'var(--accent)', borderRadius: '3px 0 0 3px' }} />
        <div className="ff-winprob-fill" style={{ width: `${awayPct}%`, background: 'var(--accent-secondary)', borderRadius: '0 3px 3px 0' }} />
        <div style={{
          position: 'absolute', top: -1, bottom: -1,
          left: `${homePct}%`, transform: 'translateX(-1px)',
          width: 2, background: 'var(--bg)', zIndex: 1,
          boxShadow: '0 0 0 1px var(--border)',
        }} />
      </div>
      <span className="ff-winprob-label tabular-nums" style={{ color: 'var(--accent-secondary-text)', fontWeight: 700 }}>{awayPct}%</span>
    </div>
  );
}

function TeamRecord({ team }) {
  return (
    <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>
      {team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ''}
    </span>
  );
}

function StreakBadge({ streak }) {
  if (!streak) return null;
  const isWin = streak.startsWith('W');
  return (
    <span className={`ff-streak ${isWin ? 'hot' : 'cold'}`} style={{ fontSize: 12 }}>
      {streak}
    </span>
  );
}

function PlayerRow({ player, onPlayerClick }) {
  const injuryStatus = player.status !== 'healthy' ? player.status : null;
  return (
    <div className="ff-matchup-player">
      <span className="ff-matchup-player-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <PlayerHeadshot espnId={getEspnId(player.name)} name={player.name} size="xs" pos={player.pos} team={player.team} />
        <PosBadge pos={player.pos} size="xs" />
        <PlayerLink name={player.name} playerId={player.id} onPlayerClick={onPlayerClick} />
        {injuryStatus && (
          <span style={{ fontSize: 11, fontWeight: 800, color: injuryStatus === 'out' ? 'var(--injury-out)' : 'var(--injury-questionable)', lineHeight: 1 }}>
            {injuryStatus === 'out' ? 'O' : 'Q'}
          </span>
        )}
      </span>
      <span style={{ fontWeight: 600 }} className="tabular-nums">{player.proj}</span>
    </div>
  );
}

function MatchupCard({ matchup, expanded, rosters, onPlayerClick, onToggle, onMatchupClick }) {
  const homeTeam = TEAMS.find(t => t.id === matchup.home.teamId);
  const awayTeam = TEAMS.find(t => t.id === matchup.away.teamId);
  const homeRoster = rosters?.[matchup.home.teamId] || [];
  const awayRoster = rosters?.[matchup.away.teamId] || [];
  const homeProb = homeRoster.length && awayRoster.length
    ? getMatchupWinProb(homeRoster, awayRoster, PLAYER_MAP)
    : (matchup.home.projected + matchup.away.projected > 0
      ? matchup.home.projected / (matchup.home.projected + matchup.away.projected)
      : 0.5);
  const isTossUp = homeProb > 0.45 && homeProb < 0.55;
  const homeFavored = homeProb >= 0.55;
  const awayFavored = homeProb <= 0.45;
  const isUserMatchup = matchup.home.teamId === USER_TEAM_ID || matchup.away.teamId === USER_TEAM_ID;

  const playerCount = expanded ? 5 : 3;
  const homePlayers = getTopPlayers(matchup.home.teamId, rosters, playerCount);
  const awayPlayers = getTopPlayers(matchup.away.teamId, rosters, playerCount);
  const hasRosters = homePlayers.length > 0 || awayPlayers.length > 0;

  return (
    <div
      className={`ff-card${isUserMatchup ? ' ff-card-user-matchup' : ''}`}
      style={onToggle ? { cursor: 'pointer' } : undefined}
      onClick={onToggle ? () => onToggle(matchup.id) : undefined}
      aria-expanded={onToggle ? expanded : undefined}
      role={onToggle ? 'button' : undefined}
      tabIndex={onToggle ? 0 : undefined}
      onKeyDown={onToggle ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(matchup.id); } } : undefined}
    >
      <div className="ff-card-top-accent" style={{ background: isUserMatchup ? 'var(--accent)' : 'var(--border-strong)' }} />

      {isUserMatchup && (
        <div className="ff-your-matchup-label" style={{
          position: 'absolute', top: 0, left: 16,
          transform: 'translateY(-50%)',
          padding: '3px 10px', borderRadius: 'var(--radius-sm)',
          background: 'var(--accent)', color: 'var(--on-accent)',
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', lineHeight: '18px',
          zIndex: 2,
        }}>Your Matchup</div>
      )}
      {expanded && (
        <div className="ff-card-header">
          <h2>{isUserMatchup ? 'Matchup Details' : 'Matchup Preview'}</h2>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Week 12</span>
        </div>
      )}

      <div className={expanded ? 'ff-matchup' : 'ff-matchup ff-matchup-compact'}>
        {/* Home Team */}
        <div className="ff-matchup-team">
          <div className="ff-matchup-team-name" style={!expanded ? { fontSize: 15 } : undefined}>{homeTeam.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <TeamRecord team={homeTeam} />
            <StreakBadge streak={homeTeam.streak} />
          </div>
          <div className="ff-matchup-score tabular-nums" style={!expanded ? { fontSize: 26 } : undefined}>
            {matchup.home.projected.toFixed(1)}
          </div>
          <div className="ff-matchup-projected tabular-nums">Projected</div>
          {hasRosters && homePlayers.length > 0 && (
            <div className="ff-matchup-players">
              {homePlayers.map((p, i) => (
                <PlayerRow key={i} player={p} onPlayerClick={onPlayerClick} />
              ))}
            </div>
          )}
        </div>

        {/* VS Divider */}
        <div className="ff-matchup-vs"><span>VS</span></div>

        {/* Away Team */}
        <div className="ff-matchup-team">
          <div className="ff-matchup-team-name" style={!expanded ? { fontSize: 15 } : undefined}>{awayTeam.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <TeamRecord team={awayTeam} />
            <StreakBadge streak={awayTeam.streak} />
          </div>
          <div className="ff-matchup-score tabular-nums" style={!expanded ? { fontSize: 26 } : undefined}>
            {matchup.away.projected.toFixed(1)}
          </div>
          <div className="ff-matchup-projected tabular-nums">Projected</div>
          {hasRosters && awayPlayers.length > 0 && (
            <div className="ff-matchup-players">
              {awayPlayers.map((p, i) => (
                <PlayerRow key={i} player={p} onPlayerClick={onPlayerClick} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Win Probability */}
      <div style={{ padding: expanded ? '0 20px 16px' : '0 0 12px' }}>
        <WinProbBar homeProb={homeProb} />
      </div>

      {/* View Full Matchup link */}
      {expanded && onMatchupClick && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={(e) => { e.stopPropagation(); onMatchupClick(matchup.id); }}
            style={{ fontSize: 14 }}>
            View Full <HexBrand word="Analysis" icon={false} />
          </button>
        </div>
      )}

      {/* Expand hint for compact cards */}
      {!expanded && onToggle && (
        <div style={{
          padding: '5px 12px', textAlign: 'center', fontSize: 13,
          color: 'var(--accent-text)', borderTop: '1px solid var(--border)',
          fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          <svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="1,1 5,5 9,1"/></svg>
          {hasRosters ? 'See rosters' : 'Expand'}
        </div>
      )}
    </div>
  );
}

export default function MatchupWidget({ mode = 'featured', rosters, onPlayerClick, onMatchupClick }) {
  const [expandedId, setExpandedId] = useState(null);

  const matchups = useMemo(() => {
    if (!rosters) return MATCHUPS;
    return MATCHUPS.map(m => {
      const homeProj = getTeamProjection(m.home.teamId, rosters);
      const awayProj = getTeamProjection(m.away.teamId, rosters);
      return {
        ...m,
        home: { ...m.home, projected: homeProj || m.home.projected },
        away: { ...m.away, projected: awayProj || m.away.projected },
      };
    });
  }, [rosters]);

  const userMatchup = matchups.find(
    m => m.home.teamId === USER_TEAM_ID || m.away.teamId === USER_TEAM_ID
  ) || matchups[0];

  // Overview mode — single featured matchup
  if (mode === 'featured') {
    return <MatchupCard matchup={userMatchup} expanded rosters={rosters} onPlayerClick={onPlayerClick} onMatchupClick={onMatchupClick} />;
  }

  // Full matchups page
  const otherMatchups = matchups.filter(m => m.id !== userMatchup.id);

  const handleToggle = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* User's matchup — always expanded at top */}
      <div>
        <MatchupCard matchup={userMatchup} expanded rosters={rosters} onPlayerClick={onPlayerClick} onMatchupClick={onMatchupClick} />
      </div>

      {/* Section label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 4px', fontSize: 13, fontWeight: 600,
        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        <span>Other Matchups</span>
        <span style={{ fontWeight: 400 }}>&middot;</span>
        <span style={{ fontWeight: 400 }}>{otherMatchups.length}</span>
      </div>

      {/* Matchup grid */}
      <div className="ff-matchups-grid">
        {otherMatchups.map(m => (
          expandedId === m.id ? (
            <div key={m.id} style={{ gridColumn: '1 / -1' }}>
              <MatchupCard matchup={m} expanded rosters={rosters} onPlayerClick={onPlayerClick} onToggle={handleToggle} onMatchupClick={onMatchupClick} />
            </div>
          ) : (
            <MatchupCard key={m.id} matchup={m} expanded={false} rosters={rosters} onPlayerClick={onPlayerClick} onToggle={handleToggle} onMatchupClick={onMatchupClick} />
          )
        ))}
      </div>
    </div>
  );
}
