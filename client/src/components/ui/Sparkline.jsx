export default function Sparkline({ data = [], width = 48, height = 16 }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const coords = data.map((v, i) => ({
    x: +(i * step).toFixed(1),
    y: +(height - ((v - min) / range) * (height - 2) - 1).toFixed(1),
  }));

  const points = coords.map(p => `${p.x},${p.y}`).join(' ');

  // Trend strength: % change from first to last
  const trendPct = data[0] !== 0 ? (data[data.length - 1] - data[0]) / Math.abs(data[0]) : 0;

  let opacity, blur, stroke;
  if (trendPct > 0.15) {
    // Elite
    opacity = 1;
    blur = 2.5;
    stroke = '#7C3AED';
  } else if (trendPct > 0.05) {
    // Good
    opacity = 1;
    blur = 1.5;
    stroke = '#8B5CF6';
  } else if (trendPct > 0) {
    // Mild uptick
    opacity = 0.75;
    blur = 0;
    stroke = '#8B5CF6';
  } else {
    // Flat / negative
    opacity = 0.5;
    blur = 0;
    stroke = '#8B5CF6';
  }

  const filterId = blur > 0 ? `glow-${blur}` : null;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'inline-block', verticalAlign: 'middle', overflow: 'visible' }}>
      {filterId && (
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
      <g opacity={opacity} filter={filterId ? `url(#${filterId})` : undefined}>
        <polyline
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="square"
          strokeLinejoin="bevel"
        />
        {coords.map((p, i) => (
          <polygon
            key={i}
            points={`${p.x},${p.y - 1.5} ${p.x + 1.5},${p.y} ${p.x},${p.y + 1.5} ${p.x - 1.5},${p.y}`}
            fill={stroke}
          />
        ))}
      </g>
    </svg>
  );
}
