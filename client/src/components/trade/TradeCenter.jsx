import { useState, useEffect } from 'react';
import { USER_TEAM_ID } from '../../data/teams';
import { TRADES_SEED, TRADE_HISTORY_SEED } from '../../data/rosters';
import { deepClone } from '../../utils/helpers';
import TradeProposal from './TradeProposal';
import TradeInbox from './TradeInbox';
import TradeHistory from './TradeHistory';
import TradeFinder from './TradeFinder';

export default function TradeCenter({ rosters, onRostersChange, scoringPreset = 'standard', onOpenCompare, leagueId = 'default' }) {
  const [subTab, setSubTab] = useState('find');
  const [prefill, setPrefill] = useState(null);

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

  const now = new Date();
  const timeLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="ff-trade-desk ff-tm-shell" data-td-subtab={subTab}>
      <div className="td-scanline" key={subTab} aria-hidden="true" />
      <aside className="td-rail" aria-hidden="true">
        <div className="td-rail__slot td-rail__station">DESK.03</div>
        <div className="td-rail__slot"><span>TIME</span><strong className="tabular-nums">{timeLabel}</strong></div>
        <div className="td-rail__slot"><span>PENDING</span><strong className="tabular-nums">{pendingCount}</strong></div>
        <div className="td-rail__slot"><span>ARCHIVED</span><strong className="tabular-nums">{history.length}</strong></div>
      </aside>

      <header className="td-head">
        <div className="td-head__tag">NEGOTIATE · SCOUT · EXECUTE</div>
        <nav className="td-switcher" role="tablist" aria-label="Trade desk sections">
          <button role="tab" aria-selected={subTab === 'find'} className={`td-switcher__tab${subTab === 'find' ? ' is-active' : ''}`} onClick={() => setSubTab('find')}>
            Find
          </button>
          <button role="tab" aria-selected={subTab === 'propose'} className={`td-switcher__tab${subTab === 'propose' ? ' is-active' : ''}`} onClick={() => setSubTab('propose')}>
            Propose
          </button>
          <button role="tab" aria-selected={subTab === 'inbox'} className={`td-switcher__tab${subTab === 'inbox' ? ' is-active' : ''}`} onClick={() => setSubTab('inbox')}>
            Inbox
            {pendingCount > 0 && <span className="td-switcher__badge">{pendingCount}</span>}
          </button>
          <button role="tab" aria-selected={subTab === 'history'} className={`td-switcher__tab${subTab === 'history' ? ' is-active' : ''}`} onClick={() => setSubTab('history')}>
            History
          </button>
        </nav>
      </header>

      <div className="ff-tm-body">
        {subTab === 'find' && (
          <TradeFinder
            rosters={rosters}
            history={history}
            scoringPreset={scoringPreset}
            onLoad={(payload) => {
              setPrefill(payload);
              setSubTab('propose');
            }}
          />
        )}
        {subTab === 'propose' && (
          <TradeProposal
            rosters={rosters}
            onPropose={handlePropose}
            scoringPreset={scoringPreset}
            onOpenCompare={onOpenCompare}
            history={history}
            prefill={prefill}
            onConsumePrefill={() => setPrefill(null)}
          />
        )}
        {subTab === 'inbox' && (
          <TradeInbox
            trades={trades}
            rosters={rosters}
            history={history}
            scoringPreset={scoringPreset}
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
