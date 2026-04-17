import { useEffect, useState } from 'react';
import { useLiveConnected, useLastUpdated, useAnyGameActive } from '../../hooks/useLiveTick';

function formatAgo(ms) {
  if (ms == null) return 'never';
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function LiveStatusBar() {
  const connected = useLiveConnected();
  const lastUpdatedAt = useLastUpdated();
  const gamesActive = useAnyGameActive();

  // Force re-render once/sec so the "Xs ago" label stays accurate.
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ago = lastUpdatedAt != null ? formatAgo(Date.now() - lastUpdatedAt) : null;

  const dotColor = connected
    ? (gamesActive ? 'var(--success-green)' : 'var(--text-muted)')
    : 'var(--red)';
  const dotShadow = connected && gamesActive ? '0 0 6px var(--success-green)' : 'none';

  const badgeLabel = gamesActive ? 'LIVE' : 'IDLE';
  const badgeColor = gamesActive ? 'var(--success-green)' : 'var(--text-muted)';
  const badgeBg = gamesActive ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)';

  return (
    <div
      className="ff-live-status"
      role="status"
      aria-live="polite"
      title={connected ? 'Live connection open' : 'Live connection closed'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '4px 10px', borderRadius: 9999,
        border: '1px solid var(--border)', background: 'var(--surface)',
        fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8, height: 8, borderRadius: '50%',
          background: dotColor, boxShadow: dotShadow,
          animation: gamesActive && connected ? 'ff-live-pulse 1.6s ease-in-out infinite' : undefined,
        }}
      />
      <span style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
        color: badgeColor, background: badgeBg,
        padding: '1px 6px', borderRadius: 4,
      }}>{badgeLabel}</span>
      <span className="text-muted-sm" style={{ fontSize: 12 }}>
        {ago ? `Updated ${ago}` : 'Waiting for data'}
      </span>
    </div>
  );
}
