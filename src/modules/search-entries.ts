/**
 * The search dropdown's entries: one per logical feed, matched on the same
 * haystack as the list's live filter, so the two agree on what a query finds.
 */

import { dotMarker } from 'interlocking/ui/search-controller';
import type { SearchEntry } from 'interlocking/ui/search-controller';
import { resolveThemeColor } from 'interlocking/util/theme-color';
import { CONFIG } from '../config';
import type { CatalogueIndex, Feed, State } from '../data/artifacts';
import { hasRealtime } from '../data/artifacts';
import type { Filters } from './filters';
import { placeLine } from './labels';

function stateColor(state: State): string {
  if (state === 'up') {
    return resolveThemeColor('--color-success', CONFIG.STATE_COLOR_FALLBACK.up);
  }
  if (state === 'down') {
    return resolveThemeColor('--color-error', CONFIG.STATE_COLOR_FALLBACK.down);
  }
  return CONFIG.STATE_COLOR_FALLBACK.unknown;
}

export class SearchEntries {
  private feeds: Feed[];
  private haystack: string[];

  constructor(index: CatalogueIndex, haystack: string[]) {
    this.feeds = index.feeds;
    this.haystack = haystack;
  }

  /** Entries for the feeds the chips let through; the text match is the controller's. */
  build(filters: Filters): SearchEntry<string>[] {
    const states = new Set(filters.status);
    const entries: SearchEntry<string>[] = [];
    this.feeds.forEach((feed, i) => {
      if ((states.size > 0 && !states.has(feed.state)) || (filters.rt && !hasRealtime(feed))) {
        return;
      }
      entries.push({
        payload: feed.feedId,
        icon: dotMarker(stateColor(feed.state)),
        primary: feed.name || feed.feedId,
        secondary: placeLine(feed) || undefined,
        haystack: this.haystack[i],
      });
    });
    return entries;
  }
}
