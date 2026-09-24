/**
 * The artifacts geometry-car publishes, and the one way to fetch them.
 *
 * Field names mirror geometry-car's `artifacts.py`. `feeds.json` is what the
 * app lists and maps: one logical feed per transit system, bundling its static
 * and realtime roles across catalogs. `sources.json` is the raw catalog layer
 * a feed's `members` point into, and `status.json` carries each row's last
 * check.
 *
 * `manifest.json` is fetched first and revalidated every time; every other
 * artifact is fetched with its manifest hash in the query string, so a browser
 * cache can only ever serve the bytes the manifest names.
 */

import { CONFIG } from '../config';

export type Catalog = 'transitland' | 'mobilitydatabase' | 'curated';
export type Kind = 'static' | 'rt';
export type State = 'up' | 'down' | 'unknown';
export type Role = 'scheduled' | 'vehicles' | 'trip_updates' | 'alerts';

export const STATES: State[] = ['up', 'down', 'unknown'];
export const ROLES: Role[] = ['scheduled', 'vehicles', 'trip_updates', 'alerts'];
export const RT_ROLES: Role[] = ['vehicles', 'trip_updates', 'alerts'];

/** Place keys shared by rows and feeds; absent rather than empty. */
export interface Place {
  country_code?: string;
  country?: string;
  subdivision?: string;
  municipality?: string;
  lat?: number;
  lon?: number;
  /** [min_lat, min_lon, max_lat, max_lon] */
  bbox?: [number, number, number, number];
}

export interface SourceRow extends Place {
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
  same_endpoint_as?: string[];
  /** Mobility Database lifecycle: active, deprecated, inactive, ... */
  feed_status?: string;
  /** Non-zero means the endpoint needs a key, so it is never checked. */
  auth?: number;
  license_url?: string;
  note?: string;
  state?: State;
}

export interface Feed extends Place {
  feedId: string;
  name: string;
  /** `rowId`s of the catalog rows this feed bundles. */
  members: string[];
  state: State;
  roleState: Partial<Record<Role, State>>;
  /** Role to URLs, best first. The first is the one to load. */
  urls: Partial<Record<Role, string[]>>;
  /** Roles only reachable with a key. */
  auth?: Role[];
  /** The scheduled URL's size, from Content-Length. */
  staticBytes?: number;
  /** The scheduled URL's Last-Modified. */
  lastModified?: string;
  /** When the feed's overall state was reached. */
  since?: string;
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
  by_state: Record<string, number>;
  feeds: {
    total: number;
    by_state: Record<string, number>;
    realtime: number;
    placed: number;
    unplaced: number;
  };
}

interface Manifest {
  generated_at: string;
  run_id: string;
  artifacts: Record<string, { sha256: string; bytes: number }>;
}

export interface Catalogue {
  generatedAt: string;
  feeds: Feed[];
  sources: SourceRow[];
  status: Record<string, StatusEntry>;
  summary: Summary;
}

/**
 * Bytes received so far across every artifact, against the manifest's total.
 * `total` is null once the two stop being comparable.
 */
export type ProgressHandler = (received: number, total: number | null) => void;

const ARTIFACTS = ['feeds.json', 'sources.json', 'status.json', 'summary.json'] as const;

let cached: Promise<Catalogue> | null = null;

async function fetchManifest(): Promise<Manifest> {
  const url = `${CONFIG.DATA_BASE}/manifest.json`;
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`${url}: HTTP ${res.status} ${res.statusText}`.trim());
  }
  return (await res.json()) as Manifest;
}

/** Fetch and parse one JSON body, reporting each chunk's size as it arrives. */
async function fetchCounted<T>(url: string, onChunk: (bytes: number) => void): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url}: HTTP ${res.status} ${res.statusText}`.trim());
  }
  if (!res.body) {
    return (await res.json()) as T;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    onChunk(value.byteLength);
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return JSON.parse(text) as T;
}

async function fetchCatalogue(onProgress?: ProgressHandler): Promise<Catalogue> {
  const manifest = await fetchManifest();

  const entries = ARTIFACTS.map((name) => {
    const entry = manifest.artifacts[name];
    if (!entry) {
      throw new Error(`manifest.json does not list ${name}`);
    }
    return { name, entry };
  });

  // The stream yields decoded bytes, so it counts what the manifest measured
  // whether or not the transfer was compressed. A body that runs past its
  // manifest size is not the object the manifest names (a stale cache, a proxy
  // rewriting it), and from then on the bar only counts.
  let total: number | null = entries.reduce((sum, { entry }) => sum + entry.bytes, 0);
  let received = 0;
  const seen = new Map<string, number>();
  const counter = (name: string, expected: number) => (bytes: number) => {
    received += bytes;
    const sofar = (seen.get(name) ?? 0) + bytes;
    seen.set(name, sofar);
    if (sofar > expected) {
      total = null;
    }
    onProgress?.(received, total);
  };
  onProgress?.(0, total);

  const [feeds, sources, status, summary] = await Promise.all(
    entries.map(({ name, entry }) =>
      fetchCounted<unknown>(`${CONFIG.DATA_BASE}/${name}?v=${entry.sha256.slice(0, 16)}`, counter(name, entry.bytes))
    )
  );

  return {
    generatedAt: manifest.generated_at,
    feeds: (feeds as { feeds: Feed[] }).feeds,
    sources: (sources as { sources: SourceRow[] }).sources,
    status: (status as { sources: Record<string, StatusEntry> }).sources,
    summary: summary as Summary,
  };
}

/**
 * The whole catalogue, fetched once per session unless a fetch fails.
 * `onProgress` only hears about a fetch this call started.
 */
export function loadCatalogue(onProgress?: ProgressHandler): Promise<Catalogue> {
  cached ??= fetchCatalogue(onProgress).catch((err: unknown) => {
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

/** Whether a feed carries any realtime role. */
export function hasRealtime(feed: Feed): boolean {
  return RT_ROLES.some((role) => (feed.urls[role]?.length ?? 0) > 0);
}

/** The loaded catalogue, keyed every way the pages look it up. */
export class CatalogueIndex {
  readonly generatedAt: string;
  readonly feeds: Feed[];
  readonly status: Record<string, StatusEntry>;
  readonly summary: Summary;
  private feedById: Map<string, Feed>;
  private rowById: Map<string, SourceRow>;
  private feedOfRow = new Map<string, Feed>();

  constructor(data: Catalogue) {
    this.generatedAt = data.generatedAt;
    this.feeds = [...data.feeds].sort((a, b) => (a.name || a.feedId).localeCompare(b.name || b.feedId));
    this.status = data.status;
    this.summary = data.summary;
    this.feedById = new Map(this.feeds.map((feed) => [feed.feedId, feed]));
    this.rowById = new Map(data.sources.map((row) => [row.rowId, row]));
    for (const feed of this.feeds) {
      for (const member of feed.members) {
        this.feedOfRow.set(member, feed);
      }
    }
  }

  feed(feedId: string): Feed | undefined {
    return this.feedById.get(feedId);
  }

  row(rowId: string): SourceRow | undefined {
    return this.rowById.get(rowId);
  }

  /** The logical feed a catalog row landed in. */
  feedOf(rowId: string): Feed | undefined {
    return this.feedOfRow.get(rowId);
  }

  /** A feed's member rows, skipping any the sources document lacks. */
  membersOf(feed: Feed): SourceRow[] {
    return feed.members.map((id) => this.rowById.get(id)).filter((row): row is SourceRow => row !== undefined);
  }
}
