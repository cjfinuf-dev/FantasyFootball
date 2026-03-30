import { useState, useEffect } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { MATCHUPS } from '../../data/matchups';
import { TEAM_ROSTERS_SEED } from '../../data/rosters';
import { PLAYERS } from '../../data/players';
import PosBadge from '../ui/PosBadge';

function calcWinProb(projA, projB) {
  const spread = projA - projB;
  return 1 / (1 + Math.exp(-spread / 7));
}

function getTopPlayers(teamId, count = 3) {
  const roster = TEAM_ROSTERS_SEED[teamId] || [];
  return roster
    .map(pid => PLAYERS.find(p => p.id === pid))
    .filter(Boolean)
    .sort((a, b) => b.pts - a.pts)
    .slice(0, count);
}

function WinProbBar({ homeProb }) {
  const homePct = Math.round(homeProb * 100);
  const awayPct = 100 - homePct;
  const isTossUp = homeProb > 0.45 && homeProb < 0.55;
  const homeColor = isTossUp ? 'var(--wp-even)' : homeProb >= 0.55 ? 'var(--wp-fav)' : 'var(--wp-dog)';
  const awayColor = isTossUp ? 'var(--wp-even)' : homeProb <= 0.45 ? 'var(--wp-fav)' : 'var(--wp-dog)';
  return (
    <div className="ff-winprob">
      <span className="ff-winprob-label" style={{ color: homeColor }}>{homePct}%</span>
      <div className="ff-winprob-bar">
        <div className="ff-winprob-fill" style={{ width: `${homePct}%`, background: homeColor, borderRadius: '3px 0 0 3px' }} />
        <div className="ff-winprob-fill" style={{ width: `${awayPct}%`, background: awayColor, borderRadius: '0 3px 3px 0' }} />
      </div>
      <span className="ff-winprob-label" style={{ color: awayColor }}>{awayPct}%</span>
    </div>
  );
}

function MatchupCard({ matchup, expanded }) {
  const homeTeam = TEAMS.find(t => t.id === matchup.home.teamId);
  const awayTeam = TEAMS.find(t => t.id === matchup.away.teamId);
  const homeProb = calcWinProb(matchup.home.projected, matchup.away.projected);
  const isTossUp = homeProb > 0.45 && homeProb < 0.55;
  const homeFavored = homeProb >= 0.55;
  const awayFavored = homeProb <= 0.45;
  const isLive = matchup.status === 'in_progress';
  const homeWinning = matchup.home.score >= matchup.away.score;

  const homePlayers = expanded ? getTopPlayers(matchup.home.teamId) : [];
  const awayPlayers = expanded ? getTopPlayers(matchup.away.teamId) : [];

  return (
    <div className="ff-card">
      <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
      {expanded && (
        <div className="ff-card-header">
          <h2>{isLive && <span className="ff-live-dot" style={{ marginRight: 4 }}></span>} This Week's Matchup</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sunday 1:00 PM</span>
        </div>
      )}
      <div className={expanded ? 'ff-matchup' : 'ff-matchup ff-matchup-compact'}>
        <div className="ff-matchup-team">
          <div style={{ fontSize: expanded ? 24 : 18, marginBottom: 4 }}>{homeTeam.logo}</div>
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
          <div className="ff-matchup-projected">Proj: {matchup.home.projected}</div>
          <span className={`ff-matchup-tag ${isTossUp ? 'ff-tag-even' : homeFavored ? 'ff-tag-fav' : 'ff-tag-dog'}`}>
            {isTossUp ? 'Toss-Up' : homeFavored ? 'Favorite' : 'Underdog'}
          </span>
          {expanded && homePlayers.length > 0 && (
            <div className="ff-matchup-players">
              {homePlayers.map((p, i) => (
                <div className="ff-matchup-player" key={i}>
                  <span className="ff-matchup-player-name"><PosBadge pos={p.pos} /> {p.name}</span>
                  <span style={{ fontWeight: 600 }}>{p.pts}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="ff-matchup-vs"><span>VS</span></div>
        <div className="ff-matchup-team">
          <div style={{ fontSize: expanded ? 24 : 18, marginBottom: 4 }}>{awayTeam.logo}</div>
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
          <div className="ff-matchup-projected">Proj: {matchup.away.projected}</div>
          <span className={`ff-matchup-tag ${isTossUp ? 'ff-tag-even' : awayFavored ? 'ff-tag-fav' : 'ff-tag-dog'}`}>
            {isTossUp ? 'Toss-Up' : awayFavored ? 'Favorite' : 'Underdog'}
          </span>
          {expanded && awayPlayers.length > 0 && (
            <div className="ff-matchup-players">
              {awayPlayers.map((p, i) => (
                <div className="ff-matchup-player" key={i}>
                  <span className="ff-matchup-player-name"><PosBadge pos={p.pos} /> {p.name}</span>
                  <span style={{ fontWeight: 600 }}>{p.pts}</span>
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

export default function MatchupWidget({ mode = 'featured' }) {
  const userMatchup = MATCHUPS.find(
    m => m.home.teamId === USER_TEAM_ID || m.away.teamId === USER_TEAM_ID
  ) || MATCHUPS[0];

  const [liveScores, setLiveScores] = useState(() => {
    const live = {};
    MATCHUPS.filter(m => m.status === 'in_progress').forEach(m => {
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
    return <MatchupCard matchup={getMatchupWithLive(userMatchup)} expanded />;
  }

  return (
    <div>
      <div className="ff-card" style={{ marginBottom: 16 }}>
        <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
        <div className="ff-card-header">
          <h2>This Week's Matchups</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Week 12</span>
        </div>
      </div>
      <div className="ff-matchups-grid">
        {MATCHUPS.map(m => (
          <MatchupCard key={m.id} matchup={getMatchupWithLive(m)} expanded={false} />
        ))}
      </div>
    </div>
  );
}
