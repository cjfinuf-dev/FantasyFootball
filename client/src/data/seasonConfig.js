/**
 * seasonConfig.js — Single source of truth for all season constants.
 *
 * Update ONLY this file each season. Every module that needs season-aware
 * constants imports from here — no more scattered DATA_SEASON declarations.
 */

export const DATA_SEASON = 2026;
export const TOTAL_WEEKS = 14;
export const PLAYOFF_SPOTS = 6;
export const BYE_SEEDS = 2;
export const GAMES_PLAYED = 11;
export const REMAINING_WEEKS = TOTAL_WEEKS - GAMES_PLAYED;
export const SIMULATIONS = 5000;

// NFL schedule season (should match DATA_SEASON for matchup-based valuations)
export const NFL_SCHEDULE_SEASON = 2026;

/**
 * Check whether the hardcoded DATA_SEASON matches the current calendar year.
 * Returns a guard object indicating staleness.
 */
export function checkSeasonGuard() {
  const currentYear = new Date().getFullYear();
  return {
    stale: currentYear !== DATA_SEASON,
    dataSeason: DATA_SEASON,
    currentYear,
    scheduleMismatch: NFL_SCHEDULE_SEASON !== DATA_SEASON,
  };
}
