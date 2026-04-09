export default function Breadcrumb({ onBack, backLabel, currentLabel }) {
  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
      <button onClick={onBack} className="ff-back-btn" aria-label={`Back to ${backLabel}`}>{'\u2190'} {backLabel}</button>
      <span aria-hidden="true" style={{ color: 'var(--border-strong)' }}>/</span>
      <span aria-current="page" style={{ fontWeight: 600, color: 'var(--text)' }}>{currentLabel}</span>
    </nav>
  );
}
