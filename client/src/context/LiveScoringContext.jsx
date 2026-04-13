import { createContext, useEffect, useRef, useState } from 'react';
import { PLAYERS } from '../data/players';
import { gameState, clearGameState } from '../data/gameState';
import { BYE_WEEKS } from '../data/nflSchedule';
import { calcFantasyPoints } from '../utils/fantasyCalc';
import { SCORING_PRESETS } from '../data/scoring';

export const LiveScoringContext = createContext(null);

// Build reverse lookup: player name → pid
const NAME_TO_PID = {};
for (const p of PLAYERS) {
  NAME_TO_PID[p.name] = p.id;
}

// Build pid → player info for position lookup
const PID_TO_PLAYER = {};
for (const p of PLAYERS) {
  PID_TO_PLAYER[p.id] = p;
}

export function LiveScoringProvider({ children }) {
  const [tick, setTick] = useState(0);
  const esRef = useRef(null);

  useEffect(() => {
    const es = new EventSource('/api/live/stream');
    esRef.current = es;

    es.addEventListener('scores', (e) => {
      try {
        const data = JSON.parse(e.data);
        applyScores(data);
        setTick(t => t + 1);
      } catch (err) {
        console.error('[LiveScoring] Failed to parse scores event:', err);
      }
    });

    es.addEventListener('error', () => {
      // Browser EventSource handles auto-reconnection.
      // On reconnect, the server sends full state as initial payload.
      console.warn('[LiveScoring] SSE connection error — browser will auto-reconnect');
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  return (
    <LiveScoringContext.Provider value={{ tick }}>
      {children}
    </LiveScoringContext.Provider>
  );
}

function applyScores(data) {
  // Clear stale state on each full update
  clearGameState();

  const week = data.week;
  // TODO: scoring preset should come from league context once multi-league is wired
  const preset = SCORING_PRESETS.halfPpr;

  // Set bye-week players first
  if (week) {
    for (const p of PLAYERS) {
      const byeWeek = BYE_WEEKS[p.team?.toUpperCase()];
      if (byeWeek === week) {
        gameState[p.id] = { status: 'bye', actual: 0 };
      }
    }
  }

  // Apply player scores from SSE data
  for (const [name, info] of Object.entries(data.players || {})) {
    const pid = NAME_TO_PID[name];
    if (!pid) continue;

    const player = PID_TO_PLAYER[pid];
    const points = calcFantasyPoints(info.rawStats, preset, player?.pos);

    gameState[pid] = {
      status: info.status === 'final' ? 'final' : 'playing',
      actual: points,
    };
  }

  // Mark remaining players on scheduled teams as 'scheduled'
  // (they won't be in data.players, so gameState[pid] stays undefined,
  //  which winProb.js already treats as 'scheduled')
}
