/**
 * The artifacts geometry-car publishes, and the one way to fetch them.
 *
 * Field names mirror geometry-car's `artifacts.py`. `sources.json` keeps the
 * camelCase names of the old `atlas-feeds.json` for the URL and id fields, with
 * everything newer in snake_case alongside.
 *
 * `manifest.json` is fetched first and revalidated every time; every other
 * artifact is fetched with its manifest hash in the query string, so a browser
 * cache can only ever serve the bytes the manifest names.
 */

import { CONFIG } from '../config';

export type Catalog = 'transitland' | 'mobilitydatabase' | 'curated';
export type Kind = 'static' | 'rt';
export type State = 'up' | 'down' | 'unknown';

export interface SourceRow {
  rowId: string;
  kind: Kind;
  feedId: string;
  name: string;
  operator_name: string;
  source: string;
  catalog: Catalog;
  scheduledUrl?: string;
  vehiclesUrl?: string;
  tripUpdatesUrl?: string;
  alertsUrl?: string;
  country_code?: string;
  country?: string;
  subdivision?: string;
  municipality?: string;
  lat?: number;
  lon?: number;
  /** [min_lat, min_lon, max_lat, max_lon] */
  bbox?: [number, number, number, number];
  same_endpoint_as?: string[];
  /** Mobility Database lifecycle: active, deprecated, inactive, ... */
  feed_status?: string;
  /** Non-zero means the endpoint needs a key, so it is never checked. */
  auth?: number;
  license_url?: string;
  note?: string;
  state?: State;
}

export interface StatusEntry {
  state: State;
  code?: number;
  error?: string;
  /** Set when the endpoint answered somewhere other than where it was aimed. */
  final_url?: string;
  latency_ms?: number;
  failures?: number;
  /** When the current state was first seen. For a down row, when it went down. */
  since?: string;
}

export interface Summary {
  generated_at: string;
  total: number;
  by_catalog: Record<string, number>;
  by_kind: Record<string, number>;
  by_state: Record<string, number>;
  by_country: Record<string, number>;
  placed: number;
  unplaced: number;
}

interface Manifest {
  generated_at: string;
  run_id: string;
  artifacts: Record<string, { sha256: string; bytes: number }>;
}

export interface Catalogue {
  generatedAt: string;
  sources: SourceRow[];
  status: Record<string, StatusEntry>;
  summary: Summary;
}

let cached: Promise<Catalogue> | null = null;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`${url}: HTTP ${res.status} ${res.statusText}`.trim());
  }
  return (await res.json()) as T;
}

async function fetchCatalogue(): Promise<Catalogue> {
  const manifest = await fetchJson<Manifest>(`${CONFIG.DATA_BASE}/manifest.json`, {
    cache: 'no-cache',
  });

  const artifact = <T>(name: string): Promise<T> => {
    const entry = manifest.artifacts[name];
    if (!entry) {
      throw new Error(`manifest.json does not list ${name}`);
    }
    return fetchJson<T>(`${CONFIG.DATA_BASE}/${name}?v=${entry.sha256.slice(0, 16)}`);
  };

  const [sources, status, summary] = await Promise.all([
    artifact<{ sources: SourceRow[] }>('sources.json'),
    artifact<{ sources: Record<string, StatusEntry> }>('status.json'),
    artifact<Summary>('summary.json'),
  ]);

  return {
    generatedAt: manifest.generated_at,
    sources: sources.sources,
    status: status.sources,
    summary,
  };
}

/** The whole catalogue, fetched once per session unless a fetch fails. */
export function loadCatalogue(): Promise<Catalogue> {
  cached ??= fetchCatalogue().catch((err: unknown) => {
    // Not cached on failure, so a retry refetches rather than replaying the
    // same rejection for the rest of the session.
    cached = null;
    throw err;
  });
  return cached;
}

/** A row's state, from the status document when it has one. */
export function stateOf(row: SourceRow, status: Record<string, StatusEntry>): State {
  return status[row.rowId]?.state ?? row.state ?? 'unknown';
}
