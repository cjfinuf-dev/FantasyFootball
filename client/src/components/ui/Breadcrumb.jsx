export default function Breadcrumb({ onBack, backLabel, currentLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
      <button onClick={onBack} className="ff-back-btn">{'\u2190'} {backLabel}</button>
      <span style={{ color: 'var(--border-strong)' }}>/</span>
      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{currentLabel}</span>
    </div>
  );
}
