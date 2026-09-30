/**
 * Links from a logical feed into the sibling apps. Each takes the first URL of
 * a role, which geometry-car orders best first.
 */

import { realtimeSlots } from 'interlocking/gtfs/feed-catalog';
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
 * URL. An endpoint of undeclared type takes the first empty slot, as in
 * geometry-car's viewer link.
 */
export function viewerUrl(feed: Feed): string | null {
  const scheduled = feed.urls.scheduled?.[0];
  if (!scheduled || !hasRealtime(feed)) {
    return null;
  }
  const params = new URLSearchParams({ scheduled });
  const slots = realtimeSlots(feed);
  if (slots.vehiclesUrl) params.set('rt_vp', slots.vehiclesUrl);
  if (slots.tripUpdatesUrl) params.set('rt_tu', slots.tripUpdatesUrl);
  if (slots.alertsUrl) params.set('rt_al', slots.alertsUrl);
  return `${CONFIG.VIEWER_BASE}/#${params.toString()}`;
}
