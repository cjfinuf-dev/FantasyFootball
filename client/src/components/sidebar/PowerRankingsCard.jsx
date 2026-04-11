import { useMemo } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { PLAYERS } from '../../data/players';
import { getHexScore } from '../../utils/hexScore';
import Sparkline from '../ui/Sparkline';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

// Position slot weights for power calculation (starter impact)
const SLOT_WEIGHTS = { QB: 1.2, RB: 1.0, WR: 1.0, TE: 0.9, K: 0.3, DEF: 0.4 };
const STARTER_COUNTS = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 };

function computeTeamPower(teamId, rosters, scoringPreset) {
  if (!rosters || !rosters[teamId] || rosters[teamId].length === 0) return null;

  const players = rosters[teamId].map(pid => PLAYER_MAP[pid]).filter(Boolean);

  // Group by position, sort by HexScore
  const byPos = {};
  players.forEach(p => {
    if (!byPos[p.pos]) byPos[p.pos] = [];
    byPos[p.pos].push({ ...p, hex: getHexScore(p.id, scoringPreset) });
  });
  Object.values(byPos).forEach(arr => arr.sort((a, b) => b.hex - a.hex));

  // Starter power: top N at each position, weighted
  let starterPower = 0;
  let starterCount = 0;
  for (const [pos, count] of Object.entries(STARTER_COUNTS)) {
    const posPlayers = byPos[pos] || [];
    const weight = SLOT_WEIGHTS[pos] || 1.0;
    for (let i = 0; i < count; i++) {
      if (posPlayers[i]) {
        starterPower += posPlayers[i].hex * weight;
        starterCount++;
      }
    }
  }

  // Depth score: average hex of bench players
  const allStarters = new Set();
  for (const [pos, count] of Object.entries(STARTER_COUNTS)) {
    (byPos[pos] || []).slice(0, count).forEach(p => allStarters.add(p.id));
  }
  const benchPlayers = players.filter(p => !allStarters.has(p.id));
  const depthScore = benchPlayers.length > 0
    ? benchPlayers.reduce((sum, p) => sum + getHexScore(p.id, scoringPreset), 0) / benchPlayers.length
    : 0;

  // Composite: 75% starter power, 25% depth
  const rawPower = (starterPower / Math.max(1, starterCount)) * 0.75 + depthScore * 0.25;
  return rawPower;
}

// Generate weekly power trend from team stats (deterministic pseudo-random)
function getWeeklyPowerTrend(team, power) {
  const seed = team.id.charCodeAt(1) * 13;
  return [0,1,2,3,4].map((_, i) => {
    const noise = Math.sin(seed + i * 1.7) * 6;
    return Math.round(power + noise);
  });
}

// Position depth grades
function getPositionGrades(teamId, rosters, scoringPreset) {
  if (!rosters || !rosters[teamId]) return {};
  const players = rosters[teamId].map(pid => PLAYER_MAP[pid]).filter(Boolean);
  const grades = {};

  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    const posPlayers = players.filter(p => p.pos === pos);
    const hexes = posPlayers.map(p => getHexScore(p.id, scoringPreset));
    const starterCount = STARTER_COUNTS[pos] || 1;
    const starterHex = hexes.slice(0, starterCount);
    const avgStarterHex = starterHex.length > 0 ? starterHex.reduce((a, b) => a + b, 0) / starterHex.length : 0;

    let grade;
    if (avgStarterHex >= 80) grade = 'A';
    else if (avgStarterHex >= 65) grade = 'B';
    else if (avgStarterHex >= 50) grade = 'C';
    else if (avgStarterHex >= 35) grade = 'D';
    else grade = 'F';

    grades[pos] = { grade, count: posPlayers.length, avgHex: Math.round(avgStarterHex) };
  }
  return grades;
}

const GRADE_COLORS = {
  A: 'var(--success-green)', B: 'var(--success-green)', C: 'var(--warning-amber)',
  D: 'var(--red)', F: 'var(--red)',
};

