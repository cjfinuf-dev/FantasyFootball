import { useContext } from 'react';
import { LiveScoringContext } from '../context/LiveScoringContext';

function useCtx() {
  return useContext(LiveScoringContext);
}

// Legacy tick hook — kept as a fallback for components that just need a
// generic re-render nudge. New code should prefer the typed slice hooks below.
export function useLiveTick() {
  return useCtx()?.tick ?? 0;
}

// Full game state mirror. Returns null pre-hydration.
export function useGameState() {
  return useCtx()?.gameState ?? null;
}

// Per-player live state. `name` is the player's displayName (matches ESPN keys).
// Returns null if the player isn't in the current live broadcast.
export function usePlayerLive(name) {
  const ctx = useCtx();
  if (!ctx || !name) return null;
  return ctx.players?.[name] ?? null;
}

// Per-game status (ESPN game id). Returns null when the game isn't tracked.
export function useGameStatus(id) {
  const ctx = useCtx();
  if (!ctx || !id) return null;
  return ctx.games?.[id] ?? null;
}

// SSE connection state — true while the EventSource is open.
export function useLiveConnected() {
  return useCtx()?.connected ?? false;
}

// Millisecond timestamp of the most recent applied payload. null pre-hydration.
export function useLastUpdated() {
  return useCtx()?.lastUpdatedAt ?? null;
}

// True whenever at least one NFL game is in-progress (drives LIVE/IDLE badge).
export function useAnyGameActive() {
  return (useCtx()?.activeGameCount ?? 0) > 0;
}

// All games object, keyed by ESPN id.
export function useLiveGames() {
  return useCtx()?.games ?? {};
}

// Week number from the latest broadcast.
export function useLiveWeek() {
  return useCtx()?.week ?? null;
}
