import { useState } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { PLAYERS } from '../../data/players';
import { timeUntil } from '../../utils/helpers';
import { estimateAcceptance } from '../../utils/tradeMatchmaker';
import TradeAnalyzer from './TradeAnalyzer';
import TradePlayerRow from './TradePlayerRow';
import AcceptanceMeter from './AcceptanceMeter';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

export default function TradeInbox({ trades, rosters, onAccept, onReject, onWithdraw, history = [], scoringPreset = 'standard' }) {
  const [confirmAction, setConfirmAction] = useState(null);

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

    const sendIds = isIncoming ? trade.requestingPlayerIds : trade.offeringPlayerIds;
    const receiveIds = isIncoming ? trade.offeringPlayerIds : trade.requestingPlayerIds;

    return (
      <div key={trade.id} className={`ff-tm-inbox-card ${direction}`}>
        <div className="ff-tm-inbox-header">
          <span className="ff-tm-inbox-teams">
            {isIncoming ? `${fromTeam?.name} wants to trade` : `Trade to ${toTeam?.name}`}
          </span>
          <span className={`ff-tm-inbox-countdown${isUrgent ? ' urgent' : ''}`}>{timeLeft}</span>
        </div>

        <div className="ff-tm-inbox-players">
          <div>
            <div className="ff-tm-inbox-side-label">
              {isIncoming ? 'They Send' : 'You Send'}
            </div>
            {(isIncoming ? trade.offeringPlayerIds : trade.offeringPlayerIds).map(id => (
              <TradePlayerRow key={id} playerId={id} />
            ))}
          </div>
          <div>
            <div className="ff-tm-inbox-side-label">
              {isIncoming ? 'They Want' : 'You Want'}
            </div>
            {(isIncoming ? trade.requestingPlayerIds : trade.requestingPlayerIds).map(id => (
              <TradePlayerRow key={id} playerId={id} />
            ))}
          </div>
        </div>

        <TradeAnalyzer sendIds={sendIds} receiveIds={receiveIds} />

        {/* Acceptance readout: for outgoing trades, show the partner's
            likelihood; for incoming, flip perspective — show what the OTHER
            side thinks of it (i.e. would YOU accept from their angle). */}
        {(() => {
          const partnerId = isIncoming ? trade.fromTeamId : trade.toTeamId;
          const partnerRoster = rosters?.[partnerId] || [];
          const result = estimateAcceptance({
            offeringPlayerIds: isIncoming ? trade.offeringPlayerIds : trade.offeringPlayerIds,
            requestingPlayerIds: isIncoming ? trade.requestingPlayerIds : trade.requestingPlayerIds,
            toTeamId: isIncoming ? USER_TEAM_ID : trade.toTeamId,
            partnerRosterIds: isIncoming ? (rosters?.[USER_TEAM_ID] || []) : partnerRoster,
            history,
            scoringPreset,
          });
          return (
            <div style={{ marginTop: 14 }}>
              <AcceptanceMeter
                result={result}
                size="sm"
                headline={isIncoming ? 'SHOULD YOU ACCEPT?' : 'WILL THEY ACCEPT?'}
                showReasons={true}
              />
            </div>
          );
        })()}

        {trade.message && (
          <div className="ff-tm-inbox-message">{trade.message}</div>
        )}

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
        <div style={{ marginBottom: 20 }}>
          <div className="ff-tm-inbox-section-label">
            Incoming <span className="count">{incoming.length}</span>
          </div>
          {incoming.map(t => renderTradeCard(t, 'incoming'))}
        </div>
      )}
      {outgoing.length > 0 && (
        <div>
          <div className="ff-tm-inbox-section-label">
            Outgoing <span className="count">{outgoing.length}</span>
          </div>
          {outgoing.map(t => renderTradeCard(t, 'outgoing'))}
        </div>
      )}
    </div>
  );
}
