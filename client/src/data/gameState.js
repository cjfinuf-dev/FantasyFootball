// Season constants centralized in seasonConfig.js
export { DATA_SEASON } from './seasonConfig';

// Live game state — maps player IDs to their current-week scoring status.
// Empty by default (pre-game / no live data). Populated by a live feed when available.
//
// Shape of each entry:
//   gameState[playerId] = {
//     status: 'scheduled' | 'playing' | 'final' | 'bye',
//     actual: number,  // fantasy points earned so far
//   }

export const gameState = {};

export function clearGameState() {
  for (const key of Object.keys(gameState)) {
    delete gameState[key];
  }
}
