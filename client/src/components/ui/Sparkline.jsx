export default function Sparkline({ data = [], width = 48, height = 16, color = 'var(--accent)' }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const trending = data[data.length - 1] >= data[0];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline
        points={points}
        fill="none"
        stroke={trending ? 'var(--success-green)' : 'var(--red)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
