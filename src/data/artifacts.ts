/**
 * The artifacts geometry-car publishes, and the one way to fetch them.
 *
 * Field names mirror geometry-car's `artifacts.py`. A feed is one logical
 * transit system, bundling its static and realtime roles across catalogs.
 * `search.json` is every feed cut down to what the list, the map and the
 * search need; `feeds.json` is the same feeds in full. `sources.json` is the
 * raw catalog layer a feed's `members` point into, and `status.json` carries
 * each row's last check.
 *
 * `manifest.json` is fetched first and revalidated every time; every other
 * artifact is fetched with its manifest hash in the query string, so a browser
 * cache can only ever serve the bytes the manifest names.
 *
 * Loading comes in two stages: the core (`search.json`, `summary.json`)
 * paints the map, the list and the search; the detail (`feeds.json`,
 * `sources.json`, `status.json`) follows for the full feeds, member rows and
 * Source pages.
 */

import { parseSearchDocument } from 'interlocking/gtfs/feed-catalog';
import { CONFIG } from '../config';

export type Catalog = 'transitland' | 'mobilitydatabase' | 'gtfszone';
export type Kind = 'static' | 'rt';
/** A feed's state: partial is a schedule that answers with a realtime role that does not. */
export type State = 'up' | 'partial' | 'down' | 'unknown';
/** A role's or a row's last check. */
export type RoleState = 'up' | 'down' | 'unknown';
/** `realtime` is an endpoint whose entity types its catalog does not declare. */
export type Role = 'scheduled' | 'vehicles' | 'trip_updates' | 'alerts' | 'realtime';

export const STATES: State[] = ['up', 'partial', 'down', 'unknown'];
export const ROLES: Role[] = ['scheduled', 'vehicles', 'trip_updates', 'alerts', 'realtime'];
export const RT_ROLES: Role[] = ['vehicles', 'trip_updates', 'alerts', 'realtime'];

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
  realtimeUrl?: string;
  same_endpoint_as?: string[];
  /** Mobility Database lifecycle: active, deprecated, inactive, ... */
  feed_status?: string;
  /** Non-zero means the endpoint needs a key, so it is never checked. */
  auth?: number;
  license_url?: string;
  state?: RoleState;
}

/** What the schedule's last download held, from cape-flier's content report. */
export interface FeedContent {
  /** ok, not_zip, missing_files, parse_error, http_error, timeout, memory, error. */
  state: string;
  since: string;
  checked: string;
  /** For not_zip, what came back instead: html, json, xml, empty, unknown. */
  detail?: string;
  serviceStart?: string;
  serviceEnd?: string;
  publisher?: string;
  version?: string;
  routes?: number;
  stops?: number;
  trips?: number;
  routeTypes?: number[];
}

export interface Feed extends Place {
  feedId: string;
  name: string;
  /** What tells the feed apart from others of its name, e.g. "Rail". */
  subtitle?: string;
  /** Every other name the feed goes by: rows', operators', agencies'. From `search.json`. */
  altNames: string[];
  /** Municipality, subdivision, country; whichever are known. From `search.json`. */
  place: string[];
  countryCode?: string;
  /** `rowId`s of the catalog rows this feed bundles. Empty until the detail is in. */
  members: string[];
  state: State;
  roleState: Partial<Record<Role, RoleState>>;
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
  /** Only for feeds sites.gtfs.zone builds a timetable site from. */
  content?: FeedContent;
}

/** A `feeds.json` entry: everything but what only `search.json` carries. */
type FullFeed = Omit<Feed, 'altNames' | 'place' | 'countryCode'>;

export interface StatusEntry {
  state: RoleState;
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

/** What the map, the list and the search need: painted as soon as it lands. */
export interface CoreCatalogue {
  generatedAt: string;
  feeds: Feed[];
  summary: Summary;
}

/** The full feeds, the catalog rows and their checks, fetched behind the core. */
export interface DetailCatalogue {
  feeds: FullFeed[];
  sources: SourceRow[];
  status: Record<string, StatusEntry>;
}

/**
 * Bytes received so far across a stage's artifacts, against the manifest's
 * total. `total` is null once the two stop being comparable.
 */
export type ProgressHandler = (received: number, total: number | null) => void;

async function fetchManifest(): Promise<Manifest> {
  const url = `${CONFIG.DATA_BASE}/manifest.json`;
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`${url}: HTTP ${res.status} ${res.statusText}`.trim());
  }
  return (await res.json()) as Manifest;
}

/**
 * A load run once per session unless it fails. A failure is not kept, so a
 * retry refetches rather than replaying the same rejection. Arguments only
 * reach the call that starts the load.
 */
