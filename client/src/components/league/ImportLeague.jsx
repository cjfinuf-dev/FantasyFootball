import { useState } from 'react';
import * as leagueApi from '../../api/leagues';

export default function ImportLeague({ onClose, onImported }) {
  const [form, setForm] = useState({
    name: '', teamName: '',
    scoring: 'standard', size: 12, type: 'redraft', season: '2025-26',
  });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.teamName.trim()) {
      setError('League name and team name are required.');
      return;
    }
    setCreating(true);
    try {
      const { league } = await leagueApi.createLeague({
        name: form.name.trim(),
        teamName: form.teamName.trim(),
        type: form.type,
        scoringPreset: form.scoring,
        leagueSize: form.size,
        season: form.season,
      });
      onImported?.(league);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create league.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-modal" style={{ maxWidth: 460, width: '90vw' }}>
        <button className="auth-close" onClick={onClose}>{'\u2715'}</button>
        <h2>Quick Create</h2>
        <p className="auth-subtitle">Set up a league with your preferred settings.</p>

        <form onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label>League Name</label>
            <input className="auth-input" type="text" placeholder="My Fantasy League"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="auth-input-group">
            <label>Your Team Name</label>
            <input className="auth-input" type="text" placeholder="Team Name"
              value={form.teamName} onChange={e => setForm(f => ({ ...f, teamName: e.target.value }))} />
          </div>

          <div className="ff-form-row">
            <div className="ff-form-col">
              <label className="ff-form-label">Scoring</label>
              <select className="auth-input" value={form.scoring} onChange={e => setForm(f => ({ ...f, scoring: e.target.value }))}>
                <option value="standard">Standard</option>
                <option value="ppr">PPR</option>
                <option value="halfPpr">Half PPR</option>
                <option value="sixPtPassTd">6-Pt Pass TD</option>
              </select>
            </div>
            <div className="ff-form-col">
              <label className="ff-form-label">Teams</label>
              <select className="auth-input" value={form.size} onChange={e => setForm(f => ({ ...f, size: Number(e.target.value) }))}>
                {[6,8,10,12,14,16,18,20].map(n => <option key={n} value={n}>{n} teams</option>)}
              </select>
            </div>
          </div>

          <div className="ff-form-row">
            <div className="ff-form-col">
              <label className="ff-form-label">League Type</label>
              <select className="auth-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="redraft">Redraft</option>
                <option value="keeper">Keeper</option>
                <option value="dynasty">Dynasty</option>
                <option value="bestBall">Best Ball</option>
              </select>
            </div>
            <div className="ff-form-col">
              <label className="ff-form-label">Season</label>
              <select className="auth-input" value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))}>
                <option value="2025-26">2025-26</option>
                <option value="2026-27">2026-27</option>
              </select>
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn auth-btn-secondary" disabled={creating}>
            {creating ? 'Creating...' : 'Create League'}
          </button>
        </form>
      </div>
    </div>
  );
}
