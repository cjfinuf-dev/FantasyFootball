import { apiFetch } from './client';

export async function signup({ name, email, password }) {
  return apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function signin({ email, password }) {
  return apiFetch('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signout() {
  return apiFetch('/api/auth/signout', { method: 'POST' });
}

export async function getMe() {
  return apiFetch('/api/auth/me');
}
