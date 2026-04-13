import { useContext } from 'react';
import { LiveScoringContext } from '../context/LiveScoringContext';

export function useLiveTick() {
  return useContext(LiveScoringContext)?.tick ?? 0;
}
