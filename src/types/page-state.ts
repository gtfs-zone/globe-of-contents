/**
 * The pages the sidebar shows: Home (the filtered feed list), one logical
 * feed, or one catalog row. Hash-routed as `feed=` / `source=`.
 */

export type PageState =
  | { type: 'home' }
  | { type: 'feed'; feed: string }
  | { type: 'source'; source: string };

export function isPageState(value: unknown): value is PageState {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const state = value as Record<string, unknown>;
  const keys = Object.keys(state).length;
  switch (state.type) {
    case 'home':
      return keys === 1;
    case 'feed':
      return keys === 2 && typeof state.feed === 'string';
    case 'source':
      return keys === 2 && typeof state.source === 'string';
    default:
      return false;
  }
}

/** Hash keys the page half owns; everything else in the hash is a filter. */
export const PAGE_KEYS = ['feed', 'source'];

export function pageToParams(state: PageState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.type === 'feed') {
    params.set('feed', state.feed);
  } else if (state.type === 'source') {
    params.set('source', state.source);
  }
  return params;
}

/** The deepest page the params name. */
export function pageFromParams(params: URLSearchParams): PageState {
  const source = params.get('source');
  if (source) {
    return { type: 'source', source };
  }
  const feed = params.get('feed');
  if (feed) {
    return { type: 'feed', feed };
  }
  return { type: 'home' };
}
