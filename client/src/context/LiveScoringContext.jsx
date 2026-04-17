import { createContext, useEffect, useRef, useState, useCallback } from 'react';
import { PLAYERS } from '../data/players';
import { gameState, clearGameState } from '../data/gameState';
import { BYE_WEEKS } from '../data/nflSchedule';
import { calcFantasyPoints } from '../utils/fantasyCalc';
import { SCORING_PRESETS } from '../data/scoring';

export const LiveScoringContext = createContext(null);

// Build lookup tables once at module load.
const NAME_TO_PID = {};
const PID_TO_PLAYER = {};
for (const p of PLAYERS) {
  NAME_TO_PID[p.name] = p.id;
  PID_TO_PLAYER[p.id] = p;
}

// ─── Tunables ───
const HIDDEN_CLOSE_MS = 5 * 60 * 1000;      // close stream after 5min of hidden tab
const FALLBACK_POLL_MS = 30_000;             // snapshot poll cadence when SSE is unavailable
const CLOSED_READY_TRIP_COUNT = 2;           // consecutive CLOSED events before we fall back

export function LiveScoringProvider({ children }) {
  // Expose enough state for slice hooks to derive exactly what they need.
  const [connected, setConnected] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [week, setWeek] = useState(null);
  const [games, setGames] = useState({});
  const [players, setPlayers] = useState({});
  const [activeGameCount, setActiveGameCount] = useState(0);
  const [tick, setTick] = useState(0);

  // Refs that must survive re-renders without triggering them.
  const esRef = useRef(null);
  const lastAppliedTimestampRef = useRef(null);
  const hiddenCloseTimerRef = useRef(null);
  const fallbackPollRef = useRef(null);
  const closedHitsRef = useRef(0);
  const queuedPayloadRef = useRef(null);    // coalesce while hidden
  const isHiddenRef = useRef(false);

  // Atomic apply — replaces the old clear-then-rebuild pattern. Mutates the
  // canonical gameState singleton in one pass so consumers (getTeamScoreSplit)
  // never observe an empty intermediate.
  const applyScores = useCallback((data) => {
    if (!data || !data.timestamp) return;

    // Ordering guard — drop stale payloads. Compare ISO strings lexically (valid
    // because ISO-8601 sorts chronologically).
    const prevTs = lastAppliedTimestampRef.current;
    if (prevTs && data.timestamp <= prevTs) return;
    lastAppliedTimestampRef.current = data.timestamp;

    const dataWeek = data.week;
    // TODO (Tier 2 task #11): thread per-league scoring preset into this call.
    const preset = SCORING_PRESETS.halfPpr;

    // Build the next gameState in one pass.
    const next = {};

    if (dataWeek) {
      for (const p of PLAYERS) {
        const byeWeek = BYE_WEEKS[p.team?.toUpperCase()];
        if (byeWeek === dataWeek) next[p.id] = { status: 'bye', actual: 0 };
      }
    }

    for (const [name, info] of Object.entries(data.players || {})) {
      const pid = NAME_TO_PID[name];
      if (!pid) continue;
      const player = PID_TO_PLAYER[pid];
      const points = calcFantasyPoints(info.rawStats, preset, player?.pos);
      next[pid] = {
        status: info.status === 'final' ? 'final' : 'playing',
        actual: points,
      };
    }

    // Swap the singleton contents atomically (same reference, one-pass mutation).
    clearGameState();
    Object.assign(gameState, next);

    // Update derived context state.
    const gamesObj = data.games || {};
    let active = 0;
    for (const g of Object.values(gamesObj)) {
      if (g && g.status === 'in') active += 1;
    }

    setWeek(dataWeek ?? null);
    setGames(gamesObj);
    setPlayers(data.players || {});
    setActiveGameCount(active);
    setLastUpdatedAt(Date.now());
    setTick((t) => t + 1);
  }, []);

  // Safe parser used by both SSE event handlers and fallback polling.
  const ingestPayload = useCallback((payload) => {
    if (isHiddenRef.current) {
      // Coalesce — only keep the freshest payload while hidden.
      const queued = queuedPayloadRef.current;
      if (!queued || (payload?.timestamp && payload.timestamp > queued.timestamp)) {
        queuedPayloadRef.current = payload;
      }
      return;
    }
    applyScores(payload);
  }, [applyScores]);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/live/snapshot', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.timestamp) ingestPayload(data);
    } catch {
      // Network error — next tick will retry.
    }
  }, [ingestPayload]);

  const startFallbackPolling = useCallback(() => {
    if (fallbackPollRef.current) return;
    console.warn('[LiveScoring] SSE unavailable — starting snapshot polling fallback');
    fetchSnapshot();
    fallbackPollRef.current = setInterval(fetchSnapshot, FALLBACK_POLL_MS);
  }, [fetchSnapshot]);

  const stopFallbackPolling = useCallback(() => {
    if (!fallbackPollRef.current) return;
    clearInterval(fallbackPollRef.current);
    fallbackPollRef.current = null;
  }, []);

  const openStream = useCallback(() => {
    if (esRef.current) return;
    const es = new EventSource('/api/live/stream');
    esRef.current = es;

    es.addEventListener('open', () => {
      setConnected(true);
      closedHitsRef.current = 0;
      stopFallbackPolling();
    });

    es.addEventListener('scores', (e) => {
      try {
        const data = JSON.parse(e.data);
        ingestPayload(data);
      } catch (err) {
        console.error('[LiveScoring] Failed to parse scores event:', err);
      }
    });

    es.addEventListener('error', () => {
      setConnected(false);
      // Browser auto-reconnects via readyState === CONNECTING (0). Only trip
      // the fallback when we've seen CLOSED (2) twice in a row — that's the
      // signal that the browser has given up (typical corporate-proxy pattern
      // where text/event-stream is stripped).
      if (es.readyState === 2 /* CLOSED */) {
        closedHitsRef.current += 1;
        if (closedHitsRef.current >= CLOSED_READY_TRIP_COUNT) startFallbackPolling();
      }
    });
  }, [ingestPayload, startFallbackPolling, stopFallbackPolling]);

  const closeStream = useCallback(() => {
    if (!esRef.current) return;
    esRef.current.close();
    esRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    openStream();

    const onVisibility = () => {
      const hidden = document.hidden;
      isHiddenRef.current = hidden;

      if (hidden) {
        // Don't drop the stream immediately — just pause UI writes. Close only
        // after HIDDEN_CLOSE_MS so a quick tab flip doesn't churn the 500-client
        // cap server-side.
        if (hiddenCloseTimerRef.current) clearTimeout(hiddenCloseTimerRef.current);
        hiddenCloseTimerRef.current = setTimeout(() => {
          closeStream();
          stopFallbackPolling();
        }, HIDDEN_CLOSE_MS);
        return;
      }

      // Became visible — cancel the pending close, flush queued payload,
      // re-open if needed, then fetch a snapshot to catch up on anything we
      // missed while hidden.
      if (hiddenCloseTimerRef.current) {
        clearTimeout(hiddenCloseTimerRef.current);
        hiddenCloseTimerRef.current = null;
      }

      const queued = queuedPayloadRef.current;
      queuedPayloadRef.current = null;
      if (queued) applyScores(queued);

      if (!esRef.current) openStream();
      fetchSnapshot();
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (hiddenCloseTimerRef.current) clearTimeout(hiddenCloseTimerRef.current);
      stopFallbackPolling();
      closeStream();
    };
    // openStream/closeStream/fetchSnapshot/applyScores are stable useCallbacks.
  }, [openStream, closeStream, fetchSnapshot, stopFallbackPolling, applyScores]);

  const value = {
    connected,
    lastUpdatedAt,
    week,
    games,
    players,
    activeGameCount,
    tick,
    // Expose for debugging / future selector hooks. gameState itself is a
    // singleton imported directly by winProb.js and is the canonical store.
    gameState,
  };

  return (
    <LiveScoringContext.Provider value={value}>
      {children}
    </LiveScoringContext.Provider>
  );
}
