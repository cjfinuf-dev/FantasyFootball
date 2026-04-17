import { useState, useEffect, useMemo } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { PLAYERS } from '../../data/players';
import { getHexScore, formatHex } from '../../utils/hexScore';
import { estimateAcceptance } from '../../utils/tradeMatchmaker';
import TradePlayerRow, { hexChipClass } from './TradePlayerRow';
import TradeAnalyzer from './TradeAnalyzer';
import PartnerProfile from './PartnerProfile';
import AcceptanceMeter from './AcceptanceMeter';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

export default function TradeProposal({ rosters, onPropose, scoringPreset, onOpenCompare, history = [], prefill = null, onConsumePrefill }) {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [sendIds, setSendIds] = useState([]);
  const [receiveIds, setReceiveIds] = useState([]);
  const [message, setMessage] = useState('');
  const [expiry, setExpiry] = useState(48);
  const [posFilter, setPosFilter] = useState('ALL');

  // Consume prefill from TradeFinder → set partner + sides, then clear.
  useEffect(() => {
    if (!prefill) return;
    setSelectedTeamId(prefill.partnerId || null);
    setSendIds(prefill.sendIds || []);
    setReceiveIds(prefill.receiveIds || []);
    setPosFilter('ALL');
    onConsumePrefill?.();
  }, [prefill]);

  const userRoster = rosters?.[USER_TEAM_ID] || [];
  const partnerRoster = selectedTeamId ? (rosters?.[selectedTeamId] || []) : [];
  const partnerTeam = TEAMS.find(t => t.id === selectedTeamId);

  // Live acceptance estimate for the current sides — feeds the AcceptanceMeter.
  const acceptance = useMemo(() => {
    if (!selectedTeamId || sendIds.length === 0 || receiveIds.length === 0) return null;
    return estimateAcceptance({
      offeringPlayerIds: sendIds,
      requestingPlayerIds: receiveIds,
      toTeamId: selectedTeamId,
      partnerRosterIds: partnerRoster,
      history,
      scoringPreset,
    });
  }, [selectedTeamId, sendIds, receiveIds, partnerRoster, history, scoringPreset]);

  const toggleSend = (id) => {
    setSendIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleReceive = (id) => {
    setReceiveIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePropose = () => {
    if (sendIds.length === 0 || receiveIds.length === 0) return;
    onPropose?.({
      fromTeamId: USER_TEAM_ID,
      toTeamId: selectedTeamId,
      offeringPlayerIds: sendIds,
      requestingPlayerIds: receiveIds,
      message,
      expiresAt: Date.now() + expiry * 3600000,
    });
    setSendIds([]);
    setReceiveIds([]);
    setMessage('');
  };

  const filterPlayers = (ids) => {
    if (posFilter === 'ALL') return ids;
    return ids.filter(id => PLAYER_MAP[id]?.pos === posFilter);
  };

  const sortByHex = (ids) => [...ids].sort((a, b) => getHexScore(b, scoringPreset) - getHexScore(a, scoringPreset));

  // Team selection screen
  if (!selectedTeamId) {
    return (
      <div>
        <div className="ff-tm-inbox-section-label">Select your trade partner</div>
        <div className="ff-tm-team-grid">
          {TEAMS.filter(t => t.id !== USER_TEAM_ID).map(t => (
            <div
              key={t.id}
              className="ff-tm-team-card"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedTeamId(t.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTeamId(t.id); } }}
            >
              <div className="ff-tm-team-card-name">{t.name}</div>
              <div className="ff-tm-team-card-meta">{t.owner}</div>
              <div className="ff-tm-team-card-record">
                <span className="wins">{t.wins}W</span>
                <span className="losses">{t.losses}L</span>
                <div className="ff-tm-power-gauge">
                  <div className="ff-tm-power-gauge-fill" style={{ width: `${t.power}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Builder header */}
      <div className="ff-tm-builder-header">
        <div className="ff-tm-builder-opponent">
          <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={() => { setSelectedTeamId(null); setSendIds([]); setReceiveIds([]); }}>
            {'\u2190'}
          </button>
          <span className="team-label">Trade with {partnerTeam?.name}</span>
          <span className="team-record">{partnerTeam?.wins}-{partnerTeam?.losses}</span>
        </div>
        <div className="ff-tm-pos-filters">
          {['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map(pos => (
            <button key={pos} className={`ff-tm-filter-pill${posFilter === pos ? ' active' : ''}`} onClick={() => setPosFilter(pos)}>
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Partner dossier — needs, surplus, trade-openness */}
      <PartnerProfile
        partner={partnerTeam}
        partnerRosterIds={partnerRoster}
        history={history}
        scoringPreset={scoringPreset}
      />

      {/* Acceptance meter — only meaningful once both sides have players */}
      {sendIds.length > 0 && receiveIds.length > 0 && acceptance && (
        <div style={{ marginBottom: 18 }}>
          <AcceptanceMeter result={acceptance} headline="WILL THEY ACCEPT?" size="md" />
        </div>
      )}

      {/* Trade staging zone */}
      {(sendIds.length > 0 || receiveIds.length > 0) && (
        <div className="ff-tm-trade-zone">
          <div className="ff-tm-zone-panel send-panel">
            <h4><span className="arrow">{'\u2191'}</span> Sending</h4>
            {sendIds.length === 0 ? (
              <div className="ff-tm-zone-empty">Select players from your roster</div>
            ) : (
              sendIds.map(id => (
                <div key={id} className="ff-tm-zone-player">
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{PLAYER_MAP[id]?.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{PLAYER_MAP[id]?.pos}</span>
                  <span className={hexChipClass(getHexScore(id, scoringPreset))} style={{ marginLeft: 'auto', marginRight: 4 }}>{formatHex(getHexScore(id, scoringPreset))}</span>
                  <button className="remove-btn" onClick={() => toggleSend(id)}>{'\u2715'}</button>
                </div>
              ))
            )}
          </div>
          <div className="ff-tm-zone-panel receive-panel">
            <h4><span className="arrow">{'\u2193'}</span> Receiving</h4>
            {receiveIds.length === 0 ? (
              <div className="ff-tm-zone-empty">Select players from their roster</div>
            ) : (
              receiveIds.map(id => (
                <div key={id} className="ff-tm-zone-player">
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{PLAYER_MAP[id]?.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{PLAYER_MAP[id]?.pos}</span>
                  <span className={hexChipClass(getHexScore(id, scoringPreset))} style={{ marginLeft: 'auto', marginRight: 4 }}>{formatHex(getHexScore(id, scoringPreset))}</span>
                  <button className="remove-btn" onClick={() => toggleReceive(id)}>{'\u2715'}</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Compare link */}
      {onOpenCompare && sendIds.length > 0 && receiveIds.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 0' }}>
          <button
            onClick={() => onOpenCompare([...sendIds, ...receiveIds])}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--hex-purple)', fontSize: 14, fontWeight: 600,
              textDecoration: 'underline', textUnderlineOffset: 2,
            }}
          >
            Compare in HexCompare
          </button>
        </div>
      )}

      {/* Analyzer */}
      <TradeAnalyzer
        sendIds={sendIds}
        receiveIds={receiveIds}
        userRoster={userRoster}
        partnerRoster={partnerRoster}
        scoringPreset={scoringPreset}
      />

      {/* Roster columns */}
      <div className="ff-tm-columns">
        <div className="ff-tm-column">
          <div className="ff-tm-column-header send">
            <span>Your Roster</span>
            <span className="count">{filterPlayers(userRoster).length} players</span>
          </div>
          <div className="ff-tm-column-list">
            {sortByHex(filterPlayers(userRoster)).map(id => (
              <TradePlayerRow
                key={id}
                playerId={id}
                selected={sendIds.includes(id)}
                onClick={toggleSend}
                scoringPreset={scoringPreset}
                side="send"
              />
            ))}
            {filterPlayers(userRoster).length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>No players at this position</div>
            )}
          </div>
        </div>
        <div className="ff-tm-column">
          <div className="ff-tm-column-header receive">
            <span>{partnerTeam?.name}</span>
            <span className="count">{filterPlayers(partnerRoster).length} players</span>
          </div>
          <div className="ff-tm-column-list">
            {sortByHex(filterPlayers(partnerRoster)).map(id => (
              <TradePlayerRow
                key={id}
                playerId={id}
                selected={receiveIds.includes(id)}
                onClick={toggleReceive}
                scoringPreset={scoringPreset}
                side="receive"
              />
            ))}
            {filterPlayers(partnerRoster).length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>No players at this position</div>
            )}
          </div>
        </div>
      </div>

      {/* Message & Submit */}
      {sendIds.length > 0 && receiveIds.length > 0 && (
        <div className="ff-tm-submit-area">
          <textarea
            className="ff-tm-message-input"
            placeholder="Add a message to your trade offer..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <div className="ff-tm-submit-row">
            <select className="ff-tm-expiry-select" value={expiry} onChange={e => setExpiry(Number(e.target.value))}>
              <option value={24}>Expires in 24h</option>
              <option value={48}>Expires in 48h</option>
              <option value={72}>Expires in 72h</option>
            </select>
            <button className="ff-tm-propose-btn" onClick={handlePropose}>
              Propose Trade
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
