/**
 * Display names and the one-line status text, shared by the pages, the map
 * and the search box so the same feed never reads two different ways.
 */

import { CONFIG } from '../config';
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

/** Hover text for the Feed and Source pages' field labels. */
export const FIELD_HINTS: Record<string, string> = {
  Place: 'Where the catalog places this feed. Only the Mobility Database carries coordinates.',
  'Schedule size': "The schedule zip's size, from the Content-Length header of the last check.",
  'Last modified': "The schedule's Last-Modified header from the last check.",
  'Feed id': "This merged feed's id on list.gtfs.zone.",
  Operator: 'The agency or organisation the catalog says runs this feed.',
  'Catalog id': "This entry's id in its catalog; links to the catalog's own page for it.",
  From: 'Where the catalog itself got this entry.',
  'Catalog status': "The catalog's own lifecycle for this entry: active, deprecated, inactive and so on.",
  License: 'The license the catalog lists for this feed.',
  'Same endpoint as': 'Entries in other catalogs pointing at the same URL.',
  'Redirects to': 'Where the URL ended up after following redirects on the last check.',
  State: 'Up: answered on the last check. Down: failed it. Inaccessible: needs a key or was not checked. Click for the guide.',
  'HTTP status': 'The status code of the last check.',
  Error: 'Why the last check failed.',
  Latency: 'How long the last check took to answer.',
  'Failed checks in a row': 'Consecutive daily checks that failed.',
  'Down since': 'When the URL stopped answering.',
  'In this state since': 'When the current state was first seen.',
  Access: 'URLs that need an API key are never checked.',
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

/** The catalog's own page for a row, when it has one. */
export function catalogUrl(row: SourceRow): string | null {
  if (row.catalog === 'transitland') {
    return `${CONFIG.TRANSITLAND_FEED_BASE}${encodeURIComponent(row.feedId)}`;
  }
  if (row.catalog === 'mobilitydatabase') {
    return `${CONFIG.MOBILITYDATABASE_FEED_BASE}${row.kind === 'rt' ? 'gtfs_rt' : 'gtfs'}/${encodeURIComponent(row.feedId)}`;
  }
  return null;
}

export function placeLine(place: Place): string {
  return [place.municipality, place.subdivision, place.country || place.country_code]
    .filter(Boolean)
    .join(', ');
}
