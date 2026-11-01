// Browser-side helpers used by every page: calling the API and formatting.
import { useCallback, useEffect, useState } from 'react';

// fetch() wrapper: sends/receives JSON and throws the API's error message
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && !path.startsWith('/api/auth')) {
    window.location.assign(new URL('/login', window.location.origin).href);
  }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

// Loads `path` when the page opens (and again when `path` changes).
// reload() fetches it again, e.g. after saving something.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const reload = useCallback(() => api(path).then(
    (data) => setState({ data, error: null, loading: false }),
    (err) => setState({ data: null, error: err.message, loading: false })
  ), [path]);

  useEffect(() => {
    // Ignore a response that arrives after `path` changed (e.g. fast typing in a filter)
    let current = true;
    api(path).then(
      (data) => current && setState({ data, error: null, loading: false }),
      (err) => current && setState({ data: null, error: err.message, loading: false })
    );
    return () => {
      current = false;
    };
  }, [path]);

  return { ...state, reload };
}

const IST = 'Asia/Kolkata';

export function formatDate(value) {
  if (!value) return '—';
  const date = typeof value === 'string' && value.length === 10 ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: IST,
  });
}

export function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: IST });
}

export function formatMoney(amount) {
  return `₹${Number(amount ?? 0).toLocaleString('en-IN')}`;
}

export function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: IST });
}

export function shortWeek(value) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST });
}
