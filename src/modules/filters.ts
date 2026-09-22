/**
 * Filter state, its two homes, and the matching itself.
 *
 * The URL hash is what a shared link carries: `q`, `catalog`, `state`, `kind`,
 * `country` and the open `source`. The same filters are also kept per device
 * in localStorage, and restored only when a visit arrives with an empty hash,
 * so a link always wins over whatever the recipient last looked at.
 */

import uFuzzy from '@leeoniya/ufuzzy';
import { CONFIG } from '../config';
import type { SourceRow, StatusEntry } from '../data/artifacts';
import { stateOf } from '../data/artifacts';
import { readStored, writeStored } from './storage';

export interface Filters {
  q: string;
  catalog: string;
  state: string;
  kind: string;
  country: string;
}

export interface HashState {
  filters: Filters;
  source: string | null;
}

export const EMPTY_FILTERS: Filters = { q: '', catalog: '', state: '', kind: '', country: '' };

const FILTER_KEYS = Object.keys(EMPTY_FILTERS) as (keyof Filters)[];

export function readHash(): HashState {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const hasFilters = FILTER_KEYS.some((key) => params.has(key));
  const stored = hasFilters || params.has('source') ? null : readStored<Filters>(CONFIG.FILTERS_KEY);

  const filters = { ...EMPTY_FILTERS };
  for (const key of FILTER_KEYS) {
    const value = params.get(key) ?? stored?.[key];
    if (typeof value === 'string') {
      filters[key] = value;
    }
  }
  return { filters, source: params.get('source') };
}

/** Rewrite the hash in place, without a history entry per keystroke. */
export function writeHash({ filters, source }: HashState): void {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    if (filters[key]) {
      params.set(key, filters[key]);
    }
  }
  if (source) {
    params.set('source', source);
  }
  const hash = params.toString();
  const url = `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ''}`;
  if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(null, '', url);
  }
  writeStored(CONFIG.FILTERS_KEY, filters);
}

// Same tolerance as interlocking's search box: one inserted character inside
// a term, terms themselves in any order.
const uf = new uFuzzy({ intraIns: 1 });

// Above this many text matches uFuzzy skips its ranking pass; the matches
// then keep catalogue order, which is by name.
const RANK_THRESHOLD = 1000;

/** Everything a text query matches against, one string per row. */
export function buildHaystack(rows: SourceRow[]): string[] {
  return rows.map((row) =>
    [
      row.name,
      row.operator_name,
      row.feedId,
      row.source,
      row.municipality,
      row.subdivision,
      row.country,
      row.country_code,
    ]
      .filter(Boolean)
      .join(' ')
  );
}

export class RowFilter {
  private rows: SourceRow[];
  private status: Record<string, StatusEntry>;
  private haystack: string[];
  private lastQuery: string | null = null;
  private lastText: number[] | null = null;

  constructor(rows: SourceRow[], status: Record<string, StatusEntry>) {
    this.rows = rows;
    this.status = status;
    this.haystack = buildHaystack(rows);
  }

  /** Indexes into `rows` matching the text query, in rank order. */
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

  apply(filters: Filters): SourceRow[] {
    const text = this.textMatches(filters.q.trim());
    const candidates = text ? text.map((i) => this.rows[i]) : this.rows;
    return candidates.filter(
      (row) =>
        (!filters.catalog || row.catalog === filters.catalog) &&
        (!filters.kind || row.kind === filters.kind) &&
        (!filters.country || row.country_code === filters.country) &&
        (!filters.state || stateOf(row, this.status) === filters.state)
    );
  }
}
