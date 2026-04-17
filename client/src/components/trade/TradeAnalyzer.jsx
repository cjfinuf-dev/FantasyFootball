import { computeTradeTier, computeTradeValue, getHexScore } from '../../utils/hexScore';
import { PLAYERS } from '../../data/players';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

const STARTER_COUNTS = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 };
const NEED_BOOST = 1.15;

function getPositionalNeedBoost(receiveIds, userRoster, scoringPreset) {
  if (!userRoster || userRoster.length === 0) return {};
  const boosts = {};
  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    const rosterAtPos = userRoster.filter(pid => PLAYER_MAP[pid]?.pos === pos);
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

function getPositionalImpact(sendIds, receiveIds, userRoster, scoringPreset) {
  if (!userRoster || userRoster.length === 0) return null;

  // Count position players before/after
  const posCount = {};
  const posHex = {};
  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    const rosterAtPos = userRoster.filter(pid => PLAYER_MAP[pid]?.pos === pos);
    const hexes = rosterAtPos.map(pid => getHexScore(pid, scoringPreset)).sort((a, b) => b - a);
    const needed = STARTER_COUNTS[pos] || 1;
    posCount[pos] = rosterAtPos.length;
    posHex[pos] = hexes.slice(0, needed);
  }

  // What positions are we losing/gaining?
  const warnings = [];
  const gains = [];

  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    const sending = sendIds.filter(id => PLAYER_MAP[id]?.pos === pos).length;
    const receiving = receiveIds.filter(id => PLAYER_MAP[id]?.pos === pos).length;
    const needed = STARTER_COUNTS[pos] || 1;
    const afterCount = posCount[pos] - sending + receiving;

    if (sending > 0 && afterCount < needed) {
      warnings.push(`Thin at ${pos} after this trade (${afterCount} remaining, need ${needed} starter${needed > 1 ? 's' : ''})`);
    }
    if (receiving > 0 && posCount[pos] >= needed + 2 && afterCount > posCount[pos]) {
      warnings.push(`Already deep at ${pos} (${posCount[pos]} players) — adding more may not help`);
    }
    if (receiving > sending && receiving > 0) {
      const gainHex = receiveIds.filter(id => PLAYER_MAP[id]?.pos === pos).map(id => getHexScore(id, scoringPreset));
      const maxGain = Math.max(0, ...gainHex);
      const currentBest = posHex[pos]?.[posHex[pos].length - 1] || 0;
      if (maxGain > currentBest) {
        gains.push(`Upgrade at ${pos} starter`);
      }
    }
  }

  return { warnings, gains };
}

