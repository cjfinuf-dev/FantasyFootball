import { apiFetch } from './client';

export async function getNews({ limit = 15, before = null, category = null } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', limit);
  if (before) params.set('before', before);
  if (category && category !== 'all') params.set('category', category);
  return apiFetch(`/api/news?${params.toString()}`);
}
