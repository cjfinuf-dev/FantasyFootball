import { useMemo } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { PLAYERS } from '../../data/players';
import { getHexScore } from '../../utils/hexScore';
import Sparkline from '../ui/Sparkline';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

const PLAYOFF_SPOTS = 6;

function getRosterHexTotal(teamId, rosters) {
  if (!rosters || !rosters[teamId]) return 0;
  return rosters[teamId].reduce((sum, pid) => sum + getHexScore(pid), 0);
}

function estimatePlayoffPct(team, rank, totalTeams) {
  // Simple estimate based on rank, win%, and points for
  const winPct = team.wins / Math.max(1, team.wins + team.losses);
  const rankFactor = Math.max(0, 1 - (rank / PLAYOFF_SPOTS));
  const raw = (winPct * 0.6 + rankFactor * 0.4) * 100;
  if (rank < PLAYOFF_SPOTS) return Math.min(99, Math.round(raw + 15));
  if (rank === PLAYOFF_SPOTS) return Math.round(raw);
  return Math.max(1, Math.round(raw - 10));
}

// Generate fake weekly power data for sparklines (based on team stats)
function getWeeklyTrend(team) {
  const base = team.pf / 11;
  const seed = team.id.charCodeAt(1) * 7;
  return [0,1,2,3,4].map((_, i) => {
    const noise = Math.sin(seed + i * 2.1) * 8;
    return Math.round(base + noise);
  });
}

export default function StandingsCard({ expanded = false, rosters, leagueName = 'League', onTeamClick }) {
  const standings = useMemo(() => {
    return [...TEAMS].sort((a, b) => {
      // Sort by wins, then PF as tiebreaker
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pf - a.pf;
    }).map((team, i) => {
      const hexTotal = rosters ? getRosterHexTotal(team.id, rosters) : 0;
      const playoffPct = estimatePlayoffPct(team, i, TEAMS.length);
      const trend = getWeeklyTrend(team);
      const clinched = i < 4 && team.wins >= 8;
      const eliminated = i >= 10 && team.losses >= 9;
      return { ...team, hexTotal, playoffPct, trend, clinched, eliminated, standingRank: i + 1 };
    });
  }, [rosters]);

  const hasDraftData = rosters && Object.values(rosters).some(r => r.length > 0);

  return (
    <div className={`ff-sidebar-card${expanded ? ' expanded' : ''}`}>
      <div className="ff-sidebar-card-header">
        <h3>{leagueName} Standings</h3>
        <span className="ff-mono" style={{ fontSize: 12, color: " }}>
          Wk {TEAMS[0].wins + TEAMS[0].losses}
        </span>
      </div>
      <div className="ff-sidebar-card-body" style={{ padding: 0 }}>
        <div className="ff-table-wrap">
          <table className="ff-standings-table">
            <caption className="ff-skip-link">{leagueName} Standings</caption>
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Team</th>
                <th style={{ textAlign: 'center' }}>Record</th>
                {expanded && <th style={{ textAlign: 'right' }}>PF</th>}
                {expanded && <th style={{ textAlign: 'right' }}>PA</th>}
                <th style={{ textAlign: 'center', width: 52 }}>Trend</th>
                {expanded && <th style={{ textAlign: 'right' }}>Playoff %</th>}
              </tr>
            </thead>
            <tbody>
              {standings.map((team, i) => {
                const isUser = team.id === USER_TEAM_ID;
                const zoneClass = i < PLAYOFF_SPOTS ? 'playoff-zone' : i >= 10 ? 'danger-zone' : 'below-cutline';
                return (
                  <tr key={team.id} className={`${zoneClass} ${isUser ? 'user-team' : ''}`}>
                    <td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 14 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="ff-player-link"
                          style={{ fontWeight: isUser ? 700 : 500, fontSize: 'inherit' }}
                          onClick={() => onTeamClick?.(team.id)}
                        >
                          {expanded ? team.name : team.abbr}
                        </button>
                        {team.clinched && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success-green)', letterSpacing: '0.03em' }}>x</span>}
                        {team.eliminated && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', letterSpacing: '0.03em' }}>e</span>}
                        {!expanded && (
                          <span className="ff-mono" style={{ fontSize: 12, color: team.streak.startsWith(") ? " : " }}>
                            {team.streak}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="ff-mono" style={{ textAlign: ", fontSize: 14, fontWeight: 500 }}>
                      <span style={{ color: 'var(--success-green)' }}>{team.wins}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 2px' }}>-</span>
                      <span style={{ color: 'var(--red)' }}>{team.losses}</span>
                      {expanded && team.streak && (
                        <span style={{
                          marginLeft: 6, fontSize: 12, fontWeight: 600,
                          color: team.streak.startsWith('W') ? 'var(--success-green)' : 'var(--red)',
                        }}>
                          {team.streak}
                        </span>
                      )}
                    </td>
                    {expanded && (
                      <td className="tabular-nums" style={{ textAlign: 'right', fontSize: 14 }}>
                        {team.pf.toFixed(1)}
                      </td>
                    )}
                    {expanded && (
                      <td className="tabular-nums" style={{ textAlign: 'right', fontSize: 14, color: 'var(--text-muted)' }}>
                        {team.pa.toFixed(1)}
                      </td>
                    )}
                    <td style={{ textAlign: 'center' }}>
                      <Sparkline data={team.trend} width={52} height={18} />
                    </td>
                    {expanded && (
                      <td style={{ textAlign: 'right' }}>
                        <span className="ff-mono" style={{
                          fontSize: 14, fontWeight: 600,
                          color: team.playoffPct >= 70 ? 'var(--success-green)' : team.playoffPct <= 20 ? 'var(--red)' : 'var(--text-muted)',
                        }}>
                          {team.playoffPct}%
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Legend */}
        {expanded && (
          <div style={{ padding: '10px 14px', display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            <span><strong style={{ color: 'var(--success-green)' }}>x</strong> = clinched</span>
            <span><strong style={{ color: 'var(--red)' }}>e</strong> = eliminated</span>
            <span>Top {PLAYOFF_SPOTS} make playoffs</span>
          </div>
        )}
      </div>
    </div>
  );
}
