import { TEAMS, USER_TEAM_ID } from '../../data/teams';

export default function PowerRankingsCard({ expanded = false }) {
  const sorted = [...TEAMS].sort((a, b) => b.power - a.power);
  const maxPower = sorted[0].power;

  return (
    <div className={`ff-sidebar-card${expanded ? ' expanded' : ''}`}>
      <div className="ff-sidebar-card-header"><h3>Power Rankings</h3></div>
      <div className="ff-sidebar-card-body">
        {sorted.map((team, i) => (
          <div className="ff-power-row" key={team.id}>
            <span className="ff-power-rank">{i + 1}</span>
            <span className="ff-power-name" style={{ fontWeight: team.id === USER_TEAM_ID ? 700 : 500 }}>{team.logo} {team.abbr}</span>
            <div className="ff-power-bar-bg">
              <div className={`ff-power-bar-fill ${team.id === USER_TEAM_ID ? 'user' : ''}`} style={{ width: `${(team.power / maxPower) * 100}%` }} />
            </div>
            <span className="ff-power-score">{team.power}</span>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Last 5 Weeks</div>
          <div className="ff-sparkline">
            {[108, 124, 98, 132, 118].map((v, i) => (
              <div key={i} className={`ff-spark-bar ${i === 3 ? 'highlight' : ''}`} style={{ height: `${(v / 140) * 100}%` }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--muted-grey)', marginTop: 2 }}>
            <span>Wk 8</span><span>Wk 9</span><span>Wk 10</span><span>Wk 11</span><span>Wk 12</span>
          </div>
        </div>
      </div>
    </div>
  );
}
