const BASE_URL = import.meta.env.VITE_API_URL || '';

let _refreshing = null; // singleton promise to avoid concurrent refresh calls

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('ff-refresh-token');
  if (!refreshToken) return null;

  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    localStorage.removeItem('ff-token');
    localStorage.removeItem('ff-refresh-token');
    return null;
  }

  const data = await res.json();
  if (data.token) {
    localStorage.setItem('ff-token', data.token);
    return data.token;
  }
  return null;
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('ff-token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const { signal, ...restOptions } = options;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...restOptions,
    headers,
    ...(signal ? { signal } : {}),
  });

  // On 401, attempt one token refresh and retry the original request
  if (res.status === 401 && path !== '/api/auth/refresh') {
    if (!_refreshing) _refreshing = refreshAccessToken().finally(() => { _refreshing = null; });
    const newToken = await _refreshing;
    if (newToken) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        ...restOptions,
        headers: retryHeaders,
        ...(signal ? { signal } : {}),
      });

      let retryData;
      try { retryData = await retryRes.json(); } catch { throw new Error('Server unavailable'); }
      if (!retryRes.ok) {
        const err = new Error(retryData.error || 'Request failed');
        err.status = retryRes.status;
        throw err;
      }
      return retryData;
    }
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Server unavailable');
  }

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }

  return data;
}
