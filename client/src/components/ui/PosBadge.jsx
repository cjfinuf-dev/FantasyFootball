import { POS_COLORS, POS_BG } from '../../utils/helpers';

export default function PosBadge({ pos }) {
  return (
    <span className="ff-pos-badge" style={{
      background: `var(${POS_BG[pos] || '--pos-def-bg'})`,
      color: `var(${POS_COLORS[pos] || '--pos-def'})`
    }}>{pos}</span>
  );
}
