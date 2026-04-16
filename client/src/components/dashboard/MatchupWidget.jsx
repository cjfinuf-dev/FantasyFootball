import { useState, useMemo } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { MATCHUPS } from '../../data/matchups';
import { PLAYERS } from '../../data/players';
import { ROSTER_PRESETS } from '../../data/scoring';
import { getEspnId } from '../../data/espnIds';
import { getMatchupWinProb, getHexWinProb, getStarterProjection } from '../../utils/winProb';
import { getHexScore, formatHex } from '../../utils/hexScore';
import { GAMES_PLAYED } from '../../data/seasonConfig';
import { useLiveTick } from '../../hooks/useLiveTick';
import PosBadge from '../ui/PosBadge';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PlayerLink from '../ui/PlayerLink';
import HexBrand from '../ui/HexBrand';
import AnimatedNumber from '../ui/AnimatedNumber';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

function getTeamProjection(teamId, rosters) {
  if (!rosters || !rosters[teamId]) return 0;
  return getStarterProjection(rosters[teamId], PLAYER_MAP);
}

function assignToSlots(playerIds) {
  const players = playerIds.map(pid => ({ player: PLAYER_MAP[pid], pid })).filter(r => r.player);
  players.sort((a, b) => (b.player.proj || 0) - (a.player.proj || 0));

  const preset = ROSTER_PRESETS.standard;
  const slots = [];
  Object.entries(preset).forEach(([pos, count]) => {
    if (pos === 'IR') return;
    for (let i = 0; i < count; i++) slots.push({ pos, label: count > 1 && pos !== 'BN' ? `${pos}${i + 1}` : pos });
  });

  const unassigned = [...players];
  return slots.map(slot => {
    const matchIdx = unassigned.findIndex(r => {
      if (slot.pos === 'FLEX') return ['RB', 'WR', 'TE'].includes(r.player?.pos);
      if (slot.pos === 'DST') return r.player?.pos === 'DEF';
      if (slot.pos === 'BN') return true;
      return r.player?.pos === slot.pos;
    });
    const match = matchIdx >= 0 ? unassigned.splice(matchIdx, 1)[0] : null;
    return { ...slot, pick: match };
  });
}

const POS_GROUPS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

function getActualPos(slot) {
  if (slot.pos === 'FLEX' && slot.pick?.player) return slot.pick.player.pos;
  if (slot.pos === 'DST') return 'DEF';
  return slot.pos;
}

function hexStyle(score) {
  const color = score >= 85 ? 'var(--hex-purple-hot)' : score >= 75 ? 'var(--hex-purple-vivid)' : score >= 60 ? 'var(--hex-purple)' : score >= 45 ? 'rgba(139,92,246,0.7)' : 'var(--text-muted)';
  const shadow = score >= 85 ? 'var(--hex-purple-glow)' : score >= 75 ? '0 0 4px rgba(139,92,246,0.25)' : 'none';
  return { fontWeight: 700, color, textShadow: shadow };
}

