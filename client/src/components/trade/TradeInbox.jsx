import { useState } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { PLAYERS } from '../../data/players';
import { timeUntil } from '../../utils/helpers';
import TradeAnalyzer from './TradeAnalyzer';
import TradePlayerRow from './TradePlayerRow';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

export default function TradeInbox({ trades, rosters, onAccept, onReject, onWithdraw }) {
  const [confirmAction, setConfirmAction] = useState(null); // { tradeId, action }

  const incoming = trades.filter(t => t.toTeamId === USER_TEAM_ID && t.status === 'pending');
  const outgoing = trades.filter(t => t.fromTeamId === USER_TEAM_ID && t.status === 'pending');

  const handleConfirm = (tradeId, action) => {
    if (action === 'accept') onAccept?.(tradeId);
    else if (action === 'reject') onReject?.(tradeId);
    else if (action === 'withdraw') onWithdraw?.(tradeId);
    setConfirmAction(null);
  };

  function renderTradeCard(trade, direction) {
    const isIncoming = direction === 'incoming';
    const fromTeam = TEAMS.find(t => t.id === trade.fromTeamId);
    const toTeam = TEAMS.find(t => t.id === trade.toTeamId);
    const timeLeft = timeUntil(trade.expiresAt);
    const isUrgent = trade.expiresAt - Date.now() < 6 * 3600000;

    // For incoming: they send offeringPlayerIds, we send requestingPlayerIds
    // Our perspective: we receive offeringPlayerIds, we send requestingPlayerIds
    const sendIds = isIncoming ? trade.requestingPlayerIds : trade.offeringPlayerIds;
    const receiveIds = isIncoming ? trade.offeringPlayerIds : trade.requestingPlayerIds;

    return (
      <div key={trade.id} className={`ff-tm-inbox-card ${direction}`}>
        <div className="ff-tm-inbox-header">
          <span className="ff-tm-inbox-teams">
            {isIncoming ? `${fromTeam?.abbr} wants to trade` : `Trade to ${toTeam?.abbr}`}
          </span>
          <span className={`ff-tm-inbox-countdown${isUrgent ? ' urgent' : ''}`}>{timeLeft}</span>
        </div>

        {/* Players */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '8px 0' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              {isIncoming ? 'They Send' : 'You Send'}
            </div>
            {(isIncoming ? trade.offeringPlayerIds : trade.offeringPlayerIds).map(id => (
              <TradePlayerRow key={id} playerId={id} />
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              {isIncoming ? 'They Want' : 'You Want'}
            </div>
            {(isIncoming ? trade.requestingPlayerIds : trade.requestingPlayerIds).map(id => (
              <TradePlayerRow key={id} playerId={id} />
            ))}
          </div>
        </div>

        {/* Analyzer */}
        <TradeAnalyzer sendIds={sendIds} receiveIds={receiveIds} />

        {/* Message */}
        {trade.message && (
          <div className="ff-tm-inbox-message">{trade.message}</div>
        )}

        {/* Actions */}
        {confirmAction?.tradeId === trade.id ? (
          <div className="ff-tm-confirm-bar">
            <span>{confirmAction.action === 'accept' ? 'Accept this trade?' : confirmAction.action === 'reject' ? 'Reject this trade?' : 'Withdraw this trade?'}</span>
            <button className="ff-btn ff-btn-primary ff-btn-sm" onClick={() => handleConfirm(trade.id, confirmAction.action)}>Confirm</button>
            <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={() => setConfirmAction(null)}>Cancel</button>
          </div>
        ) : (
          <div className="ff-tm-inbox-actions">
            {isIncoming ? (
              <>
                <button className="ff-btn ff-btn-primary ff-btn-sm" onClick={() => setConfirmAction({ tradeId: trade.id, action: 'accept' })}>Accept</button>
                <button className="ff-btn ff-btn-danger ff-btn-sm" onClick={() => setConfirmAction({ tradeId: trade.id, action: 'reject' })}>Reject</button>
              </>
            ) : (
              <button className="ff-btn ff-btn-danger ff-btn-sm" onClick={() => setConfirmAction({ tradeId: trade.id, action: 'withdraw' })}>Withdraw</button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <div className="ff-empty-state">
        <div className="ff-empty-state-title">No pending trades</div>
        <div className="ff-empty-state-desc">Propose a trade to get started.</div>
      </div>
    );
  }

  return (
    <div>
      {incoming.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Incoming ({incoming.length})
          </div>
          {incoming.map(t => renderTradeCard(t, 'incoming'))}
        </div>
      )}
      {outgoing.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Outgoing ({outgoing.length})
          </div>
          {outgoing.map(t => renderTradeCard(t, 'outgoing'))}
        </div>
      )}
    </div>
  );
}
