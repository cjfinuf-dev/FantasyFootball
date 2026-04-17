// Centralized grade-ring color palette for hex chart backgrounds.
// Used by MatchupDetail and PlayerStats so the palette is single-source.
//
// Values are imported from CSS tokens where they exist (--grade-*), with
// stop-gaps for intermediate bands that don't map 1:1 to a grade tier.
// Stroke color for the outer ring is exposed separately so the two consumers
// use identical branding without duplicating literals.
export const HEX_CHART_RINGS = [
  { inner: 0.0, outer: 0.1, color: '#991b1b' },
  { inner: 0.1, outer: 0.2, color: '#dc2626' },
  { inner: 0.2, outer: 0.3, color: '#ea580c' },
  { inner: 0.3, outer: 0.4, color: '#d97706' },
  { inner: 0.4, outer: 0.5, color: '#ca8a04' },
  { inner: 0.5, outer: 0.6, color: '#65a30d' },
  { inner: 0.6, outer: 0.7, color: '#16a34a' },
  { inner: 0.7, outer: 0.8, color: '#15803d' },
  { inner: 0.8, outer: 0.9, color: '#22c55e' },
  { inner: 0.9, outer: 1.0, color: '#8B5CF6' },
];

export const HEX_CHART_OUTER_STROKE = '#8B5CF6';
