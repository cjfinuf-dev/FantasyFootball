import { useState, useMemo } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { MATCHUPS } from '../../data/matchups';
import { PLAYERS } from '../../data/players';
import { getEspnId } from '../../data/espnIds';
import PosBadge from '../ui/PosBadge';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PlayerLink from '../ui/PlayerLink';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

function calcWinProb(projA, projB) {
  const spread = projA - projB;
  return 1 / (1 + Math.exp(-spread / 7));
}

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
  const homePct = Math.round(homeProb * 100);
  const awayPct = 100 - homePct;

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
    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
      {team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ''}
    </span>
  );
}

function StreakBadge({ streak }) {
  if (!streak) return null;
  const isWin = streak.startsWith('W');
  return (
    <span className={`ff-streak ${isWin ? 'hot' : 'cold'}`} style={{ fontSize: 10 }}>
      {streak}
    </span>
  );
}

function PlayerRow({ player, onPlayerClick }) {
  return (
    <div className="ff-matchup-player">
      <span className="ff-matchup-player-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <PlayerHeadshot espnId={getEspnId(player.name)} name={player.name} size="xs" pos={player.pos} team={player.team} />
        <PosBadge pos={player.pos} />
        <PlayerLink name={player.name} playerId={player.id} onPlayerClick={onPlayerClick} />
      </span>
      <span style={{ fontWeight: 600 }} className="tabular-nums">{player.proj}</span>
    </div>
  );
}

function MatchupCard({ matchup, expanded, rosters, onPlayerClick, onToggle }) {
  const homeTeam = TEAMS.find(t => t.id === matchup.home.teamId);
  const awayTeam = TEAMS.find(t => t.id === matchup.away.teamId);
  const homeProb = calcWinProb(matchup.home.projected, matchup.away.projected);
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

      {isUserMatchup && !expanded && (
        <div className="ff-your-matchup-label">Your Matchup</div>
      )}
      {expanded && (
        <div className="ff-card-header">
          <h2>{isUserMatchup ? 'Your Matchup' : 'Matchup Preview'}</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Week 12</span>
        </div>
      )}

      <div className={expanded ? 'ff-matchup' : 'ff-matchup ff-matchup-compact'}>
        {/* Home Team */}
        <div className="ff-matchup-team">
          <div className="ff-matchup-team-name" style={!expanded ? { fontSize: 13 } : undefined}>{homeTeam.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <TeamRecord team={homeTeam} />
            <StreakBadge streak={homeTeam.streak} />
          </div>
          <div className="ff-matchup-score tabular-nums" style={!expanded ? { fontSize: 24 } : undefined}>
            {matchup.home.projected.toFixed(1)}
          </div>
          <div className="ff-matchup-projected tabular-nums">Projected</div>
          <span className={`ff-matchup-tag ${isTossUp ? 'ff-tag-even' : homeFavored ? 'ff-tag-fav' : 'ff-tag-dog'}`}>
            {isTossUp ? 'Toss-Up' : homeFavored ? 'Favorite' : 'Underdog'}
          </span>
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
          <div className="ff-matchup-team-name" style={!expanded ? { fontSize: 13 } : undefined}>{awayTeam.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <TeamRecord team={awayTeam} />
            <StreakBadge streak={awayTeam.streak} />
          </div>
          <div className="ff-matchup-score tabular-nums" style={!expanded ? { fontSize: 24 } : undefined}>
            {matchup.away.projected.toFixed(1)}
          </div>
          <div className="ff-matchup-projected tabular-nums">Projected</div>
          <span className={`ff-matchup-tag ${isTossUp ? 'ff-tag-even' : awayFavored ? 'ff-tag-fav' : 'ff-tag-dog'}`}>
            {isTossUp ? 'Toss-Up' : awayFavored ? 'Favorite' : 'Underdog'}
          </span>
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
      <div style={{ padding: expanded ? '0 20px 16px' : '0 12px 12px' }}>
        <WinProbBar homeProb={homeProb} />
      </div>

      {/* Expand hint for compact cards */}
      {!expanded && onToggle && (
        <div style={{
          padding: '6px 12px', textAlign: 'center', fontSize: 10,
          color: 'var(--text-muted)', borderTop: '1px solid var(--border)',
          fontWeight: 500, letterSpacing: '0.03em',
        }}>
          Click to {hasRosters ? 'see rosters' : 'expand'}
        </div>
      )}
    </div>
  );
}

export default function MatchupWidget({ mode = 'featured', rosters, onPlayerClick }) {
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
    return <MatchupCard matchup={userMatchup} expanded rosters={rosters} onPlayerClick={onPlayerClick} />;
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
        <MatchupCard matchup={userMatchup} expanded rosters={rosters} onPlayerClick={onPlayerClick} />
      </div>

      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 4px',
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700 }}>Other Matchups</h3>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{otherMatchups.length} matchups</span>
      </div>

      {/* Matchup grid */}
      <div className="ff-matchups-grid">
        {otherMatchups.map(m => (
          expandedId === m.id ? (
            <div key={m.id} style={{ gridColumn: '1 / -1' }}>
              <MatchupCard matchup={m} expanded rosters={rosters} onPlayerClick={onPlayerClick} onToggle={handleToggle} />
            </div>
          ) : (
            <MatchupCard key={m.id} matchup={m} expanded={false} rosters={rosters} onPlayerClick={onPlayerClick} onToggle={handleToggle} />
          )
        ))}
      </div>
    </div>
  );
}
