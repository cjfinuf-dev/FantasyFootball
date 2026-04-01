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

export async function deleteLeague(id) {
  return apiFetch(`/api/leagues/${id}`, {
    method: 'DELETE',
  });
}

export async function joinLeague({ inviteCode, teamName }) {
  return apiFetch('/api/leagues/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode, teamName }),
  });
}

export async function removeMember(leagueId, memberId) {
  return apiFetch(`/api/leagues/${leagueId}/members/${memberId}`, {
    method: 'DELETE',
  });
}

export async function saveDraft(leagueId, data) {
  return apiFetch(`/api/leagues/${leagueId}/draft`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getDraft(leagueId) {
  return apiFetch(`/api/leagues/${leagueId}/draft`);
}

export async function deleteDraft(leagueId) {
  return apiFetch(`/api/leagues/${leagueId}/draft`, {
    method: 'DELETE',
  });
}
