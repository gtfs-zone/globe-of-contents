/**
 * Links from a logical feed into the sibling apps. Each takes the first URL of
 * a role, which geometry-car orders best first.
 */

import { CONFIG } from '../config';
import type { Feed } from '../data/artifacts';
import { hasRealtime } from '../data/artifacts';

/** The editor needs a schedule and nothing else. */
export function editorUrl(feed: Feed): string | null {
  const scheduled = feed.urls.scheduled?.[0];
  return scheduled ? `${CONFIG.EDITOR_BASE}/#load=${encodeURIComponent(scheduled)}` : null;
}

/**
 * The visualizer draws realtime against a schedule, so it needs both. Without
 * a `cors` key it proxies both halves, which is the right guess for a catalog
 * URL.
 */
export function viewerUrl(feed: Feed): string | null {
  const scheduled = feed.urls.scheduled?.[0];
  if (!scheduled || !hasRealtime(feed)) {
    return null;
  }
  const params = new URLSearchParams({ scheduled });
  const vehicles = feed.urls.vehicles?.[0];
  const tripUpdates = feed.urls.trip_updates?.[0];
  const alerts = feed.urls.alerts?.[0];
  if (vehicles) params.set('rt_vp', vehicles);
  if (tripUpdates) params.set('rt_tu', tripUpdates);
  if (alerts) params.set('rt_al', alerts);
  return `${CONFIG.VIEWER_BASE}/#${params.toString()}`;
}
