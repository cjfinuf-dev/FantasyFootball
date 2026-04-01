import { useState } from 'react';
import * as leagueApi from '../../api/leagues';

const PLATFORMS = [
  { id: 'espn', label: 'ESPN', defaultScoring: 'standard', idPlaceholder: 'e.g. 12345678', idLabel: 'ESPN League ID',
    help: 'Find your League ID in the URL when viewing your league on ESPN: espn.com/fantasy/football/league?leagueId=XXXXXXXX' },
  { id: 'yahoo', label: 'Yahoo', defaultScoring: 'ppr', idPlaceholder: 'e.g. 987654', idLabel: 'Yahoo League ID',
    help: 'Find your League ID in your Yahoo Fantasy URL: football.fantasysports.yahoo.com/f1/XXXXXX' },
  { id: 'sleeper', label: 'Sleeper', defaultScoring: 'ppr', idPlaceholder: 'e.g. 784512369874561234', idLabel: 'Sleeper League ID',
    help: 'Open your league in Sleeper, go to Settings, and copy the League ID.' },
];

export default function ImportLeague({ onClose, onImported }) {
  const [platform, setPlatform] = useState('espn');
  const [form, setForm] = useState({
    name: '', teamName: '', externalId: '',
    scoring: 'standard', size: 12, type: 'redraft', season: '2025-26',
  });
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  const activePlatform = PLATFORMS.find(p => p.id === platform);

  const handlePlatformChange = (id) => {
    setPlatform(id);
    const p = PLATFORMS.find(x => x.id === id);
    setForm(f => ({ ...f, scoring: p.defaultScoring }));
  };

  const handleImport = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.teamName.trim()) {
      setError('League name and team name are required.');
      return;
    }
    setImporting(true);
    try {
      const { league } = await leagueApi.createLeague({
        name: form.name.trim(),
        teamName: form.teamName.trim(),
        type: form.type,
        scoringPreset: form.scoring,
        leagueSize: form.size,
        season: form.season,
        settingsJson: JSON.stringify({
          importedFrom: platform,
          externalLeagueId: form.externalId.trim() || null,
          importedAt: new Date().toISOString(),
        }),
      });
      onImported?.(league);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to import league.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-modal" style={{ width: 500 }}>
        <button className="auth-close" onClick={onClose}>{'\u2715'}</button>
        <h2>Import a League</h2>
        <p className="auth-subtitle">Bring your existing league settings into HexMetrics.</p>

        {/* Platform selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {PLATFORMS.map(p => (
            <button key={p.id}
              onClick={() => handlePlatformChange(p.id)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 6, border: '1px solid var(--border)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: platform === p.id ? 'var(--accent)' : 'transparent',
                color: platform === p.id ? 'var(--on-accent)' : 'var(--text)',
                transition: 'all 0.15s',
              }}>
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleImport}>
          {/* External League ID */}
          <div className="auth-input-group">
            <label>{activePlatform.idLabel}</label>
            <input className="auth-input" type="text"
              placeholder={activePlatform.idPlaceholder}
              value={form.externalId}
              onChange={e => setForm(f => ({ ...f, externalId: e.target.value }))}
              style={{ fontFamily: 'monospace' }}
            />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
              {activePlatform.help}
            </div>
          </div>

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

          <button type="submit" className="auth-btn auth-btn-secondary" disabled={importing}>
            {importing ? 'Importing...' : `Import from ${activePlatform.label}`}
          </button>
        </form>
      </div>
    </div>
  );
}
