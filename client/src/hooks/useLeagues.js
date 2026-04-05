import { useContext } from 'react';
import { LeaguesContext } from '../context/LeaguesContext';

export function useLeagues() {
  const ctx = useContext(LeaguesContext);
  if (!ctx) throw new Error('useLeagues must be used inside LeaguesProvider');
  return ctx;
}
