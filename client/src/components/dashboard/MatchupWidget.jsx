import { useState, useEffect, useMemo } from 'react';
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
    <div className="ff-winprob">
      <span className="ff-winprob-label tabular-nums" style={{ color: 'var(--accent)', fontWeight: 700 }}>{homePct}%</span>
      <div className="ff-winprob-bar" style={{ position: 'relative' }}>
        <div className="ff-winprob-fill" style={{ width: `${homePct}%`, background: 'var(--accent)', borderRadius: '3px 0 0 3px' }} />
        <div className="ff-winprob-fill" style={{ width: `${awayPct}%`, background: 'var(--accent-secondary)', borderRadius: '0 3px 3px 0' }} />
        {/* Divider line at the split point */}
        <div style={{
          position: 'absolute', top: -1, bottom: -1,
          left: `${homePct}%`, transform: 'translateX(-1px)',
          width: 2, background: 'var(--bg)', zIndex: 1,
          boxShadow: '0 0 0 1px var(--border)',
        }} />
      </div>
      <span className="ff-winprob-label tabular-nums" style={{ color: 'var(--accent-secondary)', fontWeight: 700 }}>{awayPct}%</span>
    </div>
  );
}

function MatchupCard({ matchup, expanded, rosters, onPlayerClick }) {
  const homeTeam = TEAMS.find(t => t.id === matchup.home.teamId);
  const awayTeam = TEAMS.find(t => t.id === matchup.away.teamId);
  const homeProb = calcWinProb(matchup.home.projected, matchup.away.projected);
  const isTossUp = homeProb > 0.45 && homeProb < 0.55;
  const homeFavored = homeProb >= 0.55;
  const awayFavored = homeProb <= 0.45;
  const isLive = matchup.status === 'in_progress';
  const homeWinning = matchup.home.score >= matchup.away.score;

  const homePlayers = expanded ? getTopPlayers(matchup.home.teamId, rosters, 4) : [];
  const awayPlayers = expanded ? getTopPlayers(matchup.away.teamId, rosters, 4) : [];


  return (
    <div className="ff-card">
      <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
      {expanded && (
        <div className="ff-card-header">
          <h2>{isLive && <span className="ff-live-dot" style={{ marginRight: 4 }}></span>} This Week's Matchup</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Week 1</span>
        </div>
      )}
      <div className={expanded ? 'ff-matchup' : 'ff-matchup ff-matchup-compact'}>
        <div className="ff-matchup-team">
          <div className="ff-matchup-team-name" style={!expanded ? { fontSize: 13 } : undefined}>{homeTeam.name}</div>
          {isLive ? (
            <div className={`ff-matchup-score ${homeWinning ? 'winning' : 'losing'}`} style={!expanded ? { fontSize: 24 } : undefined}>
              {matchup.home.score.toFixed(1)}
            </div>
          ) : (
            <div className="ff-matchup-score" style={{ color: 'var(--text-muted)', ...(expanded ? {} : { fontSize: 24 }) }}>
              -
            </div>
          )}
          <div className="ff-matchup-projected tabular-nums">Proj: {matchup.home.projected.toFixed(1)}</div>
          <span className={`ff-matchup-tag ${isTossUp ? 'ff-tag-even' : homeFavored ? 'ff-tag-fav' : 'ff-tag-dog'}`}>
            {isTossUp ? 'Toss-Up' : homeFavored ? 'Favorite' : 'Underdog'}
          </span>
          {expanded && homePlayers.length > 0 && (
            <div className="ff-matchup-players">
              {homePlayers.map((p, i) => (
                <div className="ff-matchup-player" key={i}>
                  <span className="ff-matchup-player-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PlayerHeadshot espnId={getEspnId(p.name)} name={p.name} size="xs" pos={p.pos} team={p.team} />
                    <PosBadge pos={p.pos} /> <PlayerLink name={p.name} playerId={p.id} onPlayerClick={onPlayerClick} />
                  </span>
                  <span style={{ fontWeight: 600 }} className="tabular-nums">{p.proj}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="ff-matchup-vs"><span>VS</span></div>
        <div className="ff-matchup-team">
          <div className="ff-matchup-team-name" style={!expanded ? { fontSize: 13 } : undefined}>{awayTeam.name}</div>
          {isLive ? (
            <div className={`ff-matchup-score ${!homeWinning ? 'winning' : 'losing'}`} style={!expanded ? { fontSize: 24 } : undefined}>
              {matchup.away.score.toFixed(1)}
            </div>
          ) : (
            <div className="ff-matchup-score" style={{ color: 'var(--text-muted)', ...(expanded ? {} : { fontSize: 24 }) }}>
              -
            </div>
          )}
          <div className="ff-matchup-projected tabular-nums">Proj: {matchup.away.projected.toFixed(1)}</div>
          <span className={`ff-matchup-tag ${isTossUp ? 'ff-tag-even' : awayFavored ? 'ff-tag-fav' : 'ff-tag-dog'}`}>
            {isTossUp ? 'Toss-Up' : awayFavored ? 'Favorite' : 'Underdog'}
          </span>
          {expanded && awayPlayers.length > 0 && (
            <div className="ff-matchup-players">
              {awayPlayers.map((p, i) => (
                <div className="ff-matchup-player" key={i}>
                  <span className="ff-matchup-player-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PlayerHeadshot espnId={getEspnId(p.name)} name={p.name} size="xs" pos={p.pos} team={p.team} />
                    <PosBadge pos={p.pos} /> <PlayerLink name={p.name} playerId={p.id} onPlayerClick={onPlayerClick} />
                  </span>
                  <span style={{ fontWeight: 600 }} className="tabular-nums">{p.proj}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: expanded ? '0 20px 16px' : '0 12px 12px' }}>
        <WinProbBar homeProb={homeProb} />
      </div>
    </div>
  );
}

export default function MatchupWidget({ mode = 'featured', rosters, onPlayerClick }) {
  // Compute matchups with roster-based projections
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

  const [liveScores, setLiveScores] = useState(() => {
    const live = {};
    matchups.filter(m => m.status === 'in_progress').forEach(m => {
      live[m.id] = { home: m.home.score, away: m.away.score };
    });
    return live;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveScores(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          next[id] = {
            home: +(next[id].home + (Math.random() * 1.8 - 0.4)).toFixed(1),
            away: +(next[id].away + (Math.random() * 1.8 - 0.4)).toFixed(1),
          };
        });
        return next;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const getMatchupWithLive = (m) => {
    if (liveScores[m.id]) {
      return {
        ...m,
        home: { ...m.home, score: liveScores[m.id].home },
        away: { ...m.away, score: liveScores[m.id].away },
      };
    }
    return m;
  };

  if (mode === 'featured') {
    return <MatchupCard matchup={getMatchupWithLive(userMatchup)} expanded rosters={rosters} onPlayerClick={onPlayerClick} />;
  }

  return (
    <div>
      <div className="ff-card" style={{ marginBottom: 16 }}>
        <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
        <div className="ff-card-header">
          <h2>This Week's Matchups</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Week 1</span>
        </div>
      </div>
      <div className="ff-matchups-grid">
        {matchups.map(m => (
          <MatchupCard key={m.id} matchup={getMatchupWithLive(m)} expanded={false} rosters={rosters} onPlayerClick={onPlayerClick} />
        ))}
      </div>
    </div>
  );
}
