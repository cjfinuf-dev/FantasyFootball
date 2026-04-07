import { useMemo } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { PLAYERS } from '../../data/players';
import { ROSTER_PRESETS } from '../../data/scoring';
import { getEspnId } from '../../data/espnIds';
import { getHexScore, getHexTier, formatHex } from '../../utils/hexScore';
import PosBadge from '../ui/PosBadge';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PlayerLink from '../ui/PlayerLink';
import HexBrand from '../ui/HexBrand';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

const POS_COLORS = {
  QB: 'var(--pos-qb)', RB: 'var(--pos-rb)', WR: 'var(--pos-wr)',
  TE: 'var(--pos-te)', K: 'var(--pos-k)', DEF: 'var(--pos-def)',
};

export default function TeamPage({ teamId, rosters, onBack, onPlayerClick }) {
  const team = TEAMS.find(t => t.id === teamId);
  const isUser = teamId === USER_TEAM_ID;

  const rosterPlayers = useMemo(() => {
    if (!rosters || !rosters[teamId]) return [];
    return rosters[teamId]
      .map(pid => ({ player: PLAYER_MAP[pid], playerId: pid }))
      .filter(r => r.player)
      .sort((a, b) => getHexScore(b.playerId) - getHexScore(a.playerId));
  }, [teamId, rosters]);

  // Group by position
  const byPos = useMemo(() => {
    const groups = { QB: [], RB: [], WR: [], TE: [], K: [], DEF: [] };
    rosterPlayers.forEach(r => {
      if (groups[r.player.pos]) groups[r.player.pos].push(r);
    });
    return groups;
  }, [rosterPlayers]);

  // Assign to roster slots
  const rosterSlots = useMemo(() => {
    const preset = ROSTER_PRESETS.standard;
    const slots = [];
    Object.entries(preset).forEach(([pos, count]) => {
      if (pos === 'IR') return;
      for (let i = 0; i < count; i++) slots.push({ pos, label: pos === 'BN' ? 'BN' : (count > 1 ? `${pos}${i + 1}` : pos) });
    });
    const unassigned = [...rosterPlayers];
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
  }, [rosterPlayers]);

  // Stats
  const totalProj = rosterPlayers.reduce((sum, r) => sum + r.player.proj, 0);
  const totalHex = rosterPlayers.reduce((sum, r) => sum + getHexScore(r.playerId), 0);
  const starterSlots = rosterSlots.filter(s => s.pos !== 'BN');
  const startersFilled = starterSlots.filter(s => s.pick).length;

  // Position group summaries
  const posGroups = ['QB', 'RB', 'WR', 'TE'].map(pos => {
    const players = byPos[pos] || [];
    const totalPosHex = players.reduce((sum, r) => sum + getHexScore(r.playerId), 0);
    const totalPosProj = players.reduce((sum, r) => sum + r.player.proj, 0);
    return { pos, players, totalHex: totalPosHex, totalProj: totalPosProj };
  });

  if (!team) {
    return (
      <div className="ff-card">
        <div className="ff-card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Team not found.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Team Header */}
      <div className="ff-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: 5, background: isUser ? 'var(--accent)' : 'var(--charcoal-slate)' }} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          background: isUser ? 'var(--accent-10)' : 'var(--surface)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{team.name}</h1>
              {isUser && <span style={{ fontSize: 10, background: 'var(--accent)', color: 'var(--on-accent)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>Your Team</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {team.owner} &middot; {rosterPlayers.length} players
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }} className="tabular-nums">{totalProj.toFixed(2)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Total Proj</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: 'var(--hex-purple)' }} className="tabular-nums">{Math.round(totalHex)}</div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}><HexBrand word="Score" icon={false} /></div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }} className="tabular-nums">{startersFilled}/{starterSlots.length}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Starters</div>
            </div>
          </div>
        </div>
      </div>

      {/* Position Group Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        {posGroups.map(g => (
          <div key={g.pos} className="ff-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: POS_COLORS[g.pos], textTransform: 'uppercase', marginBottom: 6 }}>{g.pos}s</div>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, marginBottom: 2 }} className="tabular-nums">{g.totalProj.toFixed(2)}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>proj pts</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--hex-purple)' }} className="tabular-nums">{Math.round(g.totalHex)} hex</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{g.players.length} player{g.players.length !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {/* Full Roster by Slot */}
      <div className="ff-card" style={{ marginBottom: 16 }}>
        <div className="ff-card-header">
          <h2 style={{ fontSize: 16 }}>Roster</h2>
        </div>
        <div style={{ padding: 0 }}>
          {rosterSlots.map((slot, idx) => {
            const isStarter = slot.pos !== 'BN';
            const isSectionBreak = idx > 0 && isStarter !== (rosterSlots[idx - 1].pos !== 'BN');
            return (
              <div key={idx}>
                {isSectionBreak && (
                  <div style={{ padding: '6px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    Bench
                  </div>
                )}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                  borderBottom: '1px solid var(--border)',
                  opacity: !isStarter && !slot.pick ? 0.55 : isStarter ? 1 : 0.7,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: POS_COLORS[slot.pos] || 'var(--text-muted)', minWidth: 32, textTransform: 'uppercase' }}>
                    {slot.label}
                  </span>
                  {slot.pick ? (
                    <>
                      <PlayerHeadshot espnId={getEspnId(slot.pick.player.name)} name={slot.pick.player.name} size="xs" pos={slot.pick.player.pos} team={slot.pick.player.team} />
                      <PosBadge pos={slot.pick.player.pos} />
                      <PlayerLink name={slot.pick.player.name} playerId={slot.pick.playerId} onPlayerClick={onPlayerClick} />
                      <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 4 }}>{slot.pick.player.team}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600 }} className="tabular-nums">{slot.pick.player.proj}</span>
                      <span style={{ color: 'var(--hex-purple)', fontSize: 12, fontWeight: 700, minWidth: 30, textAlign: 'right' }} className="tabular-nums">{formatHex(getHexScore(slot.pick.playerId))}</span>
                    </>
                  ) : (
                    <span style={{ color: isStarter ? 'var(--accent)' : 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>
                      {isStarter ? 'Empty' : '-'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
