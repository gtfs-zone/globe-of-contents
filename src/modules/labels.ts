/**
 * Display names and the one-line status text, shared by the pages, the map
 * and the search box so the same feed never reads two different ways.
 */

import type { Feed, Place, Role, SourceRow, State, StatusEntry } from '../data/artifacts';

export const CATALOG_LABELS: Record<string, string> = {
  transitland: 'Transitland',
  mobilitydatabase: 'Mobility Database',
  curated: 'Curated',
};

export const KIND_LABELS: Record<string, string> = {
  static: 'Schedule',
  rt: 'Realtime',
};

export const ROLE_LABELS: Record<Role, string> = {
  scheduled: 'Schedule',
  vehicles: 'Vehicle positions',
  trip_updates: 'Trip updates',
  alerts: 'Service alerts',
};

export const STATE_LABELS: Record<State, string> = {
  up: 'Up',
  down: 'Down',
  unknown: 'Inaccessible',
};

export const STATE_BADGE: Record<State, string> = {
  up: 'badge-success',
  down: 'badge-error',
  unknown: 'badge-ghost',
};

const ERROR_LABELS: Record<string, string> = {
  dns: 'DNS lookup failed',
  tls: 'TLS error',
  timeout: 'timed out',
  refused: 'connection refused',
  http_4xx: 'client error',
  http_5xx: 'server error',
};

export function formatDate(iso: string | undefined): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatCount(n: number): string {
  return n.toLocaleString();
}

export function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = n / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

/** Why a row reads the way it does, in a few words. */
export function statusLine(row: SourceRow, state: State, entry: StatusEntry | undefined): string {
  if (state === 'unknown') {
    if (row.auth) {
      return 'needs an API key';
    }
    return row.catalog === 'curated' ? 'resolves per app' : '';
  }
  if (state === 'up') {
    return entry?.latency_ms !== undefined ? `${entry.latency_ms} ms` : '';
  }
  const parts: string[] = [];
  if (entry?.error) {
    parts.push(ERROR_LABELS[entry.error] ?? entry.error);
  }
  if (entry?.code) {
    parts.push(`HTTP ${entry.code}`);
  }
  // `since` on a down row is when it went down; it has not answered since then.
  if (entry?.since) {
    parts.push(`never reached since ${formatDate(entry.since)}`);
  }
  return parts.join(', ');
}

/** A feed's state in a few words: when it went down, or why it is inaccessible. */
export function feedStatusLine(feed: Feed): string {
  if (feed.state === 'down') {
    return feed.since ? `never reached since ${formatDate(feed.since)}` : 'not answering';
  }
  if (feed.state === 'unknown') {
    return feed.auth?.length ? 'needs an API key' : '';
  }
  return '';
}

export function placeLine(place: Place): string {
  return [place.municipality, place.subdivision, place.country || place.country_code]
    .filter(Boolean)
    .join(', ');
}
