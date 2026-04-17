export default function ScoreDelta({ value, tier, position = 'absolute' }) {
  if (value == null || tier === 'none' || Math.abs(value) < 0.05) return null;
  if (typeof document !== 'undefined' && document.hidden) return null;

  const sign = value > 0 ? '+' : '';
  const color = tier === 'down' ? 'var(--red)' : 'var(--success-green)';
  const glow = tier === 'strong' ? `0 0 10px ${color}` : 'none';

  return (
    <span
      key={`${value.toFixed(2)}:${tier}`}
      className={`ff-delta-chip ff-delta-${tier} ff-delta-${position}`}
      style={{ color, boxShadow: glow }}
    >
      {sign}{value.toFixed(1)}
    </span>
  );
}
