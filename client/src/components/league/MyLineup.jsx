import { useState, useMemo, useEffect } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { PLAYERS } from '../../data/players';
import { ROSTER_PRESETS } from '../../data/scoring';
import { getEspnId } from '../../data/espnIds';
import { getOpponent } from '../../data/nflSchedule';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PlayerLink from '../ui/PlayerLink';
import PosBadge from '../ui/PosBadge';
import StatusLabel from '../ui/StatusLabel';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

const FLEX_POSITIONS = ['RB', 'WR', 'TE'];

function canPlaySlot(slotLabel, playerPos) {
  if (!playerPos) return false;
  if (slotLabel === 'BN') return true;
  if (slotLabel === 'IR') return true;
  if (slotLabel === 'FLEX') return FLEX_POSITIONS.includes(playerPos);
  if (slotLabel === 'DST') return playerPos === 'DEF';
  if (slotLabel === 'K') return playerPos === 'K';
  return slotLabel === playerPos;
}

function canSwapWith(selectedEntry, targetEntry) {
  const selPlayer = selectedEntry.player;
  const tgtPlayer = targetEntry.player;
  if (!selPlayer) return false;

  // Can't swap with yourself
  if (selPlayer.id === tgtPlayer?.id) return false;

  // IR special rules: only 'out' players can go to IR
  if (targetEntry.slotLabel === 'IR' && selPlayer.status !== 'out') return false;
  if (selectedEntry.slotLabel === 'IR' && tgtPlayer && tgtPlayer.status !== 'out') return false;

  // Check if selected player can play in target's slot
  const selCanPlayTarget = canPlaySlot(targetEntry.slotLabel, selPlayer.pos);

  // If target slot is empty, just check if selected can play there
  if (!tgtPlayer) return selCanPlayTarget;

  // Both occupied: each must be able to play the other's slot
  const tgtCanPlaySelected = canPlaySlot(selectedEntry.slotLabel, tgtPlayer.pos);
  return selCanPlayTarget && tgtCanPlaySelected;
}

// Auto-assign players to optimal roster slots (initial layout)
function assignSlots(playerIds) {
  const players = playerIds.map(id => PLAYER_MAP[id]).filter(Boolean);
  const sorted = [...players].sort((a, b) => b.proj - a.proj);
  const preset = ROSTER_PRESETS.standard;
  const starters = [];
  const used = new Set();

  const slotOrder = [
    { slot: 'QB', pos: 'QB', count: preset.QB || 1 },
    { slot: 'RB', pos: 'RB', count: preset.RB || 2 },
    { slot: 'WR', pos: 'WR', count: preset.WR || 2 },
    { slot: 'TE', pos: 'TE', count: preset.TE || 1 },
    { slot: 'K', pos: 'K', count: preset.K || 1 },
    { slot: 'DST', pos: 'DEF', count: preset.DST || 1 },
  ];

  for (const { slot, pos, count } of slotOrder) {
    let filled = 0;
    for (const p of sorted) {
      if (filled >= count) break;
      if (used.has(p.id)) continue;
      if (p.pos === pos) {
        filled++;
        used.add(p.id);
        starters.push({ slot: count > 1 ? `${slot}${filled}` : slot, slotLabel: slot, player: p });
      }
    }
    while (filled < count) {
      filled++;
      starters.push({ slot: count > 1 ? `${slot}${filled}` : slot, slotLabel: slot, player: null });
    }
  }

  const flexCount = preset.FLEX || 1;
  let flexFilled = 0;
  for (const p of sorted) {
    if (flexFilled >= flexCount) break;
    if (used.has(p.id)) continue;
    if (FLEX_POSITIONS.includes(p.pos)) {
      flexFilled++;
      used.add(p.id);
      starters.push({ slot: 'FLEX', slotLabel: 'FLEX', player: p });
    }
  }
  while (flexFilled < flexCount) {
    flexFilled++;
    starters.push({ slot: 'FLEX', slotLabel: 'FLEX', player: null });
  }

  const bench = sorted.filter(p => !used.has(p.id)).map(p => ({ slot: 'BN', slotLabel: 'BN', player: p }));

  const ir = [];
  const irCount = preset.IR || 1;
  for (let i = 0; i < bench.length && ir.length < irCount; i++) {
    if (bench[i].player?.status === 'out') {
      ir.push({ slot: 'IR', slotLabel: 'IR', player: bench[i].player });
      bench.splice(i, 1);
      i--;
    }
  }
  while (ir.length < irCount) {
    ir.push({ slot: 'IR', slotLabel: 'IR', player: null });
  }

  return { starters, bench, ir };
}

