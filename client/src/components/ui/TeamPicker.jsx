import { useState, useRef, useEffect } from 'react';
import { NFL_TEAMS } from '../../data/nflColors';

export default function TeamPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [chiefsConfirm, setChiefsConfirm] = useState(null); // null | 'ask' | 'mistake'
  const ref = useRef(null);
  const selected = NFL_TEAMS.find(t => t.id === value) || NFL_TEAMS[0];

  const handleSelect = (teamId) => {
    if (teamId === 'kc') {
      setChiefsConfirm('ask');
      setOpen(false);
      return;
    }
    // Patriots pick → secretly apply Bills colors instead
    // NOTE: Patriots settings preserved in nflColors.js (id: 'ne') — ready to restore
    onChange(teamId === 'ne' ? 'buf' : teamId);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="team-picker" ref={ref}>
      <button className="team-picker-trigger" onClick={() => setOpen(o => !o)} title="Team colors">
        {selected.logo
          ? <img src={selected.logo} alt={selected.name} className="team-picker-logo" />
          : <span className="team-picker-swatch" style={{ background: selected.primary }} />
        }
        <span className="team-picker-name">{selected.name}</span>
        <span className="team-picker-caret">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className="team-picker-dropdown">
          {NFL_TEAMS.map(t => (
            <button
              key={t.id}
              className={`team-picker-option${t.id === value ? ' active' : ''}`}
              onClick={() => handleSelect(t.id)}
            >
              {t.logo
                ? <img src={t.logo} alt={t.name} className="team-picker-logo" />
                : <span className="team-picker-swatch" style={{ background: t.primary }} />
              }
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      )}
      {chiefsConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setChiefsConfirm(null)}>
          <div role="dialog" aria-modal="true" aria-label="Confirm team selection" style={{
            background: 'var(--bg-white)', borderRadius: 'var(--radius-lg)', padding: 32,
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
            textAlign: 'center', maxWidth: 340, width: '90%',
          }} onClick={e => e.stopPropagation()}>
            {chiefsConfirm === 'ask' ? (
              <>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Are you sure?</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
                  <button className="ff-btn ff-btn-primary" onClick={() => setChiefsConfirm('mistake')}>Yes</button>
                  <button className="ff-btn ff-btn-secondary" onClick={() => setChiefsConfirm(null)}>No</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Everybody makes mistakes</div>
                <button className="ff-btn ff-btn-primary" onClick={() => { onChange('kc'); setChiefsConfirm(null); }}>OK</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
