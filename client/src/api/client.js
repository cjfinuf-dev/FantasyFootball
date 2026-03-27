const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('ff-token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }

  return data;
}
