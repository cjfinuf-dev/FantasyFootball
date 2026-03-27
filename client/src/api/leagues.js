import { apiFetch } from './client';

export async function getLeagues() {
  return apiFetch('/api/leagues');
}

export async function createLeague(data) {
  return apiFetch('/api/leagues', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getLeague(id) {
  return apiFetch(`/api/leagues/${id}`);
}

export async function updateLeague(id, data) {
  return apiFetch(`/api/leagues/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
