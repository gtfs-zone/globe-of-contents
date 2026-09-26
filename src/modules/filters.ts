/**
 * Filter state, its two homes, and the matching itself.
 *
 * Home's URL hash is what a shared link carries: `q`, `status` (a comma list
 * of states) and `rt`. The same filters are also kept per device in
 * localStorage, and restored only when a visit arrives with no filters in the
 * hash, so a filtered link always wins over whatever the recipient last looked
 * at.
 */

import uFuzzy from '@leeoniya/ufuzzy';
import { CONFIG } from '../config';
import type { CatalogueIndex, Feed, State } from '../data/artifacts';
import { STATES, hasRealtime } from '../data/artifacts';
import { readStored, writeStored } from './storage';

export interface Filters {
  q: string;
  /** States to show; empty shows every state. */
  status: State[];
  /** Only feeds with at least one realtime role. */
  rt: boolean;
}

const FILTER_KEYS = ['q', 'status', 'rt'];

function parseStatus(value: unknown): State[] {
  const parts = typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : [];
  return STATES.filter((state) => parts.includes(state));
}

/**
 * Filters from a hash. At boot (`fromDevice`), a hash naming no filter falls
 * back to the device's last filters; a later hash change never does, since an empty
 * hash then means the filters were cleared.
 */
export function readFilters(hash: string, fromDevice = false): Filters {
  const params = new URLSearchParams(hash);
  const named = FILTER_KEYS.some((key) => params.has(key));
  if (fromDevice && !named) {
    const stored = readStored<Filters>(CONFIG.FILTERS_KEY);
    return {
      q: typeof stored?.q === 'string' ? stored.q : '',
      status: parseStatus(stored?.status),
      rt: stored?.rt === true,
    };
  }
  return {
    q: params.get('q') ?? '',
    status: parseStatus(params.get('status')),
    rt: params.get('rt') === '1',
  };
}

/** The hash half the filters own. */
export function filterParams(filters: Filters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.q) {
    params.q = filters.q;
  }
  if (filters.status.length > 0) {
    params.status = filters.status.join(',');
  }
  if (filters.rt) {
    params.rt = '1';
  }
  return params;
}

export function saveFilters(filters: Filters): void {
  writeStored(CONFIG.FILTERS_KEY, filters);
}

export function sameFilters(a: Filters, b: Filters): boolean {
  return a.q === b.q && a.rt === b.rt && a.status.join(',') === b.status.join(',');
}

// Same tolerance as interlocking's search box: one inserted character inside
// a term, terms themselves in any order.
const uf = new uFuzzy({ intraIns: 1 });

// Above this many text matches uFuzzy skips its ranking pass; the matches
// then keep catalogue order, newest schedule first.
const RANK_THRESHOLD = 1000;

/**
 * Everything a text query matches against, one string per feed: its own name
 * and place, and the names, operators and catalog ids of every member row, so
 * a feed is found by whatever any catalog calls it.
 */
export function buildHaystack(index: CatalogueIndex): string[] {
  return index.feeds.map((feed) => {
    const parts = new Set<string>();
    for (const value of [feed.name, feed.municipality, feed.subdivision, feed.country, feed.country_code]) {
      if (value) {
        parts.add(value);
      }
    }
    for (const row of index.membersOf(feed)) {
      for (const value of [row.name, row.operator_name, row.feedId, row.municipality, row.subdivision]) {
        if (value) {
          parts.add(value);
        }
      }
    }
    return [...parts].join(' ');
  });
}

export class FeedFilter {
  private feeds: Feed[];
  private haystack: string[];
  private lastQuery: string | null = null;
  private lastText: number[] | null = null;

  constructor(index: CatalogueIndex, haystack: string[]) {
    this.feeds = index.feeds;
    this.haystack = haystack;
  }

  /** Indexes into `feeds` matching the text query, in rank order. */
  private textMatches(query: string): number[] | null {
    if (!query) {
      return null;
    }
    if (query === this.lastQuery) {
      return this.lastText;
    }
    const [idxs, info, order] = uf.search(this.haystack, query, 1, RANK_THRESHOLD);
    const ranked = info && order ? order.map((o) => info.idx[o]) : (idxs ?? []);
    this.lastQuery = query;
    this.lastText = ranked;
    return ranked;
  }

  apply(filters: Filters): Feed[] {
    const text = this.textMatches(filters.q.trim());
    const candidates = text ? text.map((i) => this.feeds[i]) : this.feeds;
    const states = new Set(filters.status);
    return candidates.filter(
      (feed) => (states.size === 0 || states.has(feed.state)) && (!filters.rt || hasRealtime(feed))
    );
  }
}
