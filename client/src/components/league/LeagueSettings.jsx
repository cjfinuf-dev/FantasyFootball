import { useState } from 'react';

const SCORING_OPTIONS = ['standard', 'ppr', 'halfPpr'];
const WAIVER_TYPES = ['FAAB', 'Rolling', 'Inverse Standings'];
const TRADE_DEADLINES = ['None', 'Week 10', 'Week 11', 'Week 12', 'Week 13'];

export default function LeagueSettings({ league, members, onRemoveMember }) {
  const [removeConfirmId, setRemoveConfirmId] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState({
    scoring: league.scoring_preset || 'ppr',
    tradeDeadline: 'Week 12',
    waiverType: 'FAAB',
    faabBudget: 100,
    tradeReview: 'commissioner',
    rosterLocked: false,
    tradingPaused: false,
    maxBenchSize: 6,
    irSlots: 1,
    playoffTeams: 6,
  });
  const [copiedInvite, setCopiedInvite] = useState(false);

  const handleRemove = async (memberId) => {
    setRemovingMemberId(memberId);
    try {
      await onRemoveMember(memberId);
      setRemoveConfirmId(null);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard?.writeText(league.invite_code || '');
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const isCommissioner = league.role === 'commissioner';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* League Info Card */}
      <div className="ff-card">
        <div className="ff-card-top-accent" style={{ background: 'var(--charcoal-slate)' }} />
        <div className="ff-card-header">
          <h2>League Info</h2>
          {isCommissioner && (
            <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={() => setEditing(!editing)}>
              {editing ? 'Done' : 'Edit'}
            </button>
          )}
        </div>
        <div className="ff-card-body">
          <div className="ff-settings-grid">
            <div><span className="ff-settings-label">League Type</span>{league.type}</div>
            <div>
              <span className="ff-settings-label">Scoring</span>
              {editing ? (
                <select className="ff-tm-expiry-select" value={settings.scoring} onChange={e => setSettings(s => ({ ...s, scoring: e.target.value }))}>
                  {SCORING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
                </select>
              ) : (
                <span>{(settings.scoring || league.scoring_preset).toUpperCase()}</span>
              )}
            </div>
            <div><span className="ff-settings-label">Teams</span>{league.league_size}</div>
            <div><span className="ff-settings-label">Season</span>{league.season}</div>
            {league.invite_code && (
              <div className="ff-settings-invite">
                <span className="ff-settings-label">Invite Code</span>
                <span className="ff-settings-invite-code">{league.invite_code}</span>
                <button className="ff-btn ff-btn-secondary ff-btn-sm" style={{ marginLeft: 8 }} onClick={handleCopyInvite}>
                  {copiedInvite ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* League Rules Card */}
      <div className="ff-card">
        <div className="ff-card-top-accent" style={{ background: 'var(--hex-purple)' }} />
        <div className="ff-card-header"><h2>League Rules</h2></div>
        <div className="ff-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Waivers</div>
              {editing ? (
                <select className="ff-tm-expiry-select" value={settings.waiverType} onChange={e => setSettings(s => ({ ...s, waiverType: e.target.value }))}>
                  {WAIVER_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 13, fontWeight: 600 }}>{settings.waiverType}</div>
              )}
              {settings.waiverType === 'FAAB' && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Budget: {editing ? (
                    <input type="number" value={settings.faabBudget} onChange={e => setSettings(s => ({ ...s, faabBudget: Number(e.target.value) }))}
                      style={{ width: 60, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, background: 'var(--bg-white)', color: 'var(--text)' }} />
                  ) : <span style={{ fontFamily: "'DM Mono', monospace" }}>${settings.faabBudget}</span>}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Trade Deadline</div>
              {editing ? (
                <select className="ff-tm-expiry-select" value={settings.tradeDeadline} onChange={e => setSettings(s => ({ ...s, tradeDeadline: e.target.value }))}>
                  {TRADE_DEADLINES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 13, fontWeight: 600 }}>{settings.tradeDeadline}</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Trade Review</div>
              {editing ? (
                <select className="ff-tm-expiry-select" value={settings.tradeReview} onChange={e => setSettings(s => ({ ...s, tradeReview: e.target.value }))}>
                  <option value="commissioner">Commissioner</option>
                  <option value="league_vote">League Vote</option>
                  <option value="none">None (auto-accept)</option>
                </select>
              ) : (
                <div style={{ fontSize: 13, fontWeight: 600 }}>{settings.tradeReview === 'commissioner' ? 'Commissioner Review' : settings.tradeReview === 'league_vote' ? 'League Vote' : 'Auto-Accept'}</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Playoff Teams</div>
              {editing ? (
                <select className="ff-tm-expiry-select" value={settings.playoffTeams} onChange={e => setSettings(s => ({ ...s, playoffTeams: Number(e.target.value) }))}>
                  {[4, 6, 8].map(n => <option key={n} value={n}>{n} teams</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 13, fontWeight: 600 }}>{settings.playoffTeams} teams</div>
              )}
            </div>
          </div>

          {/* Roster Config */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Roster Configuration</div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Bench: </span>
                {editing ? (
                  <input type="number" value={settings.maxBenchSize} min={3} max={10} onChange={e => setSettings(s => ({ ...s, maxBenchSize: Number(e.target.value) }))}
                    style={{ width: 40, padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, background: 'var(--bg-white)', color: 'var(--text)' }} />
                ) : <strong>{settings.maxBenchSize}</strong>}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>IR: </span>
                {editing ? (
                  <input type="number" value={settings.irSlots} min={0} max={3} onChange={e => setSettings(s => ({ ...s, irSlots: Number(e.target.value) }))}
                    style={{ width: 40, padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, background: 'var(--bg-white)', color: 'var(--text)' }} />
                ) : <strong>{settings.irSlots}</strong>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Commissioner Tools */}
      {isCommissioner && (
        <div className="ff-card">
          <div className="ff-card-top-accent" style={{ background: 'var(--warning-amber)' }} />
          <div className="ff-card-header"><h2>Commissioner Tools</h2></div>
          <div className="ff-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Lock Rosters</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Prevent all roster changes league-wide</div>
                </div>
                <button className={`ff-toggle${settings.rosterLocked ? ' on' : ''}`} onClick={() => setSettings(s => ({ ...s, rosterLocked: !s.rosterLocked }))} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Pause Trading</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Temporarily halt all trade proposals</div>
                </div>
                <button className={`ff-toggle${settings.tradingPaused ? ' on' : ''}`} onClick={() => setSettings(s => ({ ...s, tradingPaused: !s.tradingPaused }))} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members Card */}
      <div className="ff-card">
        <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
        <div className="ff-card-header">
          <h2>Members</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>{members.length} / {league.league_size}</span>
        </div>
        <div className="ff-card-body">
          {members.length === 0 ? (
            <div className="ff-empty-state">
              <div className="ff-empty-state-desc">No members yet.</div>
            </div>
          ) : (
            <div>
              {members.map(member => (
                <div key={member.id} className="ff-member-row">
                  <div className="ff-member-avatar">
                    {(member.user_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{member.user_name || 'Unknown'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {member.team_name} &middot; {member.role === 'commissioner' ? 'Commissioner' : 'Member'}
                    </div>
                  </div>
                  {isCommissioner && member.role !== 'commissioner' && (
                    removeConfirmId === member.id ? (
                      <div className="ff-flex ff-gap-2">
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Remove?</span>
                        <button className="ff-btn ff-btn-danger ff-btn-sm" onClick={() => handleRemove(member.id)} disabled={removingMemberId === member.id}>
                          {removingMemberId === member.id ? '...' : 'Yes'}
                        </button>
                        <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={() => setRemoveConfirmId(null)}>
                          No
                        </button>
                      </div>
                    ) : (
                      <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={() => setRemoveConfirmId(member.id)}>
                        Remove
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
