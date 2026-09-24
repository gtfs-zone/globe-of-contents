/**
 * Application-wide configuration constants.
 * All magic numbers and URLs live here; import CONFIG rather than inlining literals.
 */
export const CONFIG = Object.freeze({
  // Where geometry-car publishes. Always a different origin from this app: the
  // artifacts refresh daily, and this origin's nginx caches `.json` as
  // immutable for a year. Dev reads the public bucket too, since the local
  // Garage in music-student has no web endpoint; VITE_DATA_BASE points it at
  // anything else serving the same files.
  DATA_BASE: import.meta.env.DEV
    ? (import.meta.env.VITE_DATA_BASE ?? 'https://data.gtfs.zone')
    : 'https://data.gtfs.zone',

  // Rows painted into the list at once. The filtered set can be tens of
  // thousands; the count above the list says how many are hidden.
  DISPLAY_CAP: 200,

  // Debounce for the search box's live filter of the list and the map.
  FILTER_DEBOUNCE_MS: 150,

  // Entries in the search box's dropdown.
  SEARCH_LIMIT: 20,

  // Map clustering. Radius in pixels; above CLUSTER_MAX_ZOOM every placed feed
  // draws on its own.
  CLUSTER_RADIUS: 45,
  CLUSTER_MAX_ZOOM: 9,

  // Initial camera when there is no saved view: the whole globe.
  DEFAULT_CENTER: [0, 20] as [number, number],
  DEFAULT_ZOOM: 1.4,

  // Zoom used when focusing a feed with a point but no bounding box.
  FEED_FOCUS_ZOOM: 9,
  FOCUS_DURATION: 1500,

  // Map colours per reachability state, used when a theme token cannot be
  // resolved. The live values come from the daisyUI palette.
  STATE_COLOR_FALLBACK: {
    up: '#22c55e',
    down: '#ef4444',
    unknown: '#94a3b8',
  },

  // Per-device preferences, gc.-namespaced so they never collide with a
  // sibling app on another subdomain sharing the same browser profile. The
  // `theme` key is deliberately not here: it stays un-namespaced so the moon
  // toggle agrees across every gtfs.zone site.
  MAP_VIEW_KEY: 'gc.map.view',
  MAP_APPEARANCE_KEY: 'gc.map.appearance',
  FILTERS_KEY: 'gc.filters',
  MAP_VIEW_SAVE_DEBOUNCE: 400,

  // Sibling apps a feed can be opened in. Hardcoded to prod on purpose, as in
  // test-track: a shared link should always land on the stable public app.
  EDITOR_BASE: 'https://edit.gtfs.zone',
  VIEWER_BASE: 'https://viz.rt.gtfs.zone',
});
