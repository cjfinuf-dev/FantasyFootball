export default function StatusLabel({ status }) {
  if (status === 'healthy') return <span style={{ color: 'var(--success-green)', fontSize: 11, fontWeight: 600 }}>Active</span>;
  const colors = { out: 'var(--injury-out)', questionable: 'var(--injury-questionable)', probable: 'var(--injury-probable)' };
  const labels = { out: 'OUT', questionable: 'Q', probable: 'PROB' };
  return <span style={{ color: colors[status], fontSize: 11, fontWeight: 700 }}>{labels[status]}</span>;
}
