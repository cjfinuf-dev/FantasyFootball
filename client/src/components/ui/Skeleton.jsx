export function SkeletonLine({ width = '100%', height = 14, style }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 4, ...style }} />;
}

export function SkeletonCard({ lines = 3, style }) {
  return (
    <div className="ff-card" style={{ padding: 20, ...style }}>
      <SkeletonLine width="40%" height={18} style={{ marginBottom: 12 }} />
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} width={`${85 - i * 10}%`} style={{ marginBottom: 8 }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, style }) {
  return (
    <div className="ff-card" style={style}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <SkeletonLine width="30%" height={16} />
      </div>
      <div style={{ padding: '8px 16px' }}>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            {Array.from({ length: cols }, (_, c) => (
              <SkeletonLine key={c} width={c === 0 ? '40%' : '15%'} height={12} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPlayer({ style }) {
  return (
    <div className="ff-card" style={{ overflow: 'hidden', ...style }}>
      <SkeletonLine width="100%" height={5} style={{ borderRadius: 0 }} />
      <div style={{ display: 'flex', gap: 16, padding: 20 }}>
        <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <SkeletonLine width="60%" height={22} style={{ marginBottom: 10 }} />
          <SkeletonLine width="40%" height={14} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <SkeletonLine width={60} height={20} />
            <SkeletonLine width={60} height={20} />
            <SkeletonLine width={80} height={20} />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <SkeletonLine width={60} height={32} style={{ marginBottom: 4 }} />
          <SkeletonLine width={40} height={10} />
        </div>
      </div>
    </div>
  );
}
