// Per-tab icon SVG fragments (no hex outline — just the icon glyph)
// These get tiled at the same 56×96 grid as --hex-mesh so icons sit centered in each hex cell.

const ICON_SVG = {
  overview:  '<line x1="4" y1="6" x2="10" y2="6"/><line x1="4" y1="8" x2="8" y2="8"/>',
  lineup:    '<line x1="4.5" y1="5.5" x2="9.5" y2="5.5"/><line x1="4.5" y1="7.75" x2="9.5" y2="7.75"/><line x1="4.5" y1="10" x2="9.5" y2="10"/>',
  draft:     '<circle cx="7" cy="7.75" r="1.2"/><line x1="7" y1="4.5" x2="7" y2="6"/><line x1="7" y1="9.5" x2="7" y2="11"/><line x1="4.5" y1="7.75" x2="6" y2="7.75"/><line x1="8" y1="7.75" x2="9.5" y2="7.75"/>',
  trades:    '<polyline points="10,3 13,3 13,6"/><line x1="13" y1="3" x2="8" y2="8"/><polyline points="4,11 1,11 1,8"/><line x1="1" y1="11" x2="6" y2="6"/>',
  players:   '<circle cx="7" cy="6" r="1.5"/><path d="M4.5 11a2.5 2.5 0 015 0"/>',
  standings: '<line x1="4.5" y1="10.5" x2="4.5" y2="8"/><line x1="7" y1="10.5" x2="7" y2="5.5"/><line x1="9.5" y1="10.5" x2="9.5" y2="7"/>',
  matchups:  '<path d="M5 1.5L8 0 11 1.5v3L8 6 5 4.5z"/><path d="M5 7.5L8 6 11 7.5v3L8 12 5 10.5z" opacity="0.5"/>',
  compare:   '<line x1="5.5" y1="5" x2="5.5" y2="10.5"/><line x1="8.5" y1="5" x2="8.5" y2="10.5"/><line x1="4" y1="7.75" x2="10" y2="7.75"/>',
  waivers:   '<line x1="7" y1="5.5" x2="7" y2="10"/><line x1="4.5" y1="7.75" x2="9.5" y2="7.75"/>',
  chat:      '<path d="M5 6h4M5 8.5h2.5"/>',
  playoffs:  '<path d="M5 5.5v2h4v-2M7 7.5v3"/><circle cx="7" cy="5" r="0.5"/>',
  news:      '<path d="M5 5.5l2 2 2-2M5 8.5h4"/>',
  oracle:    '<circle cx="7" cy="7" r="2.2"/><circle cx="7" cy="7" r="0.6" fill="currentColor"/><line x1="7" y1="4" x2="7" y2="4.8"/><line x1="7" y1="9.2" x2="7" y2="10"/>',
};

// Default icon center matches the 14×15.5 TAB_ICON viewBox
const DEFAULT_CENTER = { cx: 7, cy: 7.75 };

// Override centers for icons with non-standard viewBoxes
const CENTER_OVERRIDES = {
  trades:   { cx: 7, cy: 7 },
  matchups: { cx: 8, cy: 6 },
};

// Override stroke widths
const STROKE_OVERRIDES = {
  trades:   1.5,
  matchups: 1.3,
};

/**
 * Returns a CSS `url("data:image/svg+xml,...")` string for the given tab's icon overlay,
 * or null if the tab has no overlay (landing, leagues, settings, locked).
 */
export function getHexIconOverlay(tabId) {
  const inner = ICON_SVG[tabId];
  if (!inner) return null;

  const { cx, cy } = CENTER_OVERRIDES[tabId] || DEFAULT_CENTER;
  const sw = STROKE_OVERRIDES[tabId] || 1.4;

  // The 56×96 tile has two hex centers: (28,48) and the offset row at the tile corners.
  // Place icon at (28,48) for row A, then at all four corners for row B
  // (each corner shows 1/4; adjacent tiles combine into the full icon).
  const attrs = `fill='none' stroke='%238B5CF6' stroke-width='${sw}' stroke-linecap='round' stroke-linejoin='round' opacity='0.045'`;
  const g = (tx, ty) =>
    `<g transform='translate(${tx},${ty}) scale(3.3) translate(${-cx},${-cy})' ${attrs}>${inner}</g>`;

  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='96' viewBox='0 0 56 96'>` +
    g(28, 48) + g(0, 0) + g(56, 0) + g(0, 96) + g(56, 96) +
    `</svg>`;

  // Convert inner double quotes to single quotes so they don't break the CSS url("...") wrapper,
  // then minimal percent-encoding matching the existing --hex-mesh style
  const encoded = svg
    .replace(/"/g, "'")
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/#/g, '%23');

  return `url("data:image/svg+xml,${encoded}")`;
}
