import { PLAYERS } from './players';
import { getHexScore } from '../utils/hexScore';

export const TEAM_ROSTERS_SEED = {
  t1: [], t2: [], t3: [], t4: [], t5: [], t6: [],
  t7: [], t8: [], t9: [], t10: [], t11: [], t12: [],
};

// PLAYER_VALUES powered by HexScore engine (backward compatible: playerId → 0-100)
// Computed lazily since historical data may load after import
let _playerValues = null;
export function getPlayerValues() {
  if (!_playerValues) {
    _playerValues = {};
    PLAYERS.forEach(p => {
      _playerValues[p.id] = getHexScore(p.id);
    });
  }
  return _playerValues;
}
// Legacy compat
export const PLAYER_VALUES = new Proxy({}, {
  get(_, prop) { return getPlayerValues()[prop]; },
  has(_, prop) { return prop in getPlayerValues(); },
  ownKeys() { return Object.keys(getPlayerValues()); },
  getOwnPropertyDescriptor(_, prop) {
    const vals = getPlayerValues();
    if (prop in vals) return { value: vals[prop], writable: true, enumerable: true, configurable: true };
  },
});

export const TRADES_SEED = [];

export const TRADE_HISTORY_SEED = [];
