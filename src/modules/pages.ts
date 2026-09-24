/**
 * The sidebar's three pages and their breadcrumb trail.
 *
 * Home is the filtered feed list, a Feed page is one logical feed with its
 * roles and member rows, and a Source page is one catalog row with its last
 * check. Links carry their page state in `data-nav`, and the few writes (the
 * status shortcuts, the guide links) in `data-action`; `PanelHost` delegates
 * both.
 */

import type { BreadcrumbItem } from 'interlocking/ui/breadcrumb-trail';
import { escapeHtml } from 'interlocking/util/escape-html';
import { CONFIG } from '../config';
import type { CatalogueIndex, Feed, Role, SourceRow, State } from '../data/artifacts';
import { ROLES, RT_ROLES, STATES, stateOf } from '../data/artifacts';
import type { PageState } from '../types/page-state';
import { editorUrl, viewerUrl } from './app-links';
import type { Filters } from './filters';
import {
  CATALOG_LABELS,
  KIND_LABELS,
  ROLE_LABELS,
  STATE_BADGE,
  STATE_LABELS,
  feedStatusLine,
  formatBytes,
  formatCount,
  formatDate,
  placeLine,
  statusLine,
} from './labels';

export interface PageContext {
  index: CatalogueIndex;
  /** Home's feeds: the current filters applied, in list order. */
  filtered: Feed[];
  filters: Filters;
  href: (state: PageState) => string;
}

const HOME: PageState = { type: 'home' };

const ROW_URL_FIELDS: [keyof SourceRow, Role][] = [
  ['scheduledUrl', 'scheduled'],
  ['vehiclesUrl', 'vehicles'],
  ['tripUpdatesUrl', 'trip_updates'],
  ['alertsUrl', 'alerts'],
];

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────

function feedCrumb(feed: Feed): BreadcrumbItem<PageState> {
  return { typeLabel: 'Feed', label: feed.name || feed.feedId, pageState: { type: 'feed', feed: feed.feedId } };
}

const HOME_CRUMB: BreadcrumbItem<PageState> = { typeLabel: 'list.gtfs.zone', label: 'All feeds', pageState: HOME };

export function buildBreadcrumbs(index: CatalogueIndex, state: PageState): BreadcrumbItem<PageState>[] {
  if (state.type === 'feed') {
    const feed = index.feed(state.feed);
    return feed ? [HOME_CRUMB, feedCrumb(feed)] : [];
  }
  if (state.type === 'source') {
    const row = index.row(state.source);
    if (!row) {
      return [];
    }
    const feed = index.feedOf(row.rowId);
    return [
      HOME_CRUMB,
      ...(feed ? [feedCrumb(feed)] : []),
      {
        typeLabel: `${CATALOG_LABELS[row.catalog] ?? row.catalog} source`,
        label: row.name || row.feedId,
        pageState: state,
      },
    ];
  }
  return [];
}

