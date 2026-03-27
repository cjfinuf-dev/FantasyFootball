import { useState, useEffect } from 'react';
import { TEAMS } from '../../data/teams';
import { MATCHUPS } from '../../data/matchups';
import PosBadge from '../ui/PosBadge';

export default function MatchupWidget() {
  const [scores, setScores] = useState({ home: 98.4, away: 87.2 });

  useEffect(() => {
    const interval = setInterval(() => {
      setScores(prev => ({
        home: +(prev.home + (Math.random() * 1.8 - 0.4)).toFixed(1),
        away: +(prev.away + (Math.random() * 1.8 - 0.4)).toFixed(1),
      }));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const homeTeam = TEAMS.find(t => t.id === 't1');
  const awayTeam = TEAMS.find(t => t.id === 't2');
  const homeWinning = scores.home >= scores.away;

  const homePlayers = [
    { name: 'P. Mahomes', pos: 'QB', pts: 26.8 },
    { name: 'B. Robinson', pos: 'RB', pts: 22.4 },
    { name: 'T. Hill', pos: 'WR', pts: 24.6 },
  ];
  const awayPlayers = [
    { name: 'J. Allen', pos: 'QB', pts: 24.2 },
    { name: 'S. Barkley', pos: 'RB', pts: 20.1 },
    { name: 'C. Lamb', pos: 'WR', pts: 22.8 },
  ];

  return (
    <div className="ff-card">
      <div className="ff-card-top-accent" style={{ background: 'var(--copper)' }} />
      <div className="ff-card-header">
        <h2><span className="ff-live-dot" style={{ marginRight: 4 }}></span> This Week's Matchup</h2>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sunday 1:00 PM</span>
      </div>
      <div className="ff-matchup">
        <div className="ff-matchup-team">
          <div style={{ fontSize: 24, marginBottom: 4 }}>{homeTeam.logo}</div>
          <div className="ff-matchup-team-name">{homeTeam.name}</div>
          <div className={`ff-matchup-score ${homeWinning ? 'winning' : 'losing'}`}>{scores.home.toFixed(1)}</div>
          <div className="ff-matchup-projected">Projected: {MATCHUPS[0].home.projected}</div>
          <div className="ff-matchup-players">
            {homePlayers.map((p, i) => (
              <div className="ff-matchup-player" key={i}>
                <span className="ff-matchup-player-name"><PosBadge pos={p.pos} /> {p.name}</span>
                <span style={{ fontWeight: 600 }}>{p.pts}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ff-matchup-vs"><span>VS</span></div>
        <div className="ff-matchup-team">
          <div style={{ fontSize: 24, marginBottom: 4 }}>{awayTeam.logo}</div>
          <div className="ff-matchup-team-name">{awayTeam.name}</div>
          <div className={`ff-matchup-score ${!homeWinning ? 'winning' : 'losing'}`}>{scores.away.toFixed(1)}</div>
          <div className="ff-matchup-projected">Projected: {MATCHUPS[0].away.projected}</div>
          <div className="ff-matchup-players">
            {awayPlayers.map((p, i) => (
              <div className="ff-matchup-player" key={i}>
                <span className="ff-matchup-player-name"><PosBadge pos={p.pos} /> {p.name}</span>
                <span style={{ fontWeight: 600 }}>{p.pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
