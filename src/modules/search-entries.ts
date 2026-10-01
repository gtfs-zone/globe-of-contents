/**
 * The search dropdown's entries: one per logical feed, matched on
 * gtfs-zone-web-common's feed haystack, so the dropdown, the list's live filter and
 * the other apps' pickers agree on what a query finds.
 */

import { feedHaystack } from 'gtfs-zone-web-common/gtfs/feed-search';
import type { PlacePayload } from 'gtfs-zone-web-common/map/place-search';
import { dotMarker } from 'gtfs-zone-web-common/ui/search-controller';
import type { SearchEntry } from 'gtfs-zone-web-common/ui/search-controller';
import { resolveThemeColor } from 'gtfs-zone-web-common/util/theme-color';
import { CONFIG } from '../config';
import type { Feed, State } from '../data/artifacts';
import { hasRealtime } from '../data/artifacts';
import type { Filters } from './filters';
import { feedPlaceLine } from './labels';

/** A search pick: a feed by id, or a place from the remote search. */
export type SearchPayload = { kind: 'feed'; feedId: string } | PlacePayload;

const STATE_TOKENS: Record<State, string | null> = {
  up: '--color-success',
  partial: '--color-warning',
  down: '--color-error',
  unknown: null,
};

function stateColor(state: State): string {
  const token = STATE_TOKENS[state];
  const fallback = CONFIG.STATE_COLOR_FALLBACK[state];
  return token ? resolveThemeColor(token, fallback) : fallback;
}

export class SearchEntries {
  private feeds: Feed[];
  private haystack: string[];

  constructor(feeds: Feed[]) {
    this.feeds = feeds;
    this.haystack = feeds.map(feedHaystack);
  }

  /** Entries for the feeds the chips let through; the text match is the controller's. */
  build(filters: Filters): SearchEntry<SearchPayload>[] {
    const states = new Set(filters.status);
    const entries: SearchEntry<SearchPayload>[] = [];
    this.feeds.forEach((feed, i) => {
      if (
        (states.size > 0 && !states.has(feed.state)) ||
        (filters.rt && !hasRealtime(feed))
      ) {
        return;
      }
      entries.push({
        payload: { kind: 'feed', feedId: feed.feedId },
        icon: dotMarker(stateColor(feed.state)),
        primary: feed.name || feed.feedId,
        secondary:
          [feed.subtitle, feedPlaceLine(feed)].filter(Boolean).join(', ') ||
          undefined,
        haystack: this.haystack[i],
      });
    });
    return entries;
  }
}
