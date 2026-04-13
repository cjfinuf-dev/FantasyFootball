import { useState, useMemo, useRef, useEffect } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import HexBrand from '../ui/HexBrand';
import {
  TOTAL_WEEKS, PLAYOFF_SPOTS, BYE_SEEDS, GAMES_PLAYED, REMAINING_WEEKS, SIMULATIONS,
  schedule, simGame, runSimulations, getMagicNumber, getEliminated, getStatus,
} from '../../utils/playoffCalc';

const INTERACTIVE_SIMS = 2000;

/* ─── Stagger animation helper ─── */
function Stagger({ children, className, delay = 0.04 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  return (
    <div ref={ref} className={className}>
      {Array.isArray(children) ? children.map((child, i) => (
        <div key={i} className={`pm-stagger-item${visible ? ' pm-stagger-item--in' : ''}`}
          style={{ transitionDelay: `${i * delay}s` }}>
          {child}
        </div>
      )) : children}
    </div>
  );
}

export default function PlayoffMachine({ rosters, onTeamClick }) {
  const [overrides, setOverrides] = useState({});
  const [hoveredTeam, setHoveredTeam] = useState(null);
  const [debouncedOverrides, setDebouncedOverrides] = useState({});
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedOverrides(overrides);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [overrides]);

  // Baseline (no overrides) for delta comparison
  const baseline = useMemo(() => runSimulations(TEAMS, {}), []);
  const results = useMemo(() => {
    const hasOvr = Object.keys(debouncedOverrides).length > 0;
    return runSimulations(TEAMS, debouncedOverrides, hasOvr ? INTERACTIVE_SIMS : undefined);
  }, [debouncedOverrides]);
  const sorted = useMemo(() => [...results].sort((a, b) => b.playoffPct - a.playoffPct), [results]);
  const hasOverrides = Object.keys(overrides).length > 0;

  const baselineMap = {};
  baseline.forEach(t => { baselineMap[t.id] = t; });

  const userTeam = sorted.find(t => t.id === USER_TEAM_ID);
  const userBaseline = baselineMap[USER_TEAM_ID];

  const toggleOverride = (game, winner) => {
    const key = `${game.home}-${game.away}-w${game.week}`;
    setOverrides(prev => {
      if (prev[key] === winner) { const n = { ...prev }; delete n[key]; return n; }
      return { ...prev, [key]: winner };
    });
  };

  const teamMap = {};
  TEAMS.forEach(t => { teamMap[t.id] = t; });

  const weekGroups = Array.from({ length: REMAINING_WEEKS }, (_, i) => GAMES_PLAYED + 1 + i).map(w => ({
    week: w, label: w === GAMES_PLAYED + 1 ? 'This Week' : `Week ${w}`,
    games: schedule.filter(g => g.week === w),
  }));

  // Bracket seeds
  const seeds = sorted.slice(0, PLAYOFF_SPOTS);

  return (
    <div className="pm">
      {/* ═══ HERO ═══ */}
      <div className="pm-hero">
        <div className="pm-hero-scanlines" />
        <div className="pm-hero-inner">
          <div className="pm-hero-eyebrow">
            <span className="pm-hero-badge">WEEK {GAMES_PLAYED + 1}</span>
            <span className="pm-hero-sep">/</span>
            <span className="pm-hero-meta">{SIMULATIONS.toLocaleString()} Simulations</span>
            <span className="pm-hero-sep">/</span>
            <span className="pm-hero-meta">{REMAINING_WEEKS} Weeks Left</span>
          </div>
          <h2 className="pm-hero-title">Playoff Machine</h2>
          <div className="pm-hero-bar"><div className="pm-hero-bar-fill" /></div>
        </div>
      </div>

      {/* ═══ YOUR OUTLOOK ═══ */}
      {userTeam && (
        <div className="pm-outlook">
          <div className="pm-outlook-left">
            <div className="pm-outlook-team-name">{userTeam.name}</div>
            <div className="pm-outlook-record-line">
              <span className="pm-outlook-record">{userTeam.wins}-{userTeam.losses}</span>
              <span className="pm-outlook-streak">{userTeam.streak}</span>
              {getStatus(userTeam) && (
                <span className={`pm-badge pm-badge--${getStatus(userTeam).cls}`}>
                  {getStatus(userTeam).label}
                </span>
              )}
            </div>
          </div>
          <div className="pm-outlook-stats">
            {[
              { value: userTeam.playoffPct, base: userBaseline?.playoffPct, label: 'Playoff', fmt: v => v.toFixed(1) + '%', primary: true },
              { value: userTeam.byePct, base: userBaseline?.byePct, label: 'Bye Week', fmt: v => v.toFixed(1) + '%' },
              { value: userTeam.champPct, base: userBaseline?.champPct, label: 'Title', fmt: v => v.toFixed(1) + '%' },
              { value: sorted.indexOf(userTeam) + 1, label: 'Seed', fmt: v => '#' + v, noDelta: true },
            ].map((s, i) => {
              const delta = hasOverrides && !s.noDelta && s.base != null ? s.value - s.base : null;
              return (
                <div key={i} className={`pm-outlook-stat${s.primary ? ' pm-outlook-stat--primary' : ''}`}>
                  <span className="pm-outlook-stat-value">{s.fmt(s.value)}</span>
                  {delta != null && Math.abs(delta) >= 0.1 && (
                    <span className={`pm-delta${delta > 0 ? ' pm-delta--up' : ' pm-delta--down'}`}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                    </span>
                  )}
                  <span className="pm-outlook-stat-label">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ MAIN GRID ═══ */}
      <div className="pm-layout">
        {/* ODDS TABLE */}
        <div className="pm-table-wrap">
          <div className="pm-section-label">
            <svg viewBox="0 0 14 15.5" width="14" height="15.5" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z"/><line x1="4.5" y1="10.5" x2="4.5" y2="8"/><line x1="7" y1="10.5" x2="7" y2="5.5"/><line x1="9.5" y1="10.5" x2="9.5" y2="7"/></svg>
            Playoff Probability
          </div>
          <div className="pm-table">
            <div className="pm-table-header">
              <span className="pm-th" style={{width:28}}>#</span>
              <span className="pm-th" style={{flex:1}}>Team</span>
              <span className="pm-th" style={{width:52}}>Rec</span>
              <span className="pm-th" style={{width:64, textAlign:'right'}}>Odds</span>
              {hasOverrides && <span className="pm-th" style={{width:48, textAlign:'right'}}>+/-</span>}
              <span className="pm-th" style={{flex:1}}></span>
            </div>
            <Stagger className="pm-table-body" delay={0.025}>
              {sorted.map((team, i) => {
                const status = getStatus(team);
                const isUser = team.id === USER_TEAM_ID;
                const isCutoff = i === PLAYOFF_SPOTS - 1;
                const delta = hasOverrides ? team.playoffPct - (baselineMap[team.id]?.playoffPct || 0) : 0;
                return (
                  <div key={team.id}>
                    <div
                      className={`pm-row${isUser ? ' pm-row--user' : ''}${i >= PLAYOFF_SPOTS ? ' pm-row--out' : ''}${hoveredTeam === team.id ? ' pm-row--hover' : ''}`}
                      onMouseEnter={() => setHoveredTeam(team.id)}
                      onMouseLeave={() => setHoveredTeam(null)}
                      onClick={() => onTeamClick?.(team.id)}
                      style={{ animationDelay: `${i * 0.03}s` }}
                    >
                      <span className="pm-cell pm-cell-rank">{i + 1}</span>
                      <span className="pm-cell pm-cell-team" style={{flex:1}}>
                        <span className="pm-team-name">{team.name}</span>
                        <span className="pm-team-owner">{team.owner}</span>
                      </span>
                      <span className="pm-cell pm-cell-rec tabular-nums" style={{width:52}}>{team.wins}-{team.losses}</span>
                      <span className={`pm-cell pm-cell-pct tabular-nums${team.playoffPct >= 99 ? ' pm-pct-lock' : team.playoffPct <= 1 ? ' pm-pct-dead' : ''}`} style={{width:64, textAlign:'right'}}>
                        {team.playoffPct.toFixed(1)}%
                      </span>
                      {hasOverrides && (
                        <span className={`pm-cell pm-cell-delta tabular-nums${delta > 0.5 ? ' pm-delta--up' : delta < -0.5 ? ' pm-delta--down' : ''}`} style={{width:48, textAlign:'right'}}>
                          {Math.abs(delta) >= 0.1 ? (delta > 0 ? '+' : '') + delta.toFixed(1) : '—'}
                        </span>
                      )}
                      <span className="pm-cell pm-cell-bar" style={{flex:1}}>
                        <div className="pm-bar-track">
                          <div className={`pm-bar-fill${team.playoffPct >= 90 ? ' pm-bar-safe' : team.playoffPct <= 10 ? ' pm-bar-danger' : ''}`}
                            style={{ width: `${team.playoffPct}%` }} />
                        </div>
                        {status && <span className={`pm-badge pm-badge--${status.cls}`}>{status.label}</span>}
                      </span>
                    </div>
                    {isCutoff && <div className="pm-cutoff"><span>Playoff Cutline</span></div>}
                  </div>
                );
              })}
            </Stagger>
          </div>
        </div>

        {/* SCENARIOS */}
        <div className="pm-scenarios-wrap">
          <div className="pm-section-label">
            <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 7h3l2-4 2 8 2-4h3"/></svg>
            Scenarios
          </div>
          <p className="pm-scenarios-hint">Force outcomes. Watch the odds shift.</p>
          {weekGroups.map(wg => (
            <div key={wg.week} className="pm-week-group">
              <div className="pm-week-label">{wg.label}</div>
              {wg.games.map((game, gi) => {
                const key = `${game.home}-${game.away}-w${game.week}`;
                const forced = overrides[key];
                const home = teamMap[game.home];
                const away = teamMap[game.away];
                const isUserGame = game.home === USER_TEAM_ID || game.away === USER_TEAM_ID;
                return (
                  <div key={gi} className={`pm-game${isUserGame ? ' pm-game--user' : ''}`}>
                    <button
                      className={`pm-game-team${forced === game.home ? ' pm-game-team--win' : forced === game.away ? ' pm-game-team--lose' : ''}`}
                      onClick={() => toggleOverride(game, game.home)}
                    >
                      <span className="pm-game-abbr">{home.abbr}</span>
                      {forced === game.home && <span className="pm-game-check">W</span>}
                    </button>
                    <span className="pm-game-vs">vs</span>
                    <button
                      className={`pm-game-team${forced === game.away ? ' pm-game-team--win' : forced === game.home ? ' pm-game-team--lose' : ''}`}
                      onClick={() => toggleOverride(game, game.away)}
                    >
                      <span className="pm-game-abbr">{away.abbr}</span>
                      {forced === game.away && <span className="pm-game-check">W</span>}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
          {hasOverrides && (
            <button className="pm-reset-btn" onClick={() => setOverrides({})}>
              <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 7a6 6 0 1011.5-2.5M12.5 1v3.5H9"/></svg>
              Reset {Object.keys(overrides).length} scenario{Object.keys(overrides).length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* ═══ BRACKET ═══ */}
      <div className="pm-bracket-section">
        <div className="pm-section-label">
          <svg viewBox="0 0 14 15.5" width="14" height="15.5" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z"/><path d="M5 5.5v2h4v-2M7 7.5v3"/></svg>
          Projected Bracket
        </div>
        <div className="pm-bracket">
          {/* WILD CARD */}
          <div className="pm-bracket-round">
            <div className="pm-bracket-round-label">Wild Card</div>
            <BracketGame top={seeds[2]} bot={seeds[5]} sorted={sorted} />
            <BracketGame top={seeds[3]} bot={seeds[4]} sorted={sorted} />
          </div>
          <div className="pm-bracket-connectors">
            <svg viewBox="0 0 32 200" preserveAspectRatio="none"><path d="M0 50 H16 V100 H32 M0 150 H16 V100" stroke="var(--border-strong)" strokeWidth="1.5" fill="none"/></svg>
          </div>
          {/* SEMIS */}
          <div className="pm-bracket-round">
            <div className="pm-bracket-round-label">Semifinals</div>
            <BracketSlot label={`#1 ${seeds[0].abbr}`} sub="vs WC winner" isUser={seeds[0].id === USER_TEAM_ID} pct={seeds[0].champPct} />
            <BracketSlot label={`#2 ${seeds[1].abbr}`} sub="vs WC winner" isUser={seeds[1].id === USER_TEAM_ID} pct={seeds[1].champPct} />
          </div>
          <div className="pm-bracket-connectors">
            <svg viewBox="0 0 32 200" preserveAspectRatio="none"><path d="M0 50 H16 V100 H32 M0 150 H16 V100" stroke="var(--border-strong)" strokeWidth="1.5" fill="none"/></svg>
          </div>
          {/* CHAMPIONSHIP */}
          <div className="pm-bracket-round">
            <div className="pm-bracket-round-label">Championship</div>
            <div className="pm-bracket-game pm-bracket-game--trophy">
              <div className="pm-bracket-trophy">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><path d="M8 21h8M12 17v4M17 4V2H7v2M7 4a5 5 0 005 5 5 5 0 005-5M7 4H4a1 1 0 00-1 1v1a3 3 0 003 3M17 4h3a1 1 0 011 1v1a3 3 0 01-3 3"/></svg>
              </div>
              <div className="pm-bracket-team pm-bracket-team--ghost">SF Winner</div>
              <div className="pm-bracket-team pm-bracket-team--ghost">SF Winner</div>
            </div>
          </div>
        </div>
        {/* BYE CALLOUT */}
        <div className="pm-bye-callout">
          <span className="pm-bye-label">First-Round Bye</span>
          <div className="pm-bye-teams">
            {seeds.slice(0, BYE_SEEDS).map(s => (
              <span key={s.id} className={`pm-bye-chip${s.id === USER_TEAM_ID ? ' pm-bye-chip--user' : ''}`}>
                #{sorted.indexOf(s) + 1} {s.abbr}
                <span className="pm-bye-chip-pct">{s.byePct.toFixed(0)}%</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ SEED DISTRIBUTION ═══ */}
      <div className="pm-seed-section">
        <div className="pm-section-label">
          <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/><rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/></svg>
          Seed Distribution
        </div>
        <Stagger className="pm-seed-grid" delay={0.06}>
          {sorted.slice(0, 8).map(team => {
            const isUser = team.id === USER_TEAM_ID;
            const peakSeed = team.seedDist.indexOf(Math.max(...team.seedDist));
            return (
              <div key={team.id} className={`pm-seed-card${isUser ? ' pm-seed-card--user' : ''}`}>
                <div className="pm-seed-card-header">
                  <span className="pm-seed-card-abbr">{team.abbr}</span>
                  <span className="pm-seed-card-name">{team.name}</span>
                  <span className="pm-seed-card-peak">Most likely: #{peakSeed + 1}</span>
                </div>
                <div className="pm-seed-bars">
                  {team.seedDist.slice(0, 8).map((pct, si) => (
                    <div key={si} className={`pm-seed-row${si === peakSeed ? ' pm-seed-row--peak' : ''}`}>
                      <span className={`pm-seed-label${si < PLAYOFF_SPOTS ? '' : ' pm-seed-label--out'}`}>#{si + 1}</span>
                      <div className="pm-seed-track">
                        <div className={`pm-seed-fill${si < PLAYOFF_SPOTS ? ' pm-seed-fill--in' : ' pm-seed-fill--out'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="pm-seed-val tabular-nums">{pct >= 1 ? pct.toFixed(0) + '%' : pct > 0 ? '<1%' : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Stagger>
      </div>
    </div>
  );
}

function BracketGame({ top, bot, sorted }) {
  return (
    <div className="pm-bracket-game">
      <div className={`pm-bracket-team${top.id === USER_TEAM_ID ? ' pm-bracket-team--user' : ''}`}>
        <span className="pm-bracket-seed">#{sorted.indexOf(top) + 1}</span>
        <span className="pm-bracket-name">{top.abbr}</span>
        <span className="pm-bracket-name-full">{top.name}</span>
        <span className="pm-bracket-pct tabular-nums">{top.playoffPct.toFixed(0)}%</span>
      </div>
      <div className={`pm-bracket-team${bot.id === USER_TEAM_ID ? ' pm-bracket-team--user' : ''}`}>
        <span className="pm-bracket-seed">#{sorted.indexOf(bot) + 1}</span>
        <span className="pm-bracket-name">{bot.abbr}</span>
        <span className="pm-bracket-name-full">{bot.name}</span>
        <span className="pm-bracket-pct tabular-nums">{bot.playoffPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function BracketSlot({ label, sub, isUser, pct }) {
  return (
    <div className="pm-bracket-game">
      <div className={`pm-bracket-team${isUser ? ' pm-bracket-team--user' : ''}`}>
        <span className="pm-bracket-name" style={{ fontWeight: 800 }}>{label}</span>
        <span className="pm-bracket-pct tabular-nums">{pct.toFixed(1)}%</span>
      </div>
      <div className="pm-bracket-team pm-bracket-team--ghost">{sub}</div>
    </div>
  );
}
