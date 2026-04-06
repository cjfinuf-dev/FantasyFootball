export default function StatusLabel({ status }) {
  const config = {
    healthy: { color: 'var(--success-green)', bg: 'var(--green-light)', label: 'H', dotClass: 'injury-dot--healthy' },
    out: { color: 'var(--injury-out)', bg: 'var(--red-light)', label: 'OUT', dotClass: 'injury-dot--out' },
    questionable: { color: 'var(--injury-questionable)', bg: 'var(--warning-amber-light)', label: 'Q', dotClass: 'injury-dot--questionable' },
    probable: { color: 'var(--injury-probable)', bg: 'var(--green-light)', label: 'PROB', dotClass: 'injury-dot--healthy' },
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
