/**
 * grades.js — Shared grade utility for HexMetrics
 *
 * Unified letter grade scale: S, A+, A, A-, B+, B, B-, C+, C, D, F
 * Used by PlayerStats, PlayerCompare, DraftBoard, and anywhere else
 * that converts a 0-1 percentile into a letter grade with color.
 */

/**
 * Convert a 0-1 value to a letter grade with associated color.
 * @param {number} val — Value between 0 and 1
 * @returns {{ letter: string, color: string }}
 */
export function getGrade(val) {
  if (val >= 0.95) return { letter: 'S',  color: 'var(--grade-s)' };
  if (val >= 0.88) return { letter: 'A+', color: 'var(--grade-a-plus)' };
  if (val >= 0.80) return { letter: 'A',  color: 'var(--grade-a)' };
  if (val >= 0.72) return { letter: 'A-', color: 'var(--grade-a-minus)' };
  if (val >= 0.64) return { letter: 'B+', color: 'var(--grade-b-plus)' };
  if (val >= 0.56) return { letter: 'B',  color: 'var(--grade-b)' };
  if (val >= 0.48) return { letter: 'B-', color: 'var(--grade-b-minus)' };
  if (val >= 0.40) return { letter: 'C+', color: 'var(--grade-c-plus)' };
  if (val >= 0.32) return { letter: 'C',  color: 'var(--grade-c)' };
  if (val >= 0.20) return { letter: 'D',  color: 'var(--grade-d)' };
  return { letter: 'F', color: 'var(--grade-f)' };
}

/**
 * Shorthand returning { g, c } for compact inline usage (DraftBoard style).
 */
export function getGradeCompact(val) {
  const { letter, color } = getGrade(val);
  return { g: letter, c: color };
}
