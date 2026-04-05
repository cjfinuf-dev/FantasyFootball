import { apiFetch } from './client';

export async function getHistoricalStats() {
  return apiFetch('/api/stats/historical');
}

export async function updateSeason(year, playerStats) {
  return apiFetch(`/api/stats/season/${year}`, {
    method: 'PUT',
    body: JSON.stringify(playerStats),
  });
}

export async function updatePlayer(playerId, seasons) {
  return apiFetch(`/api/stats/player/${playerId}`, {
    method: 'PUT',
    body: JSON.stringify(seasons),
  });
}

export async function getSituationEvents() {
  return apiFetch('/api/news/impacts');
}
