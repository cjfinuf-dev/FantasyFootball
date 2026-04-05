import { useMemo } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { PLAYERS } from '../../data/players';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

function getRosterStrength(teamId, rosters) {
  if (!rosters || !rosters[teamId]) return 0;
  return rosters[teamId].reduce((sum, pid) => {
    const p = PLAYER_MAP[pid];
    return sum + (p ? p.proj : 0);
  }, 0);
}

export default function StandingsCard({ expanded = false, rosters, leagueName = 'League' }) {
  const standings = useMemo(() => {
    if (!rosters) {
      // Fallback: use hardcoded team data sorted by wins
      return [...TEAMS].sort((a, b) => b.wins - a.wins || b.pf - a.pf);
    }

    // Compute standings from roster strength (pre-season projection rankings)
    return [...TEAMS].map(team => {
      const totalProj = getRosterStrength(team.id, rosters);
      return { ...team, rosterProj: totalProj };
    }).sort((a, b) => b.rosterProj - a.rosterProj);
  }, [rosters]);

  const hasDraftData = rosters && Object.values(rosters).some(r => r.length > 0);

  return (
    <div className={`ff-sidebar-card${expanded ? ' expanded' : ''}`}>
      <div className="ff-sidebar-card-header">
        <h3>{leagueName} Standings</h3>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{hasDraftData ? 'Projected' : 'Pre-Draft'}</span>
      </div>
      <div className="ff-sidebar-card-body" style={{ padding: 0 }}>
        {!hasDraftData ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Complete the draft to see standings.
          </div>
        ) : (
          <div className="ff-table-wrap">
          <table className="ff-standings-table">
            <caption className="ff-skip-link">{leagueName} Standings — Projected Rankings</caption>
            <thead>
              <tr>
                <th style={{ width: 28 }}>#</th>
                <th>Team</th>
                <th>Proj</th>
                <th>Roster</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, i) => (
                <tr key={team.id} className={`${i < 4 ? 'playoff-zone' : i >= 10 ? 'danger-zone' : ''} ${team.id === USER_TEAM_ID ? 'user-team' : ''}`}>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                  <td style={{ fontWeight: team.id === USER_TEAM_ID ? 700 : 500 }}>
                    {team.abbr}
                  </td>
                    <td className="tabular-nums" style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{team.rosterProj.toFixed(1)}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {rosters[team.id]?.length || 0} players
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
