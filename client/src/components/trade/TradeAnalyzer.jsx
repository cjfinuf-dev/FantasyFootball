import { computeTradeTier, computeTradeValue, HEX_SCORES } from '../../utils/hexScore';
import { PLAYERS } from '../../data/players';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

export default function TradeAnalyzer({ sendIds, receiveIds, userRoster, partnerRoster, scoringPreset }) {
  if (sendIds.length === 0 && receiveIds.length === 0) return null;

  const { sendTotal, receiveTotal, delta, ratio, label, css } = computeTradeTier(sendIds, receiveIds, userRoster, partnerRoster, scoringPreset);
  const totalValue = sendTotal + receiveTotal || 1;
  const sendPct = Math.round((sendTotal / totalValue) * 100);
  const receivePct = 100 - sendPct;

  // Glow intensity based on how favorable the trade is
  const glowClass = ratio >= 0.35 ? ' hex-glow-elite' : ratio >= 0.25 ? ' hex-glow-strong' : '';

  // Roster impact
  const userBefore = userRoster ? computeTradeValue(userRoster) : null;
  const partnerBefore = partnerRoster ? computeTradeValue(partnerRoster) : null;
  const userAfter = userBefore !== null
    ? userBefore - sendTotal + receiveTotal
    : null;
  const partnerAfter = partnerBefore !== null
    ? partnerBefore - receiveTotal + sendTotal
    : null;

  return (
    <div className="ff-tm-analyzer">
      <div className="ff-tm-analyzer-labels">
        <span>You Send: <strong>{sendTotal}</strong></span>
        <span>You Get: <strong>{receiveTotal}</strong></span>
      </div>
      <div className="ff-tm-analyzer-bar">
        <div className="ff-tm-analyzer-fill-left" style={{ width: `${sendPct}%` }} />
        <div className="ff-tm-analyzer-fill-right" style={{ width: `${receivePct}%` }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <span className={`ff-tm-fairness-badge ${css}${glowClass}`}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Net: <strong style={{ color: delta >= 0 ? 'var(--success-green)' : 'var(--red)' }}>
            {delta >= 0 ? '+' : ''}{delta}
          </strong> HexScore
        </span>
      </div>

      {/* Roster impact */}
      {userAfter !== null && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Your Roster</div>
            <div>Before: <span className="tabular-nums">{userBefore}</span></div>
            <div>After: <span className="tabular-nums" style={{ color: userAfter >= userBefore ? 'var(--success-green)' : 'var(--red)' }}>{userAfter}</span></div>
          </div>
          {partnerAfter !== null && (
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Their Roster</div>
              <div>Before: <span className="tabular-nums">{partnerBefore}</span></div>
              <div>After: <span className="tabular-nums" style={{ color: partnerAfter >= partnerBefore ? 'var(--success-green)' : 'var(--red)' }}>{partnerAfter}</span></div>
            </div>
          )}
        </div>
      )}

      {/* Player-level impact */}
      {(sendIds.length > 0 || receiveIds.length > 0) && (
        <div style={{ marginTop: 10, fontSize: 11 }}>
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
