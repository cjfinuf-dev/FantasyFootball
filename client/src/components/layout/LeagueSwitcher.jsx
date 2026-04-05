import { useState, useRef, useEffect } from 'react';

export default function LeagueSwitcher({ leagues, activeLeague, onSelect }) {
  const [show, setShow] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="ff-nav-center" ref={ref} style={{ position: 'relative' }}>
      <button className="ff-leagues-trigger"
        onClick={() => { if (!activeLeague && leagues.length <= 2) return; setShow(prev => !prev); setFocusedIndex(-1); }}
        onKeyDown={(e) => {
          if (!show && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            e.preventDefault(); setShow(true); setFocusedIndex(0);
          } else if (show) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, leagues.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter' && focusedIndex >= 0) { e.preventDefault(); onSelect(leagues[focusedIndex]); setShow(false); }
            else if (e.key === 'Escape') { e.preventDefault(); setShow(false); }
          }
        }}>
        <span className="ff-live-dot league-dot"></span>
        <span className="league-name">{activeLeague ? activeLeague.name : `${leagues.length} league${leagues.length !== 1 ? 's' : ''}`}</span>
        {(activeLeague || leagues.length > 2) && <span className={`chevron${show ? ' open' : ''}`}>{'\u25BE'}</span>}
      </button>
      {show && (
        <div className="ff-leagues-dropdown">
          <div className="ff-leagues-dropdown-header">
            <h3>My Leagues</h3>
            <span className="ff-leagues-dropdown-count">{leagues.length}</span>
          </div>
          {leagues.map((lg, i) => (
            <div key={lg.id}
              className={`ff-leagues-item${activeLeague && lg.id === activeLeague.id ? ' active' : ''}${i === focusedIndex ? ' focused' : ''}`}
              onClick={() => { onSelect(lg); setShow(false); }}>
              <div className="ff-leagues-item-info">
                <div className="ff-leagues-item-name">{lg.name}</div>
                <div className="ff-leagues-item-meta">
                  <span>{lg.team_name}</span>
                  <span>&middot;</span>
                  <span>{lg.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
