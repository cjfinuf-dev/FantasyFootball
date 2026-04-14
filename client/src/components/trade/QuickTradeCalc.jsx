import { useState, useMemo } from 'react';
import { PLAYERS } from '../../data/players';
import { getHexScore, computeTradeTier, formatHex } from '../../utils/hexScore';
import { hexChipClass } from './TradePlayerRow';
import { getEspnId } from '../../data/espnIds';
import PosBadge from '../ui/PosBadge';
import PlayerHeadshot from '../ui/PlayerHeadshot';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

const STARTER_COUNTS = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 };
const NEED_BOOST = 1.15;

function getPositionalNeedBoost(receiveIds, roster) {
  if (!roster || roster.length === 0) return {};
  const boosts = {};
  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    const rosterAtPos = roster.filter(pid => PLAYER_MAP[pid]?.pos === pos);
    const needed = STARTER_COUNTS[pos] || 1;
    const deficit = needed - rosterAtPos.length;
    if (deficit > 0) {
      receiveIds.forEach(id => {
        if (PLAYER_MAP[id]?.pos === pos) boosts[id] = NEED_BOOST;
      });
    }
  }
  return boosts;
}

const SCORING_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'ppr', label: 'PPR' },
  { value: 'halfPpr', label: 'Half PPR' },
];

const MAX_PER_SIDE = 5;

