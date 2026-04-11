import { useState, useEffect } from 'react';
import { USER_TEAM_ID } from '../../data/teams';
import { TRADES_SEED, TRADE_HISTORY_SEED } from '../../data/rosters';
import { deepClone } from '../../utils/helpers';
import TradeProposal from './TradeProposal';
import TradeInbox from './TradeInbox';
import TradeHistory from './TradeHistory';

export default function TradeCenter({ rosters, onRostersChange, scoringPreset = 'standard', onOpenCompare, leagueId = 'default' }) {
  const [subTab, setSubTab] = useState('propose');

  const [trades, setTrades] = useState(() => {
    try {
      const stored = localStorage.getItem('ff-trades-' + leagueId);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.v === 1 && Array.isArray(parsed.trades)) return parsed.trades;
      }
    } catch { /* fall through to seed */ }
    return deepClone(TRADES_SEED);
  });

  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('ff-trades-' + leagueId);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.v === 1 && Array.isArray(parsed.history)) return parsed.history;
      }
    } catch { /* fall through to seed */ }
    return deepClone(TRADE_HISTORY_SEED);
  });

  // Persist trades + history to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('ff-trades-' + leagueId, JSON.stringify({ v: 1, trades, history }));
    } catch { /* storage full or unavailable — silent */ }
  }, [trades, history, leagueId]);

  const pendingCount = trades.filter(t =>
    (t.toTeamId === USER_TEAM_ID || t.fromTeamId === USER_TEAM_ID) && t.status === 'pending'
  ).length;

  const handlePropose = (proposal) => {
    const newTrade = {
      id: 'tr' + Date.now(),
      status: 'pending',
      ...proposal,
      proposedAt: Date.now(),
    };
    setTrades(prev => [newTrade, ...prev]);
    setSubTab('inbox');
  };

  const handleAccept = (tradeId) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    setTrades(prev => prev.filter(t => t.id !== tradeId));
    setHistory(prev => [{ ...trade, status: 'completed', resolvedAt: Date.now() }, ...prev]);

    if (onRostersChange && rosters) {
      const newRosters = deepClone(rosters);
      const fromRoster = newRosters[trade.fromTeamId] || [];
      const toRoster = newRosters[trade.toTeamId] || [];

      trade.offeringPlayerIds.forEach(pid => {
        const idx = fromRoster.indexOf(pid);
        if (idx !== -1) fromRoster.splice(idx, 1);
        toRoster.push(pid);
      });

      trade.requestingPlayerIds.forEach(pid => {
        const idx = toRoster.indexOf(pid);
        if (idx !== -1) toRoster.splice(idx, 1);
        fromRoster.push(pid);
      });

      newRosters[trade.fromTeamId] = fromRoster;
      newRosters[trade.toTeamId] = toRoster;
      onRostersChange(newRosters);
    }
  };

  const handleReject = (tradeId) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;
    setTrades(prev => prev.filter(t => t.id !== tradeId));
    setHistory(prev => [{ ...trade, status: 'rejected', resolvedAt: Date.now() }, ...prev]);
  };

  const handleWithdraw = (tradeId) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;
    setTrades(prev => prev.filter(t => t.id !== tradeId));
    setHistory(prev => [{ ...trade, status: 'withdrawn', resolvedAt: Date.now() }, ...prev]);
  };

  return (
    <div className="ff-tm-shell">
      <div className="ff-tm-header">
        <div>
          <h2>Trade Center</h2>
          <div className="ff-tm-header-sub">NEGOTIATE &middot; ANALYZE &middot; EXECUTE</div>
        </div>

        <div className="ff-tm-subtabs">
          <button className={`ff-tm-subtab${subTab === 'propose' ? ' active' : ''}`} onClick={() => setSubTab('propose')}>
            Propose
          </button>
          <button className={`ff-tm-subtab${subTab === 'inbox' ? ' active' : ''}`} onClick={() => setSubTab('inbox')}>
            Inbox{pendingCount > 0 && <span className="ff-tm-badge">{pendingCount}</span>}
          </button>
          <button className={`ff-tm-subtab${subTab === 'history' ? ' active' : ''}`} onClick={() => setSubTab('history')}>
            History
          </button>
        </div>
      </div>

      <div className="ff-tm-body">
        {subTab === 'propose' && (
          <TradeProposal rosters={rosters} onPropose={handlePropose} scoringPreset={scoringPreset} onOpenCompare={onOpenCompare} />
        )}
        {subTab === 'inbox' && (
          <TradeInbox
            trades={trades}
            rosters={rosters}
            onAccept={handleAccept}
            onReject={handleReject}
            onWithdraw={handleWithdraw}
          />
        )}
        {subTab === 'history' && (
          <TradeHistory history={history} />
        )}
      </div>
    </div>
  );
}
