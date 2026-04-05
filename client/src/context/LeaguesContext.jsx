import { createContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as leagueApi from '../api/leagues';

export const LeaguesContext = createContext(null);

export function LeaguesProvider({ children }) {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState([]);
  const [leaguesLoading, setLeaguesLoading] = useState(false);

  useEffect(() => {
    if (!user) { setLeagues([]); return; }
    setLeaguesLoading(true);
    leagueApi.getLeagues()
      .then(data => setLeagues(data.leagues || []))
      .catch(() => {})
      .finally(() => setLeaguesLoading(false));
  }, [user]);

  const addLeague = useCallback((league) => {
    setLeagues(prev => [league, ...prev]);
  }, []);

  const removeLeague = useCallback((leagueId) => {
    setLeagues(prev => prev.filter(lg => lg.id !== leagueId));
  }, []);

  const refreshLeagues = useCallback(async () => {
    setLeaguesLoading(true);
    try {
      const data = await leagueApi.getLeagues();
      setLeagues(data.leagues || []);
    } catch {} finally {
      setLeaguesLoading(false);
    }
  }, []);

  return (
    <LeaguesContext.Provider value={{ leagues, leaguesLoading, addLeague, removeLeague, refreshLeagues }}>
      {children}
    </LeaguesContext.Provider>
  );
}