function PlayerSearch({ onSelect, excludeIds, placeholder, scoringPreset }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return PLAYERS
      .filter(p => !excludeIds.has(p.id) && (p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [query, excludeIds]);

  const handleSelect = (p) => {
    onSelect(p.id);
    setQuery('');
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="ff-search-input"
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder={placeholder}
        style={{ fontSize: 15, padding: '10px 12px' }}
      />
      {focused && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', background: 'var(--bg-white)',
          maxHeight: 240, marginTop: 2, overflowY: 'auto',
        }}>
          {results.map(p => {
            const hex = getHexScore(p.id, scoringPreset);
            return (
              <div key={p.id}
                className="ff-tm-player-row"
                onMouseDown={() => handleSelect(p)}>
                <PlayerHeadshot espnId={getEspnId(p.name)} name={p.name} size="xs" pos={p.pos} team={p.team} />
                <PosBadge pos={p.pos} />
                <span className="p-name">{p.name}</span>
                <span className="p-nfl">{p.team}</span>
                <span className={hexChipClass(hex)} style={{ marginLeft: 4 }}>{formatHex(hex)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SidePanel({ label, playerIds, onAdd, onRemove, allIds, scoringPreset }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.05em' }}>
        {label}
      </div>
      <PlayerSearch
        onSelect={onAdd}
        excludeIds={allIds}
        scoringPreset={scoringPreset}
        placeholder={playerIds.length >= MAX_PER_SIDE ? 'Max 5 players' : 'Search players...'}
      />
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 80 }}>
        {playerIds.length === 0 && (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Search and add players to this side of the trade
          </div>
        )}
        {playerIds.map(id => {
          const p = PLAYER_MAP[id];
          if (!p) return null;
          const hex = getHexScore(id, scoringPreset);
          return (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              background: 'var(--surface, var(--bg-alt))', borderRadius: 8, fontSize: 15,
              border: '1px solid var(--border)',
            }}>
              <PlayerHeadshot espnId={getEspnId(p.name)} name={p.name} size="xs" pos={p.pos} team={p.team} />
              <PosBadge pos={p.pos} />
              <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <span className={hexChipClass(hex)}>{formatHex(hex)}</span>
              <button onClick={() => onRemove(id)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                fontSize: 18, padding: '0 4px', lineHeight: 1,
              }}>{'\u2715'}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function QuickTradeCalc({ onSignIn, onSignUp }) {
  const [sideA, setSideA] = useState([]);
  const [sideB, setSideB] = useState([]);
  const [scoring, setScoring] = useState('ppr');

  const allIds = useMemo(() => new Set([...sideA, ...sideB]), [sideA, sideB]);

  const addA = (id) => { if (sideA.length < MAX_PER_SIDE) setSideA(prev => [...prev, id]); };
  const addB = (id) => { if (sideB.length < MAX_PER_SIDE) setSideB(prev => [...prev, id]); };
  const removeA = (id) => setSideA(prev => prev.filter(x => x !== id));
  const removeB = (id) => setSideB(prev => prev.filter(x => x !== id));

  const hasBothSides = sideA.length > 0 && sideB.length > 0;
  const tier = hasBothSides ? computeTradeTier(sideA, sideB, null, null, scoring) : null;

  return (
    <div className="ff-card">
      <div className="ff-card-top-accent" style={{ background: 'var(--hex-purple, #8B5CF6)' }} />
      <div className="ff-card-header" style={{ padding: '20px 24px' }}>
        <h2 style={{ fontSize: 22 }}>Trade Calculator</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {SCORING_OPTIONS.map(opt => (
            <button key={opt.value}
              onClick={() => setScoring(opt.value)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
                background: scoring === opt.value ? 'var(--hex-purple, #8B5CF6)' : 'var(--surface, var(--bg-alt))',
                color: scoring === opt.value ? 'var(--on-accent)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ff-card-body" style={{ padding: '24px' }}>
        {/* Two-panel trade builder */}
        <div style={{ display: 'flex', gap: 24 }}>
          <SidePanel label="Side A" playerIds={sideA} onAdd={addA} onRemove={removeA} allIds={allIds} scoringPreset={scoring} />
          <div style={{ display: 'flex', alignItems: 'stretch', padding: '0 4px' }}>
            <div style={{ width: 1, background: 'var(--border)' }} />
          </div>
          <SidePanel label="Side B" playerIds={sideB} onAdd={addB} onRemove={removeB} allIds={allIds} scoringPreset={scoring} />
        </div>

        {/* Evaluation */}
        {tier && (() => {
          const total = tier.sendTotal + tier.receiveTotal || 1;
          const aPct = Math.round((tier.sendTotal / total) * 100);
          const bPct = 100 - aPct;
          const aWins = tier.sendTotal > tier.receiveTotal;
          const bWins = tier.receiveTotal > tier.sendTotal;
          const even = tier.sendTotal === tier.receiveTotal;

          // Side A = hex purple, Side B = surface — brand colors, always distinct.
          // Winner gets full saturation, loser gets muted.
          const aBarColor = aWins || even ? 'var(--hex-purple)' : 'var(--accent-tertiary)';
          const bBarColor = bWins || even ? 'var(--surface2)' : 'var(--border)';
          const aLabelColor = aWins || even ? 'var(--hex-purple)' : 'var(--text-muted)';
          const bLabelColor = bWins || even ? 'var(--text)' : 'var(--text-muted)';

          return (
            <div style={{ marginTop: 20, padding: '16px 20px', background: 'var(--surface, var(--bg-alt))', borderRadius: 10, border: '1px solid var(--border)' }}>
              {/* Side labels with values */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, marginBottom: 8 }}>
                <span style={{ fontWeight: 700 }}>
                  <span style={{ color: 'var(--hex-purple)', marginRight: 4 }}>{'\u25A0'}</span>
                  <span style={{ color: aLabelColor }}>Side A: {tier.sendTotal}</span>
                  {aWins && <span style={{ color: 'var(--success-green)', marginLeft: 4, fontSize: 12 }}>{'\u2714'}</span>}
                </span>
                <span style={{ fontWeight: 700 }}>
                  {bWins && <span style={{ color: 'var(--success-green)', marginRight: 4, fontSize: 12 }}>{'\u2714'}</span>}
                  <span style={{ color: bLabelColor }}>Side B: {tier.receiveTotal}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{'\u25A0'}</span>
                </span>
              </div>

              {/* Tug-of-war bar */}
              <div style={{ position: 'relative', display: 'flex', height: 36, borderRadius: 8, overflow: 'hidden', background: 'var(--border)' }}>
                <div style={{
                  width: `${aPct}%`,
                  background: aBarColor,
                  transition: 'width 0.4s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: aPct > 5 ? 36 : 0,
                }}>
                  {aPct > 12 && <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--on-accent)' }}>{aPct}%</span>}
                </div>
                <div style={{
                  width: `${bPct}%`,
                  background: bBarColor,
                  transition: 'width 0.4s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: bPct > 5 ? 36 : 0,
                  border: '1px solid var(--border)',
                  borderLeft: 'none',
                  borderRadius: '0 6px 6px 0',
                  boxSizing: 'border-box',
                }}>
                  {bPct > 12 && <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{bPct}%</span>}
                </div>
              </div>

              {/* Verdict */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span style={{
                  fontSize: 15, fontWeight: 700, padding: '5px 14px', borderRadius: 6,
                  background: even ? 'var(--accent-10)' : aWins ? 'var(--accent-10)' : 'var(--surface)',
                  color: even ? 'var(--hex-purple)' : aWins ? 'var(--hex-purple)' : 'var(--text)',
                }}>
                  {even ? 'Even Trade' : aWins ? 'Side A Wins' : 'Side B Wins'}
                </span>
                <span style={{
                  fontSize: 15, fontWeight: 600, color: 'var(--text-muted)',
                }}>
                  {tier.label} ({tier.delta >= 0 ? '+' : ''}{tier.delta})
                </span>
              </div>
            </div>
          );
        })()}

        {/* CTA */}
        {(onSignIn || onSignUp) && (
          <div style={{
            marginTop: 16, padding: '14px 16px', borderRadius: 8,
            background: 'var(--hex-purple-light)',
            border: '1px solid var(--accent-20)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              Want roster-aware trade analysis?
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
              Sign in and import your league to unlock positional need adjustments, starter impact analysis, and replacement-level valuations.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {onSignIn && <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={onSignIn}>Sign In</button>}
              {onSignUp && <button className="ff-btn ff-btn-primary ff-btn-sm" onClick={onSignUp}>Create Account</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
