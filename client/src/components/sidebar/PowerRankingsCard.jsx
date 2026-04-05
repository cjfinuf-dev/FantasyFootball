import { useMemo } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { PLAYERS } from '../../data/players';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

export default function PowerRankingsCard({ expanded = false, rosters }) {
  const sorted = useMemo(() => {
    if (!rosters || !Object.values(rosters).some(r => r.length > 0)) {
      return [...TEAMS].sort((a, b) => b.power - a.power).map(t => ({ ...t, computedPower: t.power }));
    }

    // Compute power from roster: weighted avg of proj + avg
    return [...TEAMS].map(team => {
      const playerIds = rosters[team.id] || [];
      let totalProj = 0, totalAvg = 0;
      playerIds.forEach(pid => {
        const p = PLAYER_MAP[pid];
        if (p) { totalProj += p.proj; totalAvg += p.avg; }
      });
      const rawPower = (totalProj * 0.6 + totalAvg * 0.4);
      return { ...team, computedPower: rawPower };
    }).sort((a, b) => b.computedPower - a.computedPower).map((team, i, arr) => {
      // Normalize to 0-100 scale
      const max = arr[0].computedPower;
      const min = arr[arr.length - 1].computedPower;
      const range = max - min || 1;
      return { ...team, computedPower: Math.round(((team.computedPower - min) / range) * 60 + 40) };
    });
  }, [rosters]);

  const maxPower = sorted[0]?.computedPower || 100;
  const avgPower = sorted.length > 0 ? sorted.reduce((sum, t) => sum + t.computedPower, 0) / sorted.length : 50;
  const hasDraftData = rosters && Object.values(rosters).some(r => r.length > 0);

  // Compute top position breakdown for user's team
  const userPosCounts = useMemo(() => {
    if (!hasDraftData || !rosters) return null;
    const counts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 };
    (rosters[USER_TEAM_ID] || []).forEach(pid => {
      const p = PLAYER_MAP[pid];
      if (p && counts[p.pos] !== undefined) counts[p.pos]++;
    });
    return counts;
  }, [rosters, hasDraftData]);

  return (
    <div className={`ff-sidebar-card${expanded ? ' expanded' : ''}`}>
      <div className="ff-sidebar-card-header">
        <h3>Power Rankings</h3>
        {hasDraftData && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Draft-based</span>}
      </div>
      <div className="ff-sidebar-card-body">
        {(() => {
          const display = expanded ? sorted : (() => {
            const top5 = sorted.slice(0, 5);
            const userInTop5 = top5.some(t => t.id === USER_TEAM_ID);
            if (userInTop5) return top5;
            const userTeam = sorted.find(t => t.id === USER_TEAM_ID);
            return userTeam ? [...top5, userTeam] : top5;
          })();
          return display.map((team) => {
            const rank = sorted.indexOf(team);
            return (
            <div className={`ff-power-row${team.id === USER_TEAM_ID ? ' user-row' : ''}`} key={team.id}>
              <span className="ff-power-rank">{rank + 1}</span>
              <span className="ff-power-name" style={{ fontWeight: team.id === USER_TEAM_ID ? 700 : 500 }}>{team.abbr}</span>
              <div className="ff-power-bar-bg">
                <div className={`ff-power-bar-fill ${team.id === USER_TEAM_ID ? 'user' : ''}`} style={{ width: `${(team.computedPower / maxPower) * 100}%` }} />
                <div className="ff-power-bar-avg" style={{ left: `${(avgPower / maxPower) * 100}%` }} title={`League avg: ${Math.round(avgPower)}`} />
              </div>
              <span className="ff-power-score tabular-nums">{team.computedPower}</span>
            </div>
            );
          });
        })()}

        {/* User's roster breakdown */}
        {userPosCounts && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Roster Breakdown</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(userPosCounts).filter(([, c]) => c > 0).map(([pos, count]) => (
                <div key={pos} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                  borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: `var(--pos-${pos.toLowerCase()}-bg)`,
                  color: `var(--pos-${pos.toLowerCase()})`,
                }}>
                  {pos} <span style={{ fontWeight: 700 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
