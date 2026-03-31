export default function AdSpace({ size = 'md' }) {
  const heights = { sm: 100, md: 250, lg: 400, xl: 600 };
  const h = heights[size] || heights.md;

  return (
    <div style={{
      height: h, borderRadius: 'var(--radius-lg, 12px)',
      border: '1px dashed var(--border)',
      background: 'var(--surface, var(--bg-alt))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Ad Space
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.5 }}>
        {h}x300
      </div>
    </div>
  );
}
