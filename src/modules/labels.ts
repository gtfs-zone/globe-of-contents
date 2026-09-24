/**
 * Display names and the one-line status text, shared by the list, the filters
 * and the detail modal so the same row never reads two different ways.
 */

import type { SourceRow, State, StatusEntry } from '../data/artifacts';

export const CATALOG_LABELS: Record<string, string> = {
  transitland: 'Transitland',
  mobilitydatabase: 'Mobility Database',
  curated: 'Curated',
};

export const CATALOG_SHORT: Record<string, string> = {
  transitland: 'TL',
  mobilitydatabase: 'MDB',
  curated: 'Curated',
};

export const KIND_LABELS: Record<string, string> = {
  static: 'Schedule',
  rt: 'Realtime',
};

export const STATE_LABELS: Record<State, string> = {
  up: 'Up',
  down: 'Down',
  unknown: 'Not checked',
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

/** Why a row reads the way it does, in a few words. */
export function statusLine(row: SourceRow, state: State, entry: StatusEntry | undefined): string {
  if (state === 'unknown') {
    if (row.auth) {
      return 'needs an API key';
    }
    return row.catalog === 'curated' ? 'resolves per app' : 'not checked yet';
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

export function placeLine(row: SourceRow): string {
  return [row.municipality, row.subdivision, row.country || row.country_code]
    .filter(Boolean)
    .join(', ');
}