function RosterComparison({ homeTeamId, awayTeamId, rosters, homeTeam, awayTeam, onPlayerClick }) {
  const homeSlots = useMemo(() => rosters?.[homeTeamId] ? assignToSlots(rosters[homeTeamId]) : [], [rosters, homeTeamId]);
  const awaySlots = useMemo(() => rosters?.[awayTeamId] ? assignToSlots(rosters[awayTeamId]) : [], [rosters, awayTeamId]);

  if (!homeSlots.length && !awaySlots.length) return null;

  const homeStarters = homeSlots.filter(s => s.pos !== 'BN');
  const awayStarters = awaySlots.filter(s => s.pos !== 'BN');
  const homeBench = homeSlots.filter(s => s.pos === 'BN');
  const awayBench = awaySlots.filter(s => s.pos === 'BN');
  const maxBench = Math.max(homeBench.length, awayBench.length);

  const allRows = [
    ...homeStarters.map((hs, i) => ({ home: hs, away: awayStarters[i] || { pos: 'BN', label: '-', pick: null }, bench: false })),
    { separator: true },
    ...Array.from({ length: maxBench }, (_, i) => ({
      home: homeBench[i] || { pos: 'BN', label: 'BN', pick: null },
      away: awayBench[i] || { pos: 'BN', label: 'BN', pick: null },
      bench: true,
    })),
  ];

  // Totals
  const homeTotal = homeStarters.reduce((s, sl) => s + (sl.pick?.player?.proj || 0), 0);
  const awayTotal = awayStarters.reduce((s, sl) => s + (sl.pick?.player?.proj || 0), 0);

  // Hex averages (starters with picks only)
  const homeHexPicks = homeStarters.filter(s => s.pick);
  const awayHexPicks = awayStarters.filter(s => s.pick);
  const homeHexAvg = homeHexPicks.length ? homeHexPicks.reduce((sum, s) => sum + getHexScore(s.pick.pid), 0) / homeHexPicks.length : 0;
  const awayHexAvg = awayHexPicks.length ? awayHexPicks.reduce((sum, s) => sum + getHexScore(s.pick.pid), 0) / awayHexPicks.length : 0;

  // Positional advantage — starters only
  const posAdv = useMemo(() => {
    const groups = {};
    for (const pos of POS_GROUPS) groups[pos] = { home: 0, away: 0 };
    homeStarters.forEach(s => {
      if (!s.pick) return;
      const gp = getActualPos(s);
      if (groups[gp]) groups[gp].home += s.pick.player.proj || 0;
    });
    awayStarters.forEach(s => {
      if (!s.pick) return;
      const gp = getActualPos(s);
      if (groups[gp]) groups[gp].away += s.pick.player.proj || 0;
    });
    return POS_GROUPS.map(pos => {
      const diff = groups[pos].home - groups[pos].away;
      return { pos, diff, home: groups[pos].home, away: groups[pos].away };
    }).filter(g => g.home > 0 || g.away > 0);
  }, [homeStarters, awayStarters]);

  return (
    <div className="ff-h2h-wrap">
      <table className="ff-h2h-table">
        <thead>
          <tr className="ff-h2h-header">
            <th className="ff-h2h-th-player" style={{ textAlign: 'left' }}>{homeTeam.abbr}</th>
            <th className="ff-h2h-th-hex">Hex</th>
            <th className="ff-h2h-th-proj">Proj</th>
            <th className="ff-h2h-th-slot">Slot</th>
            <th className="ff-h2h-th-proj">Proj</th>
            <th className="ff-h2h-th-hex">Hex</th>
            <th className="ff-h2h-th-player" style={{ textAlign: 'right' }}>{awayTeam.abbr}</th>
          </tr>
        </thead>
        <tbody>
          {allRows.map((row, idx) => {
            if (row.separator) {
              return (
                <tr key="sep" className="ff-h2h-sep-row">
                  <td colSpan={7}>Bench</td>
                </tr>
              );
            }
            const hp = row.home?.pick;
            const ap = row.away?.pick;
            const hProj = hp ? hp.player.proj : 0;
            const aProj = ap ? ap.player.proj : 0;
            const hHex = hp ? getHexScore(hp.pid) : 0;
            const aHex = ap ? getHexScore(ap.pid) : 0;
            const diff = hProj - aProj;
            const homeWins = diff > 0.05;
            const awayWins = diff < -0.05;

            // Hex vs Proj dual-highlight (starters only)
            const hexHomeAdv = !row.bench && hp && ap && hHex > aHex + 0.5;
            const hexAwayAdv = !row.bench && hp && ap && aHex > hHex + 0.5;
            const projHomeAdv = !row.bench && hp && ap && homeWins;
            const projAwayAdv = !row.bench && hp && ap && awayWins;

            return (
              <tr key={idx} className={`ff-h2h-row${row.bench ? ' ff-h2h-bench' : ''}`}>
                {/* Home player */}
                <td className="ff-h2h-td-player">
                  {hp ? (
                    <div className="ff-h2h-player ff-h2h-player-home">
                      <PlayerHeadshot espnId={getEspnId(hp.player.name)} name={hp.player.name} size="tiny" pos={hp.player.pos} team={hp.player.team} />
                      <div className="ff-h2h-player-info">
                        <span className="ff-h2h-name">
                          <PlayerLink name={hp.player.name} playerId={hp.pid} onPlayerClick={onPlayerClick} />
                        </span>
                        <span className="ff-h2h-team">{hp.player.team} - {hp.player.pos}</span>
                      </div>
                    </div>
                  ) : <span className="ff-h2h-empty">—</span>}
                </td>

                {/* Home hex score */}
                <td className={`ff-h2h-td-hex tabular-nums${hexHomeAdv ? ' ff-h2h-hex-adv' : ''}`} style={hp ? hexStyle(hHex) : undefined}>
                  {hp ? formatHex(hHex) : ''}
                </td>

                {/* Home projection */}
                <td className={`ff-h2h-td-proj tabular-nums${homeWins ? ' ff-h2h-win' : ''}${projHomeAdv ? ' ff-h2h-proj-adv' : ''}`}>
                  {hp ? hProj.toFixed(1) : ''}
                </td>

                {/* Center slot */}
                <td className="ff-h2h-td-slot" data-pos={row.home?.pos}>{row.home?.label || 'BN'}</td>

                {/* Away projection */}
                <td className={`ff-h2h-td-proj tabular-nums${awayWins ? ' ff-h2h-win' : ''}${projAwayAdv ? ' ff-h2h-proj-adv' : ''}`}>
                  {ap ? aProj.toFixed(1) : ''}
                </td>

                {/* Away hex score */}
                <td className={`ff-h2h-td-hex tabular-nums${hexAwayAdv ? ' ff-h2h-hex-adv' : ''}`} style={ap ? hexStyle(aHex) : undefined}>
                  {ap ? formatHex(aHex) : ''}
                </td>

                {/* Away player */}
                <td className="ff-h2h-td-player">
                  {ap ? (
                    <div className="ff-h2h-player ff-h2h-player-away">
                      <div className="ff-h2h-player-info" style={{ textAlign: 'right' }}>
                        <span className="ff-h2h-name">
                          <PlayerLink name={ap.player.name} playerId={ap.pid} onPlayerClick={onPlayerClick} />
                        </span>
                        <span className="ff-h2h-team">{ap.player.team} - {ap.player.pos}</span>
                      </div>
                      <PlayerHeadshot espnId={getEspnId(ap.player.name)} name={ap.player.name} size="tiny" pos={ap.player.pos} team={ap.player.team} />
                    </div>
                  ) : <span className="ff-h2h-empty">—</span>}
                </td>
              </tr>
            );
          })}

          {/* Totals row */}
          <tr className="ff-h2h-totals">
            <td style={{ fontWeight: 800 }}>Total</td>
            <td className={`ff-h2h-td-hex tabular-nums${homeHexAvg >= awayHexAvg ? ' ff-h2h-hex-adv' : ''}`}
                style={{ fontWeight: 800, ...(homeHexAvg >= awayHexAvg ? { color: 'var(--hex-purple-vivid)' } : { color: 'var(--text-muted)' }) }}>
              {formatHex(homeHexAvg)}
            </td>
            <td className="ff-h2h-td-proj tabular-nums" style={{ fontWeight: 800, color: homeTotal >= awayTotal ? 'var(--win)' : 'var(--text-muted)' }}>
              {homeTotal.toFixed(1)}
            </td>
            <td className="ff-h2h-td-slot" style={{ fontSize: 10 }}>
              <span style={{ color: homeTotal > awayTotal ? 'var(--win)' : awayTotal > homeTotal ? 'var(--win)' : 'var(--text-muted)' }}>
                {homeTotal > awayTotal ? '+' : ''}{(homeTotal - awayTotal).toFixed(1)}
              </span>
            </td>
            <td className="ff-h2h-td-proj tabular-nums" style={{ fontWeight: 800, color: awayTotal >= homeTotal ? 'var(--win)' : 'var(--text-muted)' }}>
              {awayTotal.toFixed(1)}
            </td>
            <td className={`ff-h2h-td-hex tabular-nums${awayHexAvg >= homeHexAvg ? ' ff-h2h-hex-adv' : ''}`}
                style={{ fontWeight: 800, ...(awayHexAvg >= homeHexAvg ? { color: 'var(--hex-purple-vivid)' } : { color: 'var(--text-muted)' }) }}>
              {formatHex(awayHexAvg)}
            </td>
            <td style={{ fontWeight: 800, textAlign: 'right' }}>Total</td>
          </tr>
        </tbody>
      </table>

      {/* Hex vs Proj prediction verdict */}
      <div className="ff-h2h-verdict">
        <div className="ff-h2h-verdict-pick ff-h2h-verdict-hex">
          <span className="ff-h2h-verdict-label">Hex Pick</span>
          <span className="ff-h2h-verdict-team">
            {homeHexAvg > awayHexAvg ? homeTeam.abbr : awayHexAvg > homeHexAvg ? awayTeam.abbr : 'Even'}
          </span>
          <span className="ff-h2h-verdict-val">{formatHex(Math.max(homeHexAvg, awayHexAvg))} avg</span>
        </div>
        <div className="ff-h2h-verdict-pick ff-h2h-verdict-proj">
          <span className="ff-h2h-verdict-label">Proj Pick</span>
          <span className="ff-h2h-verdict-team">
            {homeTotal > awayTotal ? homeTeam.abbr : awayTotal > homeTotal ? awayTeam.abbr : 'Even'}
          </span>
          <span className="ff-h2h-verdict-val">{Math.max(homeTotal, awayTotal).toFixed(1)} pts</span>
        </div>
      </div>

      {/* Positional advantage strip */}
      {posAdv.length > 0 && (
        <div className="ff-pos-adv">
          {posAdv.map(g => {
            const even = Math.abs(g.diff) < 0.5;
            const homeWins = g.diff >= 0.5;
            return (
              <span key={g.pos} className="ff-pos-adv-item" style={{
                color: even ? 'var(--text-muted)' : 'var(--hex-purple-vivid)',
              }}>
                <span className="ff-pos-adv-pos">{g.pos}</span>
                {' '}
                {even
                  ? 'Even'
                  : `${homeWins ? homeTeam.abbr : awayTeam.abbr} +${Math.abs(g.diff).toFixed(1)}`
                }
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WinProbBar({ homeProb }) {
  const homePct = (homeProb * 100).toFixed(1);
  const awayPct = (100 - homeProb * 100).toFixed(1);

  return (
    <div className="ff-winprob" aria-label={`Win probability: Home ${homePct}%, Away ${awayPct}%`}>
      <span className="ff-winprob-label tabular-nums" style={{ color: 'var(--accent)', fontWeight: 700 }}><AnimatedNumber value={parseFloat(homePct)} decimals={1} suffix="%" /></span>
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
      <span className="ff-winprob-label tabular-nums" style={{ color: 'var(--accent-secondary-text)', fontWeight: 700 }}><AnimatedNumber value={parseFloat(awayPct)} decimals={1} suffix="%" /></span>
    </div>
  );
}

function TeamRecord({ team }) {
  return (
    <span className="text-muted-sm" style={{ fontSize: 14, fontWeight: 500 }}>
      {team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ''}
    </span>
  );
}

function StreakBadge({ streak }) {
  if (!streak) return null;
  const isWin = streak.startsWith('W');
  return (
    <span className={`ff-streak ${isWin ? 'hot' : 'cold'}`} style={{ fontSize: 12 }}>
      {streak}
    </span>
  );
}

function HexWinProbBar({ homeProb }) {
  const homePct = (homeProb * 100).toFixed(1);
  const awayPct = (100 - homeProb * 100).toFixed(1);

  return (
    <div className="ff-winprob ff-hexbar" aria-label={`Hex win probability: Home ${homePct}%, Away ${awayPct}%`}>
      <span className="ff-winprob-label tabular-nums" style={{ color: 'var(--hex-purple-vivid)', fontWeight: 700 }}><AnimatedNumber value={parseFloat(homePct)} decimals={1} suffix="%" /></span>
      <div className="ff-winprob-bar" style={{ position: 'relative' }}>
        <div className="ff-winprob-fill" style={{ width: `${homePct}%`, background: 'var(--hex-purple)', borderRadius: '3px 0 0 3px' }} />
        <div className="ff-winprob-fill" style={{ width: `${awayPct}%`, background: 'var(--hex-purple-light, rgba(139,92,246,0.3))', borderRadius: '0 3px 3px 0' }} />
        <div style={{
          position: 'absolute', top: -1, bottom: -1,
          left: `${homePct}%`, transform: 'translateX(-1px)',
          width: 2, background: 'var(--bg)', zIndex: 1,
          boxShadow: '0 0 0 1px var(--border)',
        }} />
      </div>
      <span className="ff-winprob-label tabular-nums" style={{ color: 'var(--hex-purple-vivid)', fontWeight: 700 }}><AnimatedNumber value={parseFloat(awayPct)} decimals={1} suffix="%" /></span>
    </div>
  );
}

function MatchupCard({ matchup, expanded, rosters, onPlayerClick, onToggle, onMatchupClick }) {
  const homeTeam = TEAMS.find(t => t.id === matchup.home.teamId);
  const awayTeam = TEAMS.find(t => t.id === matchup.away.teamId);
  const homeRoster = rosters?.[matchup.home.teamId] || [];
  const awayRoster = rosters?.[matchup.away.teamId] || [];
  const homeProb = homeRoster.length && awayRoster.length
    ? getMatchupWinProb(homeRoster, awayRoster, PLAYER_MAP)
    : (matchup.home.projected + matchup.away.projected > 0
      ? matchup.home.projected / (matchup.home.projected + matchup.away.projected)
      : 0.5);
  const isTossUp = homeProb > 0.45 && homeProb < 0.55;
  const homeFavored = homeProb >= 0.55;
  const awayFavored = homeProb <= 0.45;
  const isUserMatchup = matchup.home.teamId === USER_TEAM_ID || matchup.away.teamId === USER_TEAM_ID;

  const hasRosters = homeRoster.length > 0 || awayRoster.length > 0;

  // Hex averages for the hex compare bar
  const { homeHexAvg, awayHexAvg } = useMemo(() => {
    if (!hasRosters) return { homeHexAvg: 0, awayHexAvg: 0 };
    const homeSlots = rosters?.[matchup.home.teamId] ? assignToSlots(rosters[matchup.home.teamId]) : [];
    const awaySlots = rosters?.[matchup.away.teamId] ? assignToSlots(rosters[matchup.away.teamId]) : [];
    const hs = homeSlots.filter(s => s.pos !== 'BN' && s.pick);
    const as = awaySlots.filter(s => s.pos !== 'BN' && s.pick);
    const hAvg = hs.length ? hs.reduce((sum, s) => sum + getHexScore(s.pick.pid), 0) / hs.length : 0;
    const aAvg = as.length ? as.reduce((sum, s) => sum + getHexScore(s.pick.pid), 0) / as.length : 0;
    return { homeHexAvg: hAvg, awayHexAvg: aAvg };
  }, [hasRosters, rosters, matchup.home.teamId, matchup.away.teamId]);

  const hexProb = useMemo(() => {
    if (!homeRoster.length || !awayRoster.length) return 0.5;
    return getHexWinProb(homeRoster, awayRoster, PLAYER_MAP, getHexScore);
  }, [homeRoster, awayRoster]);

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

      {isUserMatchup && (
        <div className="ff-your-matchup-label" style={{
          position: 'absolute', top: 0, left: 16,
          transform: 'translateY(-50%)',
          padding: '4px 10px', borderRadius: 'var(--radius-sm)',
          background: 'var(--accent)', color: 'var(--on-accent)',
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', lineHeight: '18px',
          zIndex: 2,
        }}>Your Matchup</div>
      )}
      {expanded && (
        <div className="ff-card-header">
          <h2>{isUserMatchup ? 'Matchup Details' : 'Matchup Preview'}</h2>
          <span className="ff-card-header-meta">Week {GAMES_PLAYED + 1}</span>
        </div>
      )}

      {/* Projected Points Section */}
      <div className={expanded ? 'ff-matchup' : 'ff-matchup ff-matchup-compact'}>
        <div className="ff-matchup-team">
          <div className="ff-matchup-team-name" style={!expanded ? { fontSize: 15 } : undefined}>{homeTeam.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-1)' }}>
            <TeamRecord team={homeTeam} />
            <StreakBadge streak={homeTeam.streak} />
          </div>
          <div className="ff-matchup-score ff-mono tabular-nums" style={!expanded ? { fontSize: 26 } : undefined}>
            <AnimatedNumber value={matchup.home.projected} decimals={1} />
          </div>
          <div className="ff-matchup-projected tabular-nums">Projected</div>
        </div>
        <div className="ff-matchup-vs"><span>VS</span></div>
        <div className="ff-matchup-team">
          <div className="ff-matchup-team-name" style={!expanded ? { fontSize: 15 } : undefined}>{awayTeam.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-1)' }}>
            <TeamRecord team={awayTeam} />
            <StreakBadge streak={awayTeam.streak} />
          </div>
          <div className="ff-matchup-score ff-mono tabular-nums" style={!expanded ? { fontSize: 26 } : undefined}>
            <AnimatedNumber value={matchup.away.projected} decimals={1} />
          </div>
          <div className="ff-matchup-projected tabular-nums">Projected</div>
        </div>
      </div>

      {/* Proj Win Probability — directly below projected scores */}
      <div style={{ padding: expanded ? '0 var(--space-4) var(--space-2)' : '0 var(--space-2) var(--space-1-5)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--win)', marginBottom: 2 }}>Proj Win Probability</div>
        <WinProbBar homeProb={homeProb} />
      </div>

      {/* Hex Score Section */}
      {hasRosters && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: expanded ? '0 var(--space-4)' : '0 var(--space-2)', borderTop: '1px solid var(--border)' }}>
            <div style={{ flex: 1, textAlign: 'center', padding: 'var(--space-2) 0' }}>
              <div className="ff-mono tabular-nums" style={{ fontSize: expanded ? 28 : 20, fontWeight: 700, color: homeHexAvg >= awayHexAvg ? 'var(--hex-purple-vivid)' : 'var(--text-muted)' }}>
                <AnimatedNumber value={homeHexAvg} decimals={1} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--hex-purple)', fontWeight: 600 }}>Avg Hex</div>
            </div>
            <div style={{ width: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 14 15.5" fill="none" stroke="var(--hex-purple)" strokeWidth="1.4" width="18" height="20" style={{ opacity: 0.5 }}>
                <path d="M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z"/>
              </svg>
            </div>
            <div style={{ flex: 1, textAlign: 'center', padding: 'var(--space-2) 0' }}>
              <div className="ff-mono tabular-nums" style={{ fontSize: expanded ? 28 : 20, fontWeight: 700, color: awayHexAvg >= homeHexAvg ? 'var(--hex-purple-vivid)' : 'var(--text-muted)' }}>
                <AnimatedNumber value={awayHexAvg} decimals={1} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--hex-purple)', fontWeight: 600 }}>Avg Hex</div>
            </div>
          </div>

          {/* Hex Win Probability — directly below hex scores */}
          <div style={{ padding: expanded ? '0 var(--space-4) var(--space-2)' : '0 var(--space-2) var(--space-1-5)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--hex-purple-vivid)', marginBottom: 2 }}>Hex Win Probability</div>
            <HexWinProbBar homeProb={hexProb} />
          </div>
        </>
      )}

      {/* Head-to-Head Roster Comparison */}
      {hasRosters && (
        <div style={{ padding: expanded ? '0 var(--space-3)' : '0 var(--space-2)' }}>
          <RosterComparison
            homeTeamId={matchup.home.teamId}
            awayTeamId={matchup.away.teamId}
            rosters={rosters}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            onPlayerClick={onPlayerClick}
          />
        </div>
      )}

      {/* View Full Matchup link */}
      {expanded && onMatchupClick && (
        <div style={{ padding: 'var(--space-1-5) var(--space-3)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={(e) => { e.stopPropagation(); onMatchupClick(matchup.id); }}
            style={{ fontSize: 14 }}>
            View Full <HexBrand word="Analysis" icon={false} />
          </button>
        </div>
      )}

      {/* Expand hint for compact cards */}
      {!expanded && onToggle && (
        <div style={{
          padding: 'var(--space-1) var(--space-2-5)', textAlign: 'center', fontSize: 13,
          color: 'var(--accent-text)', borderTop: '1px solid var(--border)',
          fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          <svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="1,1 5,5 9,1"/></svg>
          Expand
        </div>
      )}
    </div>
  );
}

export default function MatchupWidget({ mode = 'featured', rosters, onPlayerClick, onMatchupClick }) {
  const [expandedId, setExpandedId] = useState(null);
  const tick = useLiveTick();

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
  }, [rosters, tick]);

  const userMatchup = matchups.find(
    m => m.home.teamId === USER_TEAM_ID || m.away.teamId === USER_TEAM_ID
  ) || matchups[0];

  // Overview mode — single featured matchup
  if (mode === 'featured') {
    return <MatchupCard matchup={userMatchup} expanded rosters={rosters} onPlayerClick={onPlayerClick} onMatchupClick={onMatchupClick} />;
  }

  // Full matchups page
  const otherMatchups = matchups.filter(m => m.id !== userMatchup.id);

  const handleToggle = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* User's matchup — always expanded at top */}
      <div>
        <MatchupCard matchup={userMatchup} expanded rosters={rosters} onPlayerClick={onPlayerClick} onMatchupClick={onMatchupClick} />
      </div>

      {/* Section label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 4px', fontSize: 13, fontWeight: 600,
        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        <span>Other Matchups</span>
        <span style={{ fontWeight: 400 }}>&middot;</span>
        <span style={{ fontWeight: 400 }}>{otherMatchups.length}</span>
      </div>

      {/* Matchup grid */}
      <div className="ff-matchups-grid">
        {otherMatchups.map(m => (
          expandedId === m.id ? (
            <div key={m.id} style={{ gridColumn: '1 / -1' }}>
              <MatchupCard matchup={m} expanded rosters={rosters} onPlayerClick={onPlayerClick} onToggle={handleToggle} onMatchupClick={onMatchupClick} />
            </div>
          ) : (
            <MatchupCard key={m.id} matchup={m} expanded={false} rosters={rosters} onPlayerClick={onPlayerClick} onToggle={handleToggle} onMatchupClick={onMatchupClick} />
          )
        ))}
      </div>
    </div>
  );
}
