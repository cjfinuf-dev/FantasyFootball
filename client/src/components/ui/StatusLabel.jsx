export default function StatusLabel({ status }) {
  if (status === 'healthy') return null; // Don't clutter UI for healthy players

  const config = {
    out: { color: 'var(--injury-out)', bg: 'rgba(220,38,38,0.1)', label: 'OUT', dotClass: 'injury-dot--out' },
    questionable: { color: 'var(--injury-questionable)', bg: 'rgba(245,158,11,0.1)', label: 'Q', dotClass: 'injury-dot--questionable' },
    probable: { color: 'var(--injury-probable)', bg: 'rgba(22,163,74,0.1)', label: 'PROB', dotClass: 'injury-dot--healthy' },
  };

  const c = config[status];
  if (!c) return null;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '1px 6px', borderRadius: 4,
      background: c.bg, color: c.color,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
      lineHeight: '16px',
    }}>
      <span className={`injury-dot ${c.dotClass}`} style={{ width: 6, height: 6 }} />
      {c.label}
    </span>
  );
}
