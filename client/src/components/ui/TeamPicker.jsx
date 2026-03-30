import { useState, useRef, useEffect } from 'react';
import { NFL_TEAMS } from '../../data/nflColors';

export default function TeamPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = NFL_TEAMS.find(t => t.id === value) || NFL_TEAMS[0];

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
              onClick={() => { onChange(t.id); setOpen(false); }}
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
    </div>
  );
}
