// SEASON: Update DATA_SEASON each year — used to detect stale static data at runtime
export const DATA_SEASON = 2024;

// Live game state — maps player IDs to their current-week scoring status.
// Empty by default (pre-game / no live data). Populated by a live feed when available.
//
// Shape of each entry:
//   gameState[playerId] = {
//     status: 'scheduled' | 'playing' | 'final' | 'bye',
//     actual: number,  // fantasy points earned so far
//   }

export const gameState = {};
