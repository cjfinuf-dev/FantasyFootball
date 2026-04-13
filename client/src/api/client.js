const BASE_URL = import.meta.env.VITE_API_URL || '';
const DEFAULT_TIMEOUT_MS = 30_000;

let _refreshing = null; // singleton promise to avoid concurrent refresh calls

function timeoutSignal(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  controller.signal.addEventListener('abort', () => clearTimeout(id));
  return controller.signal;
}

function mergeSignals(externalSignal, timeoutMs) {
  const timeout = timeoutSignal(timeoutMs);
  if (!externalSignal) return timeout;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  externalSignal.addEventListener('abort', onAbort);
  timeout.addEventListener('abort', onAbort);
  return controller.signal;
}

async function refreshAccessToken() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: timeoutSignal(DEFAULT_TIMEOUT_MS),
      });

      if (res.ok) {
        return true;
      }

      // First attempt failed — wait 2s before retry
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
    } catch {
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
    }
  }

  // Both attempts failed — notify UI
  window.dispatchEvent(new CustomEvent('ff:session-expired'));
  return false;
}

export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const { signal: externalSignal, timeout = DEFAULT_TIMEOUT_MS, ...restOptions } = options;
  const signal = mergeSignals(externalSignal, timeout);
  const res = await fetch(`${BASE_URL}${path}`, {
    ...restOptions,
    headers,
    credentials: 'include',
    signal,
  });

  // On 401, attempt one token refresh and retry the original request
  if (res.status === 401 && path !== '/api/auth/refresh') {
    if (!_refreshing) _refreshing = refreshAccessToken().finally(() => { _refreshing = null; });
    const refreshed = await _refreshing;
    if (refreshed) {
      const retrySignal = mergeSignals(externalSignal, timeout);
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        ...restOptions,
        headers,
        credentials: 'include',
        signal: retrySignal,
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
