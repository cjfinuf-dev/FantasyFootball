import { createContext, useState, useEffect, useContext } from 'react';
import { NFL_TEAMS } from '../data/nflColors';

const ThemeContext = createContext(null);

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1,3), 16),
    parseInt(hex.slice(3,5), 16),
    parseInt(hex.slice(5,7), 16),
  ];
}

function luminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// WCAG contrast ratio between two luminances
function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Darken or lighten a color to meet minimum contrast against a background
function ensureContrast(hex, bgHex, minRatio = 4.5) {
  const rgb = hexToRgb(hex);
  const bgLum = luminance(hexToRgb(bgHex));
  const colorLum = luminance(rgb);

  if (contrastRatio(colorLum, bgLum) >= minRatio) return hex;

  // Determine direction: lighten if bg is dark, darken if bg is light
  const lighten = bgLum < 0.5;
  let adjusted = [...rgb];

  for (let i = 0; i < 40; i++) {
    adjusted = adjusted.map(c =>
      lighten
        ? Math.min(255, c + 8)
        : Math.max(0, c - 8)
    );
    if (contrastRatio(luminance(adjusted), bgLum) >= minRatio) break;
  }

  return '#' + adjusted.map(c => c.toString(16).padStart(2, '0')).join('');
}

function hexToRgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Choose black or white text for readability on a colored background
function textOnBg(bgHex) {
  const lum = luminance(hexToRgb(bgHex));
  return lum > 0.4 ? '#111111' : '#FFFFFF';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('ff-theme') || 'dark'; }
    catch { return 'dark'; }
  });

  const [teamId, setTeamId] = useState(() => {
    try { return localStorage.getItem('ff-team') || 'none'; }
    catch { return 'none'; }
  });

  useEffect(() => {
    localStorage.setItem('ff-theme', theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Recompute safe colors when team OR theme changes
  useEffect(() => {
    localStorage.setItem('ff-team', teamId);
    const team = NFL_TEAMS.find(t => t.id === teamId) || NFL_TEAMS[0];
    const el = document.documentElement;

    // Background colors for contrast checking
    const lightBg = '#FAFAFA';
    const darkBg = '#171717';
    const isDark = theme === 'dark';
    const bg = isDark ? darkBg : lightBg;

    // Raw accent colors (used for backgrounds, borders)
    el.style.setProperty('--accent', team.primary);
    el.style.setProperty('--accent-secondary', team.secondary);
    el.style.setProperty('--accent-tertiary', team.tertiary);

    // Contrast-safe versions for text on page background
    el.style.setProperty('--accent-text', ensureContrast(team.primary, bg));
    el.style.setProperty('--accent-secondary-text', ensureContrast(team.secondary, bg));
    el.style.setProperty('--accent-tertiary-text', ensureContrast(team.tertiary, bg));

    // Text color for use ON accent-colored backgrounds
    el.style.setProperty('--on-accent', textOnBg(team.primary));
    el.style.setProperty('--on-accent-secondary', textOnBg(team.secondary));
    el.style.setProperty('--on-accent-tertiary', textOnBg(team.tertiary));

    // Contrast-safe for always-dark surfaces (navbar, footer, table headers)
    const navBg = '#111111';
    el.style.setProperty('--accent-on-dark', ensureContrast(team.primary, navBg, 3.5));
    el.style.setProperty('--accent-secondary-on-dark', ensureContrast(team.secondary, navBg, 3.5));
    el.style.setProperty('--accent-tertiary-on-dark', ensureContrast(team.tertiary, navBg, 3.5));

    // Rgba versions
    el.style.setProperty('--accent-10', hexToRgba(team.primary, 0.1));
    el.style.setProperty('--accent-15', hexToRgba(team.primary, 0.15));
    el.style.setProperty('--accent-20', hexToRgba(team.primary, 0.2));
    el.style.setProperty('--accent-30', hexToRgba(team.primary, 0.3));
    el.style.setProperty('--accent2-10', hexToRgba(team.secondary, 0.1));
    el.style.setProperty('--accent2-15', hexToRgba(team.secondary, 0.15));
    el.style.setProperty('--accent2-20', hexToRgba(team.secondary, 0.2));
    el.style.setProperty('--accent3-10', hexToRgba(team.tertiary, 0.1));
    el.style.setProperty('--accent3-15', hexToRgba(team.tertiary, 0.15));
  }, [teamId, theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const team = NFL_TEAMS.find(t => t.id === teamId) || NFL_TEAMS[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, teamId, setTeamId, team }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
