import { TEAMS, USER_TEAM_ID } from '../../data/teams';

export default function StandingsCard({ expanded = false }) {
  return (
    <div className={`ff-sidebar-card${expanded ? ' expanded' : ''}`}>
      <div className="ff-sidebar-card-header">
        <h3>League Standings</h3>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Week 12</span>
      </div>
      <div className="ff-sidebar-card-body" style={{ padding: 0 }}>
        <table className="ff-standings-table">
          <thead><tr><th style={{ width: 28 }}>#</th><th>Team</th><th>W-L</th><th>PF</th><th>Streak</th></tr></thead>
          <tbody>
            {TEAMS.map((team, i) => (
              <tr key={team.id} className={`${i < 4 ? 'playoff-zone' : i >= 10 ? 'danger-zone' : ''} ${team.id === USER_TEAM_ID ? 'user-team' : ''}`}>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                <td style={{ fontWeight: team.id === USER_TEAM_ID ? 700 : 500 }}><span style={{ marginRight: 4 }}>{team.logo}</span>{team.abbr}</td>
                <td>{team.wins}-{team.losses}</td>
                <td>{team.pf.toFixed(1)}</td>
                <td><span className={`ff-streak ${team.streak.startsWith('W') ? 'hot' : 'cold'}`}>{team.streak}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