function PlayerRow({ entry, section, index, isSelected, isSwapTarget, onSelect, onMoveToIR, onActivate, onPlayerClick }) {
  const { player } = entry;
  const opp = player ? getOpponent(player.team) : null;
  const oppDisplay = opp ? `${opp.location === 'away' ? '@' : 'vs'} ${opp.opp}` : null;
  const isStarter = section === 'starters';

  const canMoveToIR = player?.status === 'out' && section !== 'ir';
  const canActivate = section === 'ir' && player;

  const rowClass = `ff-lineup-row${!isStarter ? ' bench-row' : ''}${isSelected ? ' selected' : ''}${isSwapTarget ? ' swap-target' : ''}`;
  const slotColorVar = entry.slotLabel === 'FLEX' ? 'flex' : entry.slotLabel === 'DST' ? 'def' : entry.slotLabel === 'BN' || entry.slotLabel === 'IR' ? '' : entry.slotLabel.toLowerCase();

  return (
    <div className={rowClass}>
      <div className="ff-lineup-slot" style={{ color: `var(--pos-${slotColorVar}, var(--text-muted))` }}>
        {entry.slot}
      </div>

      {player ? (
        <>
          <PlayerHeadshot espnId={getEspnId(player.name)} name={player.name} size="sm" pos={player.pos} team={player.team} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <PlayerLink name={player.name} playerId={player.id} onPlayerClick={onPlayerClick} />
              <PosBadge pos={player.pos} />
              <StatusLabel status={player.status} />
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 1 }}>
              {player.team}
              {oppDisplay && (
                <span style={{ marginLeft: 8 }}>
                  {oppDisplay}
                  {opp && <span style={{ marginLeft: 6, opacity: 0.7 }}>{opp.gameTime}</span>}
                </span>
              )}
            </div>
          </div>

          <div className="ff-lineup-proj">
            <div className="ff-lineup-proj-val tabular-nums">{player.proj}</div>
            <div className="ff-lineup-stat-label">PROJ</div>
          </div>
          <div className="ff-lineup-avg">
            <div className="ff-lineup-avg-val tabular-nums">{player.avg}</div>
            <div className="ff-lineup-stat-label">AVG</div>
          </div>

          <div className="ff-lineup-actions">
            {isSwapTarget && (
              <button className="ff-lineup-btn ff-lineup-btn-swap" onClick={() => onSelect(section, index)}>Sub In</button>
            )}
            {!isSelected && !isSwapTarget && (
              <button className="ff-lineup-btn ff-lineup-btn-sub" onClick={() => onSelect(section, index)}>Sub</button>
            )}
            {isSelected && (
              <button className="ff-lineup-btn ff-lineup-btn-cancel" onClick={() => onSelect(section, index)}>Cancel</button>
            )}
            {canMoveToIR && !isSelected && !isSwapTarget && (
              <button className="ff-lineup-btn ff-lineup-btn-ir" onClick={() => onMoveToIR(section, index)}>IR</button>
            )}
            {canActivate && !isSelected && !isSwapTarget && (
              <button className="ff-lineup-btn ff-lineup-btn-activate" onClick={() => onActivate(index)}>Activate</button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className={`ff-lineup-empty${isSwapTarget ? ' swap-target' : ''}`}>
            {isSwapTarget ? 'Empty slot' : 'Empty'}
          </div>
          <div className="ff-lineup-proj" />
          <div className="ff-lineup-avg" />
          <div className="ff-lineup-actions">
            {isSwapTarget && (
              <button className="ff-lineup-btn ff-lineup-btn-swap" onClick={() => onSelect(section, index)}>Move Here</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function MyLineup({ rosters, onPlayerClick }) {
  const userTeam = TEAMS.find(t => t.id === USER_TEAM_ID);
  const playerIds = rosters?.[USER_TEAM_ID] || [];

  const initialLayout = useMemo(() => assignSlots(playerIds), [playerIds]);

  const [lineup, setLineup] = useState(initialLayout);
  const [selected, setSelected] = useState(null); // { section, index }

  // Reset lineup when rosters change (e.g., new draft)
  useEffect(() => {
    setLineup(assignSlots(playerIds));
    setSelected(null);
  }, [playerIds]);

  const totalProj = useMemo(() => {
    return lineup.starters.reduce((sum, s) => sum + (s.player?.proj || 0), 0);
  }, [lineup.starters]);

  const getEntry = (section, index) => lineup[section]?.[index];

  const handleSelect = (section, index) => {
    if (!selected) {
      setSelected({ section, index });
      return;
    }

    // Clicking the same player deselects
    if (selected.section === section && selected.index === index) {
      setSelected(null);
      return;
    }

    const selEntry = getEntry(selected.section, selected.index);
    const tgtEntry = getEntry(section, index);

    if (selEntry && canSwapWith(selEntry, tgtEntry)) {
      // Execute swap
      setLineup(prev => {
        const next = {
          starters: [...prev.starters],
          bench: [...prev.bench],
          ir: [...prev.ir],
        };

        const selSlotInfo = { slot: next[selected.section][selected.index].slot, slotLabel: next[selected.section][selected.index].slotLabel };
        const tgtSlotInfo = { slot: next[section][index].slot, slotLabel: next[section][index].slotLabel };

        // Swap players but keep slot metadata
        next[section][index] = { ...tgtSlotInfo, player: selEntry.player };
        next[selected.section][selected.index] = { ...selSlotInfo, player: tgtEntry.player || null };

        // Clean up: remove null entries from bench (but not starters/IR which have fixed slots)
        if (selected.section === 'bench' && !tgtEntry.player) {
          next.bench = next.bench.filter((_, i) => i !== selected.index);
        }

        return next;
      });
      setSelected(null);
    } else {
      // Invalid target — select the new player instead
      if (tgtEntry?.player) {
        setSelected({ section, index });
      } else {
        setSelected(null);
      }
    }
  };

  const handleMoveToIR = (section, index) => {
    setLineup(prev => {
      const next = { starters: [...prev.starters], bench: [...prev.bench], ir: [...prev.ir] };
      const entry = next[section][index];
      if (!entry?.player || entry.player.status !== 'out') return prev;

      // Find empty IR slot
      const irIdx = next.ir.findIndex(s => !s.player);
      if (irIdx === -1) return prev; // IR full

      // Move player to IR
      next.ir[irIdx] = { ...next.ir[irIdx], player: entry.player };

      // Clear the original slot
      if (section === 'bench') {
        next.bench.splice(index, 1);
      } else {
        next[section][index] = { ...next[section][index], player: null };
      }

      return next;
    });
    setSelected(null);
  };

  const handleActivate = (irIndex) => {
    setLineup(prev => {
      const next = { starters: [...prev.starters], bench: [...prev.bench], ir: [...prev.ir] };
      const player = next.ir[irIndex]?.player;
      if (!player) return prev;

      // Move to bench
      next.bench.push({ slot: 'BN', slotLabel: 'BN', player });
      next.ir[irIndex] = { ...next.ir[irIndex], player: null };

      return next;
    });
    setSelected(null);
  };

  const handleOptimize = () => {
    setLineup(assignSlots(playerIds));
    setSelected(null);
  };

  const handleCancel = () => setSelected(null);


  if (playerIds.length === 0) {
    return (
      <div className="ff-card">
        <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
        <div className="ff-card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>No roster data</div>
          <div style={{ fontSize: 15 }}>Complete the draft to see your lineup.</div>
        </div>
      </div>
    );
  }

  // Determine swap targets for currently selected player
  const selectedEntry = selected ? getEntry(selected.section, selected.index) : null;

  function isSwapTarget(section, index) {
    if (!selectedEntry) return false;
    if (selected.section === section && selected.index === index) return false;
    const target = getEntry(section, index);
    return canSwapWith(selectedEntry, target);
  }

  const selectedPlayerName = selected ? getEntry(selected.section, selected.index)?.player?.name : null;

  return (
    <div>
      {/* Screen reader swap announcement */}
      <div aria-live="polite" className="ff-skip-link" style={{ position: 'absolute' }}>
        {selectedPlayerName ? `Selected ${selectedPlayerName}. Choose a player to swap.` : ''}
      </div>

      {/* Header */}
      <div className="ff-card" style={{ marginBottom: 16 }}>
        <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
        <div className="ff-card-header">
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{userTeam?.name || 'My Team'}</h2>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>
              {playerIds.length} players &middot; {lineup.starters.filter(s => s.player).length} starters
              {selected && <span style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 600 }}>Select a player to swap</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={handleOptimize} style={{
              padding: '8px 14px', borderRadius: 6, border: '1px solid var(--accent)',
              background: 'transparent', color: 'var(--accent)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'background 0.15s, color 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'var(--on-accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent)'; }}
            >Best Lineup</button>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 26, fontWeight: 800 }} className="tabular-nums">{totalProj.toFixed(2)}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Projected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Starters */}
      <div className="ff-card" style={{ marginBottom: 16 }}>
        <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Starters</h3>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{lineup.starters.filter(s => s.player).length} / {lineup.starters.length}</span>
        </div>
        <div>
          {lineup.starters.map((s, i) => (
            <PlayerRow
              key={`starter-${i}`}
              entry={s}
              section="starters"
              index={i}
              isSelected={selected?.section === 'starters' && selected?.index === i}
              isSwapTarget={isSwapTarget('starters', i)}
              onSelect={handleSelect}
              onMoveToIR={handleMoveToIR}
              onActivate={handleActivate}
              onPlayerClick={onPlayerClick}
            />
          ))}
        </div>
      </div>

      {/* Bench */}
      <div className="ff-card" style={{ marginBottom: 16 }}>
        <div className="ff-card-top-accent" style={{ background: 'var(--charcoal-slate, #334155)' }} />
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Bench</h3>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{lineup.bench.length} players</span>
        </div>
        <div>
          {lineup.bench.length > 0 ? lineup.bench.map((s, i) => (
            <PlayerRow
              key={`bench-${i}`}
              entry={s}
              section="bench"
              index={i}
              isSelected={selected?.section === 'bench' && selected?.index === i}
              isSwapTarget={isSwapTarget('bench', i)}
              onSelect={handleSelect}
              onMoveToIR={handleMoveToIR}
              onActivate={handleActivate}
              onPlayerClick={onPlayerClick}
            />
          )) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 15 }}>No bench players</div>
          )}
        </div>
      </div>

      {/* IR */}
      <div className="ff-card">
        <div className="ff-card-top-accent" style={{ background: 'var(--red, #ef4444)' }} />
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Injured Reserve</h3>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{lineup.ir.filter(s => s.player).length} / {lineup.ir.length}</span>
        </div>
        <div>
          {lineup.ir.map((s, i) => (
            <PlayerRow
              key={`ir-${i}`}
              entry={s}
              section="ir"
              index={i}
              isSelected={selected?.section === 'ir' && selected?.index === i}
              isSwapTarget={isSwapTarget('ir', i)}
              onSelect={handleSelect}
              onMoveToIR={handleMoveToIR}
              onActivate={handleActivate}
              onPlayerClick={onPlayerClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