export function validateState(index: CatalogueIndex, state: PageState): boolean {
  if (state.type === 'feed') {
    return index.feed(state.feed) !== undefined;
  }
  if (state.type === 'source') {
    return index.row(state.source) !== undefined;
  }
  return true;
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

function navLink(ctx: PageContext, state: PageState, inner: string, cls: string): string {
  return `<a href="${escapeHtml(ctx.href(state))}" data-nav="${escapeHtml(JSON.stringify(state))}" class="${cls}">${inner}</a>`;
}

function stateBadge(state: State, size = ''): string {
  return `<span class="badge ${size} ${STATE_BADGE[state]}">${STATE_LABELS[state]}</span>`;
}

function field(label: string, value: string): string {
  return value
    ? `<tr><th class="font-normal opacity-60 align-top whitespace-nowrap pr-4">${label}</th><td class="break-all">${value}</td></tr>`
    : '';
}

function externalLink(url: string): string {
  const safe = escapeHtml(url);
  return /^https?:\/\//.test(url)
    ? `<a class="link" href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`
    : `<code>${safe}</code>`;
}

function guideLink(page: string, text: string): string {
  return `<button type="button" class="link" data-action="guide" data-arg="${page}">${text}</button>`;
}

function unplacedNote(): string {
  return `<span class="opacity-60">no coordinates, list only (${guideLink('unplaced', 'why?')})</span>`;
}

// ─── Home ─────────────────────────────────────────────────────────────────────

function renderStats(ctx: PageContext): string {
  const { feeds } = ctx.index.summary;
  const only = ctx.filters.status.length === 1 ? ctx.filters.status[0] : null;
  const stat = (label: string, value: number, cls: string, state: State | '') => {
    const active = state === '' ? ctx.filters.status.length === 0 : only === state;
    return `
      <button type="button" class="stat py-2 px-3 place-items-center ${active ? 'bg-base-300' : ''}"
        data-action="status" data-arg="${state}" aria-pressed="${active}">
        <div class="stat-title text-xs">${label}</div>
        <div class="stat-value text-lg ${cls}">${formatCount(value)}</div>
      </button>`;
  };
  return `
    <div class="stats stats-horizontal bg-base-200 w-full text-center">
      ${stat('Feeds', feeds.total, '', '')}
      ${STATES.map((state) =>
        stat(STATE_LABELS[state], feeds.by_state[state] ?? 0, state === 'up' ? 'text-success' : state === 'down' ? 'text-error' : 'opacity-60', state)
      ).join('')}
    </div>`;
}

function roleChips(feed: Feed): string {
  const chips: string[] = [];
  if (feed.urls.scheduled?.length) {
    chips.push('<span class="badge badge-xs badge-primary badge-soft">Schedule</span>');
  }
  if (RT_ROLES.some((role) => feed.urls[role]?.length)) {
    chips.push('<span class="badge badge-xs badge-secondary badge-soft">Realtime</span>');
  }
  return chips.join('');
}

function renderFeedRow(ctx: PageContext, feed: Feed): string {
  const place = placeLine(feed);
  const line = feedStatusLine(feed);
  const inner = `
    <span class="badge badge-xs ${STATE_BADGE[feed.state]} mt-1.5 shrink-0" title="${STATE_LABELS[feed.state]}"></span>
    <span class="min-w-0 flex-1">
      <span class="flex items-center gap-2">
        <span class="truncate font-medium text-sm">${escapeHtml(feed.name || feed.feedId)}</span>
        ${feed.lat === undefined ? '<span class="badge badge-outline badge-xs shrink-0" title="No coordinates">unplaced</span>' : ''}
      </span>
      ${place ? `<span class="block truncate text-xs opacity-70">${escapeHtml(place)}</span>` : ''}
      ${line ? `<span class="block truncate text-xs ${feed.state === 'down' ? 'text-error' : 'opacity-60'}">${escapeHtml(line)}</span>` : ''}
    </span>
    <span class="flex flex-col items-end gap-1 shrink-0">
      <span class="flex gap-1">${roleChips(feed)}</span>
      <span class="text-[10px] uppercase opacity-60">${feed.members.length} ${feed.members.length === 1 ? 'source' : 'sources'}</span>
    </span>`;
  return navLink(
    ctx,
    { type: 'feed', feed: feed.feedId },
    inner,
    'flex items-start gap-3 px-3 py-2 border-b border-base-200 last:border-0 hover:bg-base-200'
  );
}

function renderHome(ctx: PageContext): string {
  const feeds = ctx.filtered;
  const shown = feeds.slice(0, CONFIG.DISPLAY_CAP);
  const hidden = feeds.length - shown.length;
  const unplaced = feeds.reduce((n, feed) => (feed.lat === undefined ? n + 1 : n), 0);

  const count =
    `<span class="font-semibold">${formatCount(feeds.length)}</span> matching` +
    (hidden > 0 ? `, first ${formatCount(shown.length)} shown` : '') +
    (unplaced > 0
      ? ` <span class="opacity-60">(${formatCount(unplaced)} have no coordinates and are not on the map)</span>`
      : '');

  const list =
    feeds.length === 0
      ? '<p class="text-base-content/50 text-sm text-center py-8">No feeds match these filters</p>'
      : `<div class="rounded-box border border-base-300 bg-base-100">${shown.map((feed) => renderFeedRow(ctx, feed)).join('')}</div>` +
        (hidden > 0
          ? `<p class="text-xs text-center opacity-60 py-2">${formatCount(hidden)} more; narrow the search to see them</p>`
          : '');

  return `
    ${renderStats(ctx)}
    <div class="text-xs">${count}</div>
    ${list}`;
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

function renderRole(feed: Feed, role: Role): string {
  const urls = feed.urls[role] ?? [];
  const state = feed.roleState[role] ?? 'unknown';
  const auth = feed.auth?.includes(role);
  const [first, ...rest] = urls;
  return `
    <div class="flex flex-col gap-1 py-2 border-b border-base-200 last:border-0">
      <div class="flex items-center gap-2">
        <span class="font-medium text-sm">${ROLE_LABELS[role]}</span>
        ${stateBadge(state, 'badge-sm')}
        ${auth ? '<span class="badge badge-sm badge-outline">needs an API key</span>' : ''}
      </div>
      ${first ? `<div class="text-xs break-all">${externalLink(first)}</div>` : ''}
      ${
        rest.length > 0
          ? `<details class="text-xs" data-detail="${role}-alt"><summary class="cursor-pointer opacity-60">${rest.length} more ${rest.length === 1 ? 'URL' : 'URLs'} from other catalogs</summary>
               <ul class="mt-1 flex flex-col gap-1 break-all">${rest.map((url) => `<li>${externalLink(url)}</li>`).join('')}</ul>
             </details>`
          : ''
      }
    </div>`;
}

function renderMember(ctx: PageContext, row: SourceRow): string {
  const state = stateOf(row, ctx.index.status);
  const inner = `
    <span class="badge badge-xs ${STATE_BADGE[state]} mt-1.5 shrink-0" title="${STATE_LABELS[state]}"></span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm">${escapeHtml(row.name || row.feedId)}</span>
      <span class="block truncate text-xs opacity-60">${escapeHtml(CATALOG_LABELS[row.catalog] ?? row.catalog)} <code>${escapeHtml(row.feedId)}</code></span>
    </span>
    <span class="badge badge-sm ${row.kind === 'rt' ? 'badge-secondary' : 'badge-primary'} badge-soft shrink-0">${KIND_LABELS[row.kind]}</span>`;
  return navLink(
    ctx,
    { type: 'source', source: row.rowId },
    inner,
    'flex items-start gap-3 px-3 py-2 border-b border-base-200 last:border-0 hover:bg-base-200'
  );
}

function renderFeed(ctx: PageContext, feed: Feed): string {
  const edit = editorUrl(feed);
  const view = viewerUrl(feed);
  const line = feedStatusLine(feed);
  const place = placeLine(feed);
  const roles = ROLES.filter((role) => feed.urls[role]?.length);
  const members = ctx.index.membersOf(feed);

  const buttons = [
    edit
      ? `<a class="btn btn-sm btn-primary" href="${escapeHtml(edit)}" target="_blank" rel="noopener noreferrer">Open in editor</a>`
      : '',
    view
      ? `<a class="btn btn-sm btn-secondary" href="${escapeHtml(view)}" target="_blank" rel="noopener noreferrer">Open in visualizer</a>`
      : '',
  ].join('');

  return `
    <div class="flex flex-wrap items-center gap-2">
      ${stateBadge(feed.state)}
      ${line ? `<span class="text-sm ${feed.state === 'down' ? 'text-error' : 'opacity-70'}">${escapeHtml(line)}</span>` : ''}
      ${feed.state === 'up' && feed.since ? `<span class="text-sm opacity-70">up since ${formatDate(feed.since)}</span>` : ''}
    </div>
    ${buttons ? `<div class="flex flex-wrap gap-2">${buttons}</div>` : ''}
    <table class="table table-sm">
      <tbody>
        ${field('Place', place ? escapeHtml(place) : unplacedNote())}
        ${field('Schedule size', feed.staticBytes !== undefined ? formatBytes(feed.staticBytes) : '')}
        ${field('Last modified', formatDate(feed.lastModified))}
        ${field('Feed id', `<code>${escapeHtml(feed.feedId)}</code>`)}
      </tbody>
    </table>
    <section>
      <h3 class="text-xs uppercase tracking-wide opacity-50 mb-1">Roles</h3>
      ${roles.map((role) => renderRole(feed, role)).join('')}
    </section>
    <section>
      <h3 class="text-xs uppercase tracking-wide opacity-50 mb-1">
        ${members.length} catalog ${members.length === 1 ? 'source' : 'sources'} (${guideLink('merging', 'how feeds are merged')})
      </h3>
      <div class="rounded-box border border-base-300 bg-base-100">${members.map((row) => renderMember(ctx, row)).join('')}</div>
    </section>`;
}

// ─── Source ───────────────────────────────────────────────────────────────────

function renderSource(ctx: PageContext, row: SourceRow): string {
  const entry = ctx.index.status[row.rowId];
  const state = stateOf(row, ctx.index.status);
  const line = statusLine(row, state, entry);
  const place = placeLine(row);

  const urls = ROW_URL_FIELDS.map(([key, role]) => {
    const url = row[key];
    return typeof url === 'string' ? field(ROLE_LABELS[role], externalLink(url)) : '';
  }).join('');

  // geometry-car only sets final_url when it differs from the URL checked.
  const redirect = entry?.final_url
    ? field(
        'Redirects to',
        `${externalLink(entry.final_url)}<div class="text-xs opacity-60">the catalog entry points at a redirect</div>`
      )
    : '';

  const same = (row.same_endpoint_as ?? [])
    .map((id) => {
      const other = ctx.index.row(id);
      if (!other) {
        return `<code>${escapeHtml(id)}</code>`;
      }
      const label = `${other.name || other.feedId} (${CATALOG_LABELS[other.catalog] ?? other.catalog})`;
      return navLink(ctx, { type: 'source', source: id }, escapeHtml(label), 'link');
    })
    .join('<br>');

  return `
    <div class="flex flex-wrap items-center gap-2">
      ${stateBadge(state)}
      <span class="badge badge-outline">${KIND_LABELS[row.kind]}</span>
      <span class="badge badge-outline">${escapeHtml(CATALOG_LABELS[row.catalog] ?? row.catalog)}</span>
      ${line ? `<span class="text-sm ${state === 'down' ? 'text-error' : 'opacity-70'}">${escapeHtml(line)}</span>` : ''}
    </div>
    ${row.note ? `<div class="alert alert-info alert-soft text-sm whitespace-pre-line">${escapeHtml(row.note)}</div>` : ''}
    <table class="table table-sm">
      <tbody>
        ${field('Operator', escapeHtml(row.operator_name))}
        ${field('Place', place ? escapeHtml(place) : unplacedNote())}
        ${field('Catalog id', `<code>${escapeHtml(row.feedId)}</code>`)}
        ${field('From', escapeHtml(row.source))}
        ${field('Catalog status', escapeHtml(row.feed_status ?? ''))}
        ${field('License', row.license_url ? externalLink(row.license_url) : '')}
        ${field('Same endpoint as', same)}
      </tbody>
    </table>
    <section>
      <h3 class="text-xs uppercase tracking-wide opacity-50 mb-1">URLs</h3>
      <table class="table table-sm"><tbody>${urls}${redirect}</tbody></table>
    </section>
    <section>
      <h3 class="text-xs uppercase tracking-wide opacity-50 mb-1">Last check (${guideLink('states', 'what this means')})</h3>
      <table class="table table-sm">
        <tbody>
          ${field('State', stateBadge(state, 'badge-sm'))}
          ${field('HTTP status', entry?.code ? String(entry.code) : '')}
          ${field('Error', escapeHtml(entry?.error ?? ''))}
          ${field('Latency', entry?.latency_ms !== undefined ? `${entry.latency_ms} ms` : '')}
          ${field('Failed checks in a row', entry?.failures ? String(entry.failures) : '')}
          ${field(state === 'down' ? 'Down since' : 'In this state since', formatDate(entry?.since))}
          ${field('Access', row.auth ? 'needs an API key; not checked' : '')}
        </tbody>
      </table>
    </section>`;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export function renderPage(ctx: PageContext, state: PageState): string {
  if (state.type === 'feed') {
    const feed = ctx.index.feed(state.feed);
    return feed ? renderFeed(ctx, feed) : '';
  }
  if (state.type === 'source') {
    const row = ctx.index.row(state.source);
    return row ? renderSource(ctx, row) : '';
  }
  return renderHome(ctx);
}

/** What a page puts on the map: the feed, or the row's own place, else its feed's. */
export function placeFor(index: CatalogueIndex, state: PageState): Feed | SourceRow | null {
  if (state.type === 'feed') {
    return index.feed(state.feed) ?? null;
  }
  if (state.type === 'source') {
    const row = index.row(state.source);
    if (!row) {
      return null;
    }
    return row.lat !== undefined ? row : (index.feedOf(row.rowId) ?? null);
  }
  return null;
}
