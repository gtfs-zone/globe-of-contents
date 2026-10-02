/**
 * Display names and the one-line status text, shared by the pages, the map
 * and the search box so the same feed never reads two different ways.
 */

import {
  FEED_STATE_LABELS,
  ROLE_LABELS as FEED_ROLE_LABELS,
} from 'gtfs-zone-web-common/gtfs/feed-catalog';
import {
  formatDate as fmtDate,
  formatNumber,
} from 'gtfs-zone-web-common/i18n/fmt';
import { CONFIG } from '../config';
import type {
  Feed,
  FeedContent,
  Place,
  Role,
  RoleState,
  SourceRow,
  State,
  StatusEntry,
} from '../data/artifacts';
import { t } from '../i18n/messages';

export { placeLine as feedPlaceLine } from 'gtfs-zone-web-common/gtfs/feed-catalog';

export const CATALOG_LABELS: Record<string, string> = {
  transitland: 'Transitland',
  mobilitydatabase: 'Mobility Database',
  gtfszone: 'rt.gtfs.zone',
  ntd: 'National Transit Database',
};

export const KIND_LABELS: Record<string, string> = {
  static: t('kind.static'),
  rt: t('kind.rt'),
};

// gtfs-zone-web-common's words, so a feed reads the same in the editor and the viewer.
export const ROLE_LABELS: Record<Role, string> = FEED_ROLE_LABELS;
export const STATE_LABELS: Record<State, string> = FEED_STATE_LABELS;

export const STATE_BADGE: Record<State, string> = {
  up: 'badge-success',
  partial: 'badge-warning',
  down: 'badge-error',
  unknown: 'badge-ghost',
};

export const CONTENT_LABELS: Record<string, string> = {
  ok: t('content.ok'),
  not_zip: t('content.not_zip'),
  missing_files: t('content.missing_files'),
  parse_error: t('content.parse_error'),
  http_error: t('content.http_error'),
  timeout: t('content.timeout'),
  memory: t('content.memory'),
  error: t('content.error'),
};

const SNIFF_LABELS: Record<string, string> = {
  html: t('sniff.html'),
  json: t('sniff.json'),
  xml: t('sniff.xml'),
  empty: t('sniff.empty'),
};

/** The last download's outcome, with what came back when it was not a zip. */
export function contentLine(content: FeedContent): string {
  const label = CONTENT_LABELS[content.state] ?? content.state;
  const sniffed =
    content.state === 'not_zip' && content.detail
      ? SNIFF_LABELS[content.detail]
      : undefined;
  return sniffed ? `${label}: ${sniffed}` : label;
}

/** A Feed or Source page field; its label and hover text are `field.*` and `hint.*`. */
export type FieldName =
  | 'place'
  | 'altNames'
  | 'scheduleSize'
  | 'lastModified'
  | 'scheduleContents'
  | 'service'
  | 'publisher'
  | 'version'
  | 'contents'
  | 'feedId'
  | 'operator'
  | 'catalogId'
  | 'from'
  | 'catalogStatus'
  | 'license'
  | 'sameEndpoint'
  | 'redirectsTo'
  | 'state'
  | 'httpStatus'
  | 'error'
  | 'latency'
  | 'failures'
  | 'downSince'
  | 'stateSince'
  | 'access';

const ERROR_LABELS: Record<string, string> = {
  dns: t('error.dns'),
  tls: t('error.tls'),
  timeout: t('error.timeout'),
  refused: t('error.refused'),
  http_4xx: t('error.http_4xx'),
  http_5xx: t('error.http_5xx'),
};

export function formatDate(iso: string | undefined): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : fmtDate(date, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatCount(n: number): string {
  return formatNumber(n);
}

export function formatMs(ms: number): string {
  return formatNumber(ms, { style: 'unit', unit: 'millisecond' });
}

export function formatBytes(n: number): string {
  if (n < 1024) {
    return t('unit.bytes', { n });
  }
  const units = ['kilobyte', 'megabyte', 'gigabyte'];
  let value = n / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value < 10 ? 1 : 0;
  return formatNumber(value, {
    style: 'unit',
    unit: units[unit],
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Why a row reads the way it does, in a few words. */
export function statusLine(
  row: SourceRow,
  state: RoleState,
  entry: StatusEntry | undefined
): string {
  if (state === 'unknown') {
    return row.auth ? t('status.needsKey') : '';
  }
  if (state === 'up') {
    return entry?.latency_ms !== undefined ? formatMs(entry.latency_ms) : '';
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
    parts.push(t('status.downSince', { date: formatDate(entry.since) }));
  }
  return parts.join(', ');
}

/** A feed's state in a few words: since when it is down or partial, or why it is inaccessible. */
export function feedStatusLine(feed: Feed): string {
  if (feed.state === 'down') {
    return feed.since
      ? t('status.downSince', { date: formatDate(feed.since) })
      : t('status.notAnswering');
  }
  if (feed.state === 'partial') {
    return feed.since
      ? t('status.partialSince', { date: formatDate(feed.since) })
      : t('status.someRealtime');
  }
  if (feed.state === 'unknown') {
    return feed.auth?.length ? t('status.needsKey') : '';
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
  return [
    place.municipality,
    place.subdivision,
    place.country || place.country_code,
  ]
    .filter(Boolean)
    .join(', ');
}
