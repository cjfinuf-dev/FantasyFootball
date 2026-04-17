const ICON_SIZES = { sm: { w: 10, h: 11 }, md: { w: 13, h: 14 }, lg: { w: 16, h: 17 } };

export default function HexBrand({ word, icon = true, size = 'md', filled = false }) {
  const dim = ICON_SIZES[size] || ICON_SIZES.md;
  return (
    <span style={{ fontFamily: "'Playfair Display', serif", whiteSpace: 'nowrap' }}>
      {icon && (
        <svg className="hex-brand-icon" viewBox="0 0 14 16" width={dim.w} height={dim.h}>
          <polygon
            points="7,1 13,4.5 13,11.5 7,15 1,11.5 1,4.5"
            fill={filled ? 'var(--hex-purple)' : 'none'}
            fillOpacity={filled ? 0.15 : 0}
            stroke="var(--hex-purple)"
            strokeWidth="1.5"
          />
        </svg>
      )}
      <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>Hex</span>
      <span style={{ fontWeight: 700, color: 'var(--hex-purple)' }}>{word}</span>
    </span>
  );
}