function sessionCached<A extends unknown[], T>(load: (...args: A) => Promise<T>): (...args: A) => Promise<T> {
  let cached: Promise<T> | null = null;
  return (...args) =>
    (cached ??= load(...args).catch((err: unknown) => {
      cached = null;
      throw err;
    }));
}

/** The manifest both stages read. */
const loadManifest = sessionCached(fetchManifest);

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

/** Fetch the named artifacts in parallel, at the hashes the manifest names. */
async function fetchArtifacts(names: string[], onProgress?: ProgressHandler): Promise<unknown[]> {
  const manifest = await loadManifest();

  const entries = names.map((name) => {
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

  return Promise.all(
    entries.map(({ name, entry }) =>
      fetchCounted<unknown>(`${CONFIG.DATA_BASE}/${name}?v=${entry.sha256.slice(0, 16)}`, counter(name, entry.bytes))
    )
  );
}

/**
 * The searchable feeds and the summary. `onProgress` only hears about a fetch
 * this call started.
 */
export const loadCore = sessionCached(async (onProgress?: ProgressHandler): Promise<CoreCatalogue> => {
  const manifest = await loadManifest();
  const [search, summary] = await fetchArtifacts(['search.json', 'summary.json'], onProgress);
  return {
    generatedAt: manifest.generated_at,
    feeds: parseSearchDocument(search).map((feed) => ({ ...feed, country_code: feed.countryCode, members: [] })),
    summary: summary as Summary,
  };
});

/** The full feeds, the catalog rows and their checks. */
export const loadDetail = sessionCached(async (): Promise<DetailCatalogue> => {
  const [feeds, sources, status] = await fetchArtifacts(['feeds.json', 'sources.json', 'status.json']);
  return {
    feeds: (feeds as { feeds: FullFeed[] }).feeds,
    sources: (sources as { sources: SourceRow[] }).sources,
    status: (status as { sources: Record<string, StatusEntry> }).sources,
  };
});

/** A row's state, from the status document when it has one. */
export function stateOf(row: SourceRow, status: Record<string, StatusEntry>): RoleState {
  return status[row.rowId]?.state ?? row.state ?? 'unknown';
}

/** Whether a feed carries any realtime role. */
export function hasRealtime(feed: Feed): boolean {
  return RT_ROLES.some((role) => (feed.urls[role]?.length ?? 0) > 0);
}

/**
 * Feeds in list order: newest schedule Last-Modified first, then feeds without
 * one, each group by name. Parses every date once rather than per comparison.
 */
export function sortFeeds(feeds: Feed[]): Feed[] {
  const keyed = feeds.map((feed) => {
    const time = feed.lastModified ? Date.parse(feed.lastModified) : NaN;
    return { feed, time: Number.isNaN(time) ? -Infinity : time, name: feed.name || feed.feedId };
  });
  keyed.sort((a, b) => (a.time === b.time ? a.name.localeCompare(b.name) : b.time - a.time));
  return keyed.map(({ feed }) => feed);
}

/**
 * The loaded catalogue, keyed every way the pages look it up. Built from the
 * core; the full feeds, the rows and their checks arrive later through
 * `attachDetail`, and until then `row` finds nothing and `membersOf` is empty.
 */
export class CatalogueIndex {
  readonly generatedAt: string;
  /** Every feed, in list order (see `sortFeeds`). */
  readonly feeds: Feed[];
  readonly summary: Summary;
  status: Record<string, StatusEntry> = {};
  private feedById: Map<string, Feed>;
  private rowById = new Map<string, SourceRow>();
  private feedOfRow = new Map<string, Feed>();
  private detail = false;

  constructor(data: CoreCatalogue) {
    this.generatedAt = data.generatedAt;
    this.feeds = sortFeeds(data.feeds);
    this.summary = data.summary;
    this.feedById = new Map(this.feeds.map((feed) => [feed.feedId, feed]));
  }

  /** Whether the rows and their checks are in. */
  get hasDetail(): boolean {
    return this.detail;
  }

  /**
   * Merge each full feed into the one already listed, in place, so the list,
   * the map and the search keep holding the same objects.
   */
  attachDetail(data: DetailCatalogue): void {
    for (const full of data.feeds) {
      const feed = this.feedById.get(full.feedId);
      if (feed) {
        Object.assign(feed, full);
      }
    }
    this.feedOfRow = new Map(this.feeds.flatMap((feed) => feed.members.map((member) => [member, feed] as const)));
    this.rowById = new Map(data.sources.map((row) => [row.rowId, row]));
    this.status = data.status;
    this.detail = true;
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