export default function TradeAnalyzer({ sendIds, receiveIds, userRoster, partnerRoster, scoringPreset }) {
  if (sendIds.length === 0 && receiveIds.length === 0) return null;

  const { sendTotal, receiveTotal, delta, ratio, label, css } = computeTradeTier(sendIds, receiveIds, userRoster, partnerRoster, scoringPreset);

  // Contextual value: apply positional-need boost to the SAME trade-value
  // transform `receiveTotal` used, so the two numbers are comparable. Using
  // raw HexScore here would mix a 0-100 score with a replacement-decayed +
  // concentration-penalized trade value.
  const needBoosts = getPositionalNeedBoost(receiveIds, userRoster, scoringPreset);
  const hasAnyBoost = Object.values(needBoosts).some(m => m > 1);
  const contextualReceiveTotal = hasAnyBoost
    ? (() => {
        // Scale each receive player's contribution to receiveTotal by its boost.
        // If receiveIds is empty, fall back to receiveTotal.
        if (receiveIds.length === 0) return receiveTotal;
        const rawSum = receiveIds.reduce((s, id) => s + getHexScore(id, scoringPreset), 0) || 1;
        const boostedRawSum = receiveIds.reduce((s, id) => {
          const raw = getHexScore(id, scoringPreset);
          const mult = needBoosts[id] || 1.0;
          return s + raw * mult;
        }, 0);
        return receiveTotal * (boostedRawSum / rawSum);
      })()
    : receiveTotal;
  const contextualReceive = Math.round(contextualReceiveTotal * 10) / 10;
  const hasContextBoost = contextualReceive !== receiveTotal;

  const combinedValue = sendTotal + receiveTotal;
  const noValueData = combinedValue < 5;
  const totalValue = combinedValue || 1;
  const sendPct = Math.round((sendTotal / totalValue) * 100);
  const receivePct = 100 - sendPct;

  const glowClass = ratio >= 0.35 ? ' hex-glow-elite' : ratio >= 0.25 ? ' hex-glow-strong' : '';

  // Roster impact. Subtract/add on the same basis — the roster totals below
  // are `computeTradeValue` sums (no concentration penalty), so use a
  // penalty-free value for the deltas too. Otherwise we mix raw and
  // penalized numbers and the "after" totals drift.
  const userBefore = userRoster ? computeTradeValue(userRoster, scoringPreset) : null;
  const partnerBefore = partnerRoster ? computeTradeValue(partnerRoster, scoringPreset) : null;
  const sendDelta = computeTradeValue(sendIds, scoringPreset);
  const receiveDelta = computeTradeValue(receiveIds, scoringPreset);
  const userAfter = userBefore !== null ? userBefore - sendDelta + receiveDelta : null;
  const partnerAfter = partnerBefore !== null ? partnerBefore - receiveDelta + sendDelta : null;

  // Positional depth analysis
  const posImpact = getPositionalImpact(sendIds, receiveIds, userRoster, scoringPreset);

  return (
    <div className="ff-tm-analyzer">
      {/* Balance labels */}
      <div className="ff-tm-analyzer-labels">
        <span className="send-label">You Send: <strong>{sendTotal}</strong></span>
        <span className="receive-label">You Get: <strong>{receiveTotal}</strong></span>
      </div>

      {/* Tug-of-war bar */}
      {noValueData ? (
        <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', padding: '8px 0' }}>
          No HexScore data available for these players
        </div>
      ) : (
        <div className="ff-tm-analyzer-bar">
          <div className="ff-tm-analyzer-fill-left" style={{ width: `${sendPct}%` }} />
          <div className="ff-tm-analyzer-fill-right" style={{ width: `${receivePct}%` }} />
        </div>
      )}

      {/* Verdict */}
      <div className="ff-tm-verdict-row">
        <span className={`ff-tm-fairness-badge ${css}${glowClass}`}>{label}</span>
        <span className="ff-tm-net-delta">
          Net: <strong style={{ color: delta >= 0 ? 'var(--success-green)' : 'var(--red)' }}>
            {delta >= 0 ? '+' : ''}{delta}
          </strong> HexScore
          {hasContextBoost && (
            <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              Contextual: <strong style={{ color: contextualReceive >= sendTotal ? 'var(--success-green)' : 'var(--red)' }}>
                {contextualReceive}
              </strong>
            </span>
          )}
        </span>
      </div>

      {/* Positional warnings & gains */}
      {posImpact && (posImpact.warnings.length > 0 || posImpact.gains.length > 0) && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {posImpact.warnings.map((w, i) => (
            <div key={`w${i}`} style={{
              fontSize: 14, padding: '6px 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--red-light)', color: 'var(--red)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 15 }}>{'\u26A0'}</span> {w}
            </div>
          ))}
          {posImpact.gains.map((g, i) => (
            <div key={`g${i}`} style={{
              fontSize: 14, padding: '6px 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--green-light)', color: 'var(--success-green)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 15 }}>{'\u2714'}</span> {g}
            </div>
          ))}
        </div>
      )}

      {/* Roster impact */}
      {userAfter !== null && (
        <div className="ff-tm-impact-grid">
          <div>
            <div className="ff-tm-impact-col-label">Your Roster</div>
            <div className="ff-tm-impact-stat">Before: <span className="val">{userBefore}</span></div>
            <div className="ff-tm-impact-stat">
              After: <span className="val" style={{ color: userAfter >= userBefore ? 'var(--success-green)' : 'var(--red)' }}>{userAfter}</span>
            </div>
          </div>
          {partnerAfter !== null && (
            <div>
              <div className="ff-tm-impact-col-label">Their Roster</div>
              <div className="ff-tm-impact-stat">Before: <span className="val">{partnerBefore}</span></div>
              <div className="ff-tm-impact-stat">
                After: <span className="val" style={{ color: partnerAfter >= partnerBefore ? 'var(--success-green)' : 'var(--red)' }}>{partnerAfter}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Player-level impact */}
      {(sendIds.length > 0 || receiveIds.length > 0) && (
        <div style={{ marginTop: 12, fontSize: 14 }}>
          {sendIds.map(id => {
            const p = PLAYER_MAP[id];
            return p ? <div key={id} className="ff-tm-impact-row removed">- {p.name} ({p.pos})</div> : null;
          })}
          {receiveIds.map(id => {
            const p = PLAYER_MAP[id];
            return p ? <div key={id} className="ff-tm-impact-row added">+ {p.name} ({p.pos})</div> : null;
          })}
        </div>
      )}
    </div>
  );
}