export default function PowerRankingsCard({ expanded = false, rosters, scoringPreset }) {
  const rankings = useMemo(() => {
    const hasDraft = rosters && Object.values(rosters).some(r => r.length > 0);

    return [...TEAMS].map(team => {
      const power = hasDraft ? computeTeamPower(team.id, rosters, scoringPreset) : team.power;
      return { ...team, computedPower: power || team.power };
    }).sort((a, b) => b.computedPower - a.computedPower).map((team, i, arr) => {
      // Normalize to 0-100
      const max = arr[0].computedPower;
      const min = arr[arr.length - 1].computedPower;
      const range = max - min || 1;
      const normalized = Math.round(((team.computedPower - min) / range) * 55 + 40);

      // Movement from static rank
      const movement = team.rank - (i + 1); // positive = moved up

      return { ...team, power: normalized, rank: i + 1, movement, trend: getWeeklyPowerTrend(team, normalized) };
    });
  }, [rosters, scoringPreset]);

  const hasDraftData = rosters && Object.values(rosters).some(r => r.length > 0);
  const maxPower = rankings[0]?.power || 100;
  const avgPower = rankings.reduce((sum, t) => sum + t.power, 0) / rankings.length;

  const userTeam = rankings.find(t => t.id === USER_TEAM_ID);
  const userGrades = useMemo(() => {
    return hasDraftData ? getPositionGrades(USER_TEAM_ID, rosters, scoringPreset) : null;
  }, [rosters, scoringPreset, hasDraftData]);

  const display = expanded ? rankings : (() => {
    const top5 = rankings.slice(0, 5);
    const userInTop5 = top5.some(t => t.id === USER_TEAM_ID);
    if (userInTop5) return top5;
    return userTeam ? [...top5, userTeam] : top5;
  })();

  return (
    <div className={`ff-sidebar-card${expanded ? ' expanded' : ''}`}>
      <div className="ff-sidebar-card-header">
        <h3>Power Rankings</h3>
        <span className="ff-mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {hasDraftData ? 'HexScore' : 'Pre-Draft'}
        </span>
      </div>
      <div className="ff-sidebar-card-body" style={{ padding: 0 }}>
        {!hasDraftData ? (
          <div className="ff-empty-state" style={{ padding: '24px 16px' }}>
            <div className="ff-empty-state-title">Draft Pending</div>
            <div className="ff-empty-state-desc">Power rankings update once rosters are drafted.</div>
          </div>
        ) : (
          <>
            {display.map(team => {
              const isUser = team.id === USER_TEAM_ID;
              const notInOrder = !expanded && display.indexOf(team) === display.length - 1 && !rankings.slice(0, 5).some(t => t.id === team.id);

              return (
                <div className={`ff-power-row${isUser ? ' user-row' : ''}`} key={team.id}>
                  <span className="ff-power-rank" style={{ fontSize: 15, fontWeight: 800, color: isUser ? 'var(--accent-text)' : 'var(--text)' }}>
                    {team.rank}<span style={{ fontSize: 11, fontWeight: 600, verticalAlign: 'super' }}>
                      {team.rank === 1 ? 'st' : team.rank === 2 ? 'nd' : team.rank === 3 ? 'rd' : 'th'}
                    </span>
                  </span>
                  {/* Movement indicator */}
                  <span style={{
                    width: 16, fontSize: 12, fontWeight: 700, textAlign: 'center',
                    color: team.movement > 0 ? 'var(--success-green)' : team.movement < 0 ? 'var(--red)' : 'var(--text-muted)',
                  }}>
                    {team.movement > 0 ? `\u25B2` : team.movement < 0 ? `\u25BC` : '\u2022'}
                  </span>
                  <span className="ff-power-name" style={{ fontWeight: isUser ? 700 : 500 }}>
                    {expanded ? team.name : team.abbr}
                  </span>
                  <Sparkline data={team.trend} width={44} height={16} />
                  <div className="ff-power-bar-bg">
                    <div className={`ff-power-bar-fill ${isUser ? 'user' : ''}`} style={{ width: `${(team.power / maxPower) * 100}%` }} />
                    <div className="ff-power-bar-avg" style={{ left: `${(avgPower / maxPower) * 100}%` }} title={`Avg: ${Math.round(avgPower)}`} />
                  </div>
                  <span className="ff-power-score tabular-nums ff-mono" style={{ color: 'var(--text)', fontSize: 13 }}>{team.power}</span>
                </div>
              );
            })}

            {/* User position grades */}
            {userGrades && (
              <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Your Position Grades
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {Object.entries(userGrades).map(([pos, data]) => (
                    <div key={pos} style={{
                      textAlign: 'center', padding: '10px 6px',
                      background: 'var(--surface)', borderRadius: 6,
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: `var(--pos-${pos.toLowerCase()})`, marginBottom: 6 }}>{pos}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: GRADE_COLORS[data.grade], lineHeight: 1 }}>{data.grade}</div>
                      <div className="ff-mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{data.count} players</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
