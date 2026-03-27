import { WAIVERS } from '../../data/waivers';
import PosBadge from '../ui/PosBadge';

export default function WaiverWireCard() {
  return (
    <div className="ff-sidebar-card">
      <div className="ff-sidebar-card-header">
        <h3>Top Available</h3>
        <span className="ff-badge-count">{WAIVERS.length}</span>
      </div>
      <div className="ff-sidebar-card-body">
        {WAIVERS.map(w => (
          <div className="ff-waiver-row" key={w.playerId}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><PosBadge pos={w.pos} /></div>
            <div className="ff-waiver-info">
              <div className="ff-waiver-name">{w.name} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.team}</span></div>
              <div className="ff-waiver-detail">{w.reason}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <div className="ff-waiver-pts">{w.proj}</div>
              <span className={`ff-trend ${w.trend}`}>{w.trend === 'up' ? '\u25B2' : '\u25BC'} {w.trendPct}%</span>
            </div>
            <button className="ff-btn ff-btn-copper ff-btn-sm">+ Add</button>
          </div>
        ))}
      </div>
    </div>
  );
}
