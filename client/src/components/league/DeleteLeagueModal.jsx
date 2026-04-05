import { useState } from 'react';
import * as leagueApi from '../../api/leagues';

export default function DeleteLeagueModal({ leagueId, onDeleted, onClose }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await leagueApi.deleteLeague(leagueId);
      onDeleted(leagueId);
      onClose();
    } catch (err) { alert(err.message || 'Failed to delete league.'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="auth-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-modal ff-delete-modal">
        <h2>Delete League?</h2>
        <p>This will permanently delete this league and remove all members. This cannot be undone.</p>
        <div className="ff-delete-modal-actions">
          <button className="ff-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ff-btn-delete" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete League'}
          </button>
        </div>
      </div>
    </div>
  );
}
