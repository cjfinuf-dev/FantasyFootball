export function SkeletonLine({ width = '100%', height = 18, style }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 'var(--radius-sm)', ...style }} />;
}

export function SkeletonCard({ lines = 3, style }) {
  return (
    <div className="ff-card" style={{ padding: 'var(--space-4)', ...style }}>
      <SkeletonLine width="40%" height={24} style={{ marginBottom: 'var(--space-2-5)' }} />
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} width={`${85 - i * 10}%`} style={{ marginBottom: 'var(--space-1-5)' }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, style }) {
  return (
    <div className="ff-card" style={style}>
      <div style={{ padding: 'var(--space-2-5) var(--space-3)', borderBottom: '1px solid var(--border)' }}>
        <SkeletonLine width="30%" height={16} />
      </div>
      <div style={{ padding: 'var(--space-1-5) var(--space-3)' }}>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} style={{ display: 'flex', gap: 'var(--space-2-5)', padding: 'var(--space-1-5) 0', borderBottom: '1px solid var(--border)' }}>
            {Array.from({ length: cols }, (_, c) => (
              <SkeletonLine key={c} width={c === 0 ? '40%' : '15%'} height={22} />
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
      <SkeletonLine width="100%" height={6} style={{ borderRadius: 0 }} />
      <div style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-4)', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <SkeletonLine width="60%" height={22} style={{ marginBottom: 'var(--space-2)' }} />
          <SkeletonLine width="40%" height={20} style={{ marginBottom: 'var(--space-1-5)' }} />
          <div style={{ display: 'flex', gap: 'var(--space-1-5)' }}>
            <SkeletonLine width={60} height={22} />
            <SkeletonLine width={60} height={22} />
            <SkeletonLine width={80} height={22} />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <SkeletonLine width={60} height={22} style={{ marginBottom: 4 }} />
          <SkeletonLine width={40} height={16} />
        </div>
      </div>
    </div>
  );
}

export function MatchupSkeleton() {
  return (
    <div className="ff-card" style={{ padding: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <SkeletonLine width="60%" height={18} />
          <SkeletonLine width="40%" height={14} style={{ marginTop: 8 }} />
        </div>
        <SkeletonLine width={60} height={32} />
        <div style={{ flex: 1, textAlign: 'right' }}>
          <SkeletonLine width="60%" height={18} style={{ marginLeft: 'auto' }} />
          <SkeletonLine width="40%" height={14} style={{ marginTop: 8, marginLeft: 'auto' }} />
        </div>
      </div>
      <SkeletonLine width="100%" height={6} style={{ marginTop: 12, borderRadius: 3 }} />
    </div>
  );
}

export function StandingsSkeleton() {
  return (
    <div className="ff-sidebar-card" style={{ padding: 'var(--space-3)' }}>
      <SkeletonLine width="45%" height={16} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <SkeletonLine width={20} height={20} />
          <SkeletonLine width="55%" height={14} />
          <SkeletonLine width={40} height={14} style={{ marginLeft: 'auto' }} />
        </div>
      ))}
    </div>
  );
}

export function CommandCenterSkeleton() {
  return (
    <div className="ff-sidebar-card" style={{ padding: 'var(--space-3)' }}>
      <SkeletonLine width="50%" height={16} />
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <SkeletonCard style={{ flex: 1, height: 64 }} />
        <SkeletonCard style={{ flex: 1, height: 64 }} />
      </div>
      <SkeletonLine width="100%" height={8} style={{ marginTop: 12, borderRadius: 4 }} />
    </div>
  );
}

export function PlayerRankingsSkeleton() {
  return (
    <div className="ff-card" style={{ padding: 'var(--space-3)' }}>
      <SkeletonLine width="40%" height={16} />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <SkeletonLine width={28} height={28} style={{ borderRadius: '50%' }} />
          <SkeletonLine width="35%" height={14} />
          <SkeletonLine width={40} height={14} style={{ marginLeft: 'auto' }} />
          <SkeletonLine width={50} height={14} />
        </div>
      ))}
    </div>
  );
}
