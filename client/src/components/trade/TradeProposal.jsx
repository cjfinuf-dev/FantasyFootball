import { useState } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { PLAYERS } from '../../data/players';
import { getHexScore } from '../../utils/hexScore';
import TradePlayerRow, { hexChipClass } from './TradePlayerRow';
import TradeAnalyzer from './TradeAnalyzer';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

export default function TradeProposal({ rosters, onPropose, scoringPreset }) {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [sendIds, setSendIds] = useState([]);
  const [receiveIds, setReceiveIds] = useState([]);
  const [message, setMessage] = useState('');
  const [expiry, setExpiry] = useState(48);
  const [posFilter, setPosFilter] = useState('ALL');

  const userRoster = rosters?.[USER_TEAM_ID] || [];
  const partnerRoster = selectedTeamId ? (rosters?.[selectedTeamId] || []) : [];
  const partnerTeam = TEAMS.find(t => t.id === selectedTeamId);

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

  // Team selection
  if (!selectedTeamId) {
    return (
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Select a team to trade with</div>
        <div className="ff-tm-team-grid">
          {TEAMS.filter(t => t.id !== USER_TEAM_ID).map(t => (
            <div
              key={t.id}
              className="ff-tm-team-card"
              onClick={() => setSelectedTeamId(t.id)}
            >
              <div className="ff-tm-team-card-name">{t.abbr}</div>
              <div className="ff-tm-team-card-meta">{t.name}</div>
              <div className="ff-tm-team-card-meta">{t.wins}-{t.losses}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={() => { setSelectedTeamId(null); setSendIds([]); setReceiveIds([]); }}>
            {'\u2190'} Back
          </button>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Trade with {partnerTeam?.name || 'Team'}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{partnerTeam?.wins}-{partnerTeam?.losses}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map(pos => (
            <button key={pos} className={`ff-tm-filter-pill${posFilter === pos ? ' active' : ''}`} onClick={() => setPosFilter(pos)}>
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Trade Zone */}
      {(sendIds.length > 0 || receiveIds.length > 0) && (
        <div className="ff-tm-trade-zone">
          <div className="ff-tm-zone-panel">
            <h4>Sending</h4>
            {sendIds.length === 0 ? (
              <div className="ff-tm-zone-empty">Click players from your roster</div>
            ) : (
              sendIds.map(id => (
                <div key={id} className="ff-tm-zone-player">
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{PLAYER_MAP[id]?.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>{PLAYER_MAP[id]?.pos}</span>
                  <span className={hexChipClass(getHexScore(id, scoringPreset))} style={{ marginLeft: 'auto', marginRight: 4 }}>{getHexScore(id, scoringPreset)}</span>
                  <button className="remove-btn" onClick={() => toggleSend(id)}>{'\u2715'}</button>
                </div>
              ))
            )}
          </div>
          <div className="ff-tm-zone-panel">
            <h4>Receiving</h4>
            {receiveIds.length === 0 ? (
              <div className="ff-tm-zone-empty">Click players from their roster</div>
            ) : (
              receiveIds.map(id => (
                <div key={id} className="ff-tm-zone-player">
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{PLAYER_MAP[id]?.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>{PLAYER_MAP[id]?.pos}</span>
                  <span className={hexChipClass(getHexScore(id, scoringPreset))} style={{ marginLeft: 'auto', marginRight: 4 }}>{getHexScore(id, scoringPreset)}</span>
                  <button className="remove-btn" onClick={() => toggleReceive(id)}>{'\u2715'}</button>
                </div>
              ))
            )}
          </div>
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
          <div className="ff-tm-column-header">Your Roster</div>
          <div className="ff-tm-column-list">
            {sortByHex(filterPlayers(userRoster)).map(id => (
              <TradePlayerRow
                key={id}
                playerId={id}
                selected={sendIds.includes(id)}
                onClick={toggleSend}
                scoringPreset={scoringPreset}
              />
            ))}
            {filterPlayers(userRoster).length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No players</div>
            )}
          </div>
        </div>
        <div className="ff-tm-column">
          <div className="ff-tm-column-header">{partnerTeam?.abbr || 'Team'} Roster</div>
          <div className="ff-tm-column-list">
            {sortByHex(filterPlayers(partnerRoster)).map(id => (
              <TradePlayerRow
                key={id}
                playerId={id}
                selected={receiveIds.includes(id)}
                onClick={toggleReceive}
                scoringPreset={scoringPreset}
              />
            ))}
            {filterPlayers(partnerRoster).length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No players</div>
            )}
          </div>
        </div>
      </div>

      {/* Message & Submit */}
      {sendIds.length > 0 && receiveIds.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <textarea
            className="ff-tm-message-input"
            placeholder="Add a message (optional)..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <select className="ff-tm-expiry-select" value={expiry} onChange={e => setExpiry(Number(e.target.value))}>
              <option value={24}>Expires in 24h</option>
              <option value={48}>Expires in 48h</option>
              <option value={72}>Expires in 72h</option>
            </select>
            <button className="ff-btn ff-btn-primary" onClick={handlePropose}>
              Propose Trade
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
