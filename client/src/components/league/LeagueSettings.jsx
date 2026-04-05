import { useState } from 'react';

export default function LeagueSettings({ league, members, onRemoveMember }) {
  const [removeConfirmId, setRemoveConfirmId] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);

  const handleRemove = async (memberId) => {
    setRemovingMemberId(memberId);
    try {
      await onRemoveMember(memberId);
      setRemoveConfirmId(null);
    } finally {
      setRemovingMemberId(null);
    }
  };

  return (
    <>
      <div className="ff-card" style={{ marginBottom: 16 }}>
        <div className="ff-card-top-accent" style={{ background: 'var(--charcoal-slate)' }} />
        <div className="ff-card-header"><h2>League Info</h2></div>
        <div className="ff-card-body">
          <div className="ff-settings-grid">
            <div><span className="ff-settings-label">League Type</span>{league.type}</div>
            <div><span className="ff-settings-label">Scoring</span>{league.scoring_preset}</div>
            <div><span className="ff-settings-label">Teams</span>{league.league_size}</div>
            <div><span className="ff-settings-label">Season</span>{league.season}</div>
            {league.invite_code && (
              <div className="ff-settings-invite">
                <span className="ff-settings-label">Invite Code</span>
                <span className="ff-settings-invite-code">{league.invite_code}</span>
                <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--text-muted)' }}>Share this code so others can join your league</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ff-card">
        <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
        <div className="ff-card-header">
          <h2>Members</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{members.length} / {league.league_size}</span>
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
                  {league.role === 'commissioner' && member.role !== 'commissioner' && (
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
    </>
  );
}
