/**
 * The sidebar's three pages and their breadcrumb trail.
 *
 * Home is the filtered feed list, a Feed page is one logical feed with its
 * roles and member rows, and a Source page is one catalog row with its last
 * check. Links carry their page state in `data-nav`, and the few writes (the
 * status and realtime shortcuts, the guide links) in `data-action`; `PanelHost`
 * delegates both.
 */

import { feedStateBadge, roleChip, roleChips } from 'interlocking/gtfs/feed-badges';
import type { BreadcrumbItem } from 'interlocking/ui/breadcrumb-trail';
import { TOOLTIP_TRIGGER_CLASS, renderTooltipTrigger, tooltipContentAttr } from 'interlocking/ui/field-label';
import { escapeHtml } from 'interlocking/util/escape-html';
import { CONFIG } from '../config';
import type { CatalogueIndex, Feed, Role, RoleState, SourceRow, State } from '../data/artifacts';
import { ROLES, STATES, stateOf } from '../data/artifacts';
import type { PageState } from '../types/page-state';
import { editorUrl, viewerUrl } from './app-links';
import type { Filters, Near } from './filters';
import {
  CATALOG_LABELS,
  FIELD_HINTS,
  contentLine,
  KIND_LABELS,
  ROLE_LABELS,
  STATE_BADGE,
  STATE_LABELS,
  catalogUrl,
  feedPlaceLine,
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
  /** Whether fetching the rows and their checks failed. */
  detailFailed: boolean;
  /** The picked place Home is sorted by distance from. */
  near: Near | null;
}

const HOME: PageState = { type: 'home' };

const ROW_URL_FIELDS: [keyof SourceRow, Role][] = [
  ['scheduledUrl', 'scheduled'],
  ['vehiclesUrl', 'vehicles'],
  ['tripUpdatesUrl', 'trip_updates'],
  ['alertsUrl', 'alerts'],
  ['realtimeUrl', 'realtime'],
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

function stateBadge(state: State | RoleState, size = ''): string {
  return `<span class="badge ${size} ${STATE_BADGE[state]}">${STATE_LABELS[state]}</span>`;
}

const HINTED_LABEL = 'underline decoration-dotted underline-offset-2 cursor-help';

/** A field's label, with its hover text from `FIELD_HINTS` when it has one. */
function fieldLabel(label: string): string {
  const hint = FIELD_HINTS[label];
  return hint ? renderTooltipTrigger(hint, `<span class="${HINTED_LABEL}">${label}</span>`) : label;
}

function field(label: string, value: string, labelHtml = fieldLabel(label)): string {
  return value
    ? `<tr><th class="font-normal opacity-60 align-top whitespace-nowrap pr-4">${labelHtml}</th><td class="break-all">${value}</td></tr>`
    : '';
}

// The State label explains itself on hover and opens the guide on click.
const STATE_FIELD_LABEL = `<button type="button" class="${TOOLTIP_TRIGGER_CLASS} ${HINTED_LABEL}" data-action="guide" data-arg="states" ${tooltipContentAttr(FIELD_HINTS.State)}>State</button>`;

function externalLink(url: string): string {
  const safe = escapeHtml(url);
  return /^https?:\/\//.test(url)
    ? `<a class="link" href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`
    : `<code>${safe}</code>`;
}

/** A row's catalog id, linked to the catalog's page for it when there is one. */
function catalogId(row: SourceRow): string {
  const id = `<code>${escapeHtml(row.feedId)}</code>`;
  const url = catalogUrl(row);
  return url ? `<a class="link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${id}</a>` : id;
}

function guideLink(page: string, text: string): string {
  return `<button type="button" class="link" data-action="guide" data-arg="${page}">${text}</button>`;
}

/** Stands in for what the rows and their checks draw until they are in. */
function detailPending(ctx: PageContext): string {
  return ctx.detailFailed
    ? `<p class="text-xs text-error py-2">The catalog sources did not load. <button type="button" class="link" data-action="detail-retry">Retry</button></p>`
    : '<p class="text-xs opacity-60 py-2">Loading the catalog sources...</p>';
}

function unplacedNote(): string {
  return `<span class="opacity-60">no coordinates, list only (${guideLink('unplaced', 'why?')})</span>`;
}

// ─── Home ─────────────────────────────────────────────────────────────────────

const STATE_TEXT: Record<State, string> = {
  up: 'text-success',
  partial: 'text-warning',
  down: 'text-error',
  unknown: 'opacity-60',
};

// The status line under a feed's name: only a problem is coloured.
const LINE_CLASS: Record<State, string> = {
  up: 'opacity-60',
  partial: 'text-warning',
  down: 'text-error',
  unknown: 'opacity-60',
};

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
  const rt = ctx.filters.rt;
  return `
    <div class="stats stats-horizontal bg-base-200 w-full text-center">
      ${stat('Feeds', feeds.total, '', '')}
      ${STATES.map((state) =>
        stat(STATE_LABELS[state], feeds.by_state[state] ?? 0, STATE_TEXT[state], state)
      ).join('')}
    </div>
    <label class="flex items-center gap-2 text-xs cursor-pointer">
      <input type="checkbox" class="toggle toggle-xs" data-action="rt" ${rt ? 'checked' : ''} />
      Only feeds with realtime
    </label>`;
}

function renderFeedRow(ctx: PageContext, feed: Feed): string {
  const place = [feed.subtitle, feedPlaceLine(feed)].filter(Boolean).join(', ');
  const line = feedStatusLine(feed);
  const count = feed.members.length;
  const inner = `
    <span class="badge badge-xs ${STATE_BADGE[feed.state]} mt-1.5 shrink-0" title="${STATE_LABELS[feed.state]}"></span>
    <span class="min-w-0 flex-1">
      <span class="flex items-center gap-2">
        <span class="truncate font-medium text-sm">${escapeHtml(feed.name || feed.feedId)}</span>
        ${feed.lat === undefined ? '<span class="badge badge-outline badge-xs shrink-0" title="No coordinates">unplaced</span>' : ''}
      </span>
      ${place ? `<span class="block truncate text-xs opacity-70">${escapeHtml(place)}</span>` : ''}
      ${line ? `<span class="block truncate text-xs ${LINE_CLASS[feed.state]}">${escapeHtml(line)}</span>` : ''}
    </span>
    <span class="flex flex-col items-end gap-1 shrink-0">
      <span class="flex gap-1">${roleChips(feed)}</span>
      ${ctx.index.hasDetail ? `<span class="text-[10px] uppercase opacity-60">${count} ${count === 1 ? 'source' : 'sources'}</span>` : ''}
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
    (feeds.length > 1 && !ctx.near && !ctx.filters.q.trim() ? ', newest schedule first' : '') +
    (feeds.length > 1 && ctx.near ? ', nearest first' : '') +
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

  const near = ctx.near
    ? `<div><button type="button" class="badge badge-outline gap-1" data-action="clear-near" title="Stop sorting by distance">
         <span aria-hidden="true">x</span> Near ${escapeHtml(ctx.near.name)}
       </button></div>`
    : '';

  return `
    ${renderStats(ctx)}
    ${near}
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

/** A realtime row's roles, one chip per URL it lists, in its row's state. */
function rowRoleChips(row: SourceRow, state: RoleState): string {
  return ROW_URL_FIELDS.filter(([key, role]) => role !== 'scheduled' && row[key])
    .map(([, role]) => roleChip(role, state, 'sm'))
    .join('');
}

function renderMember(ctx: PageContext, row: SourceRow): string {
  const state = stateOf(row, ctx.index.status);
  const kind =
    row.kind === 'rt'
      ? `<span class="flex gap-1 shrink-0">${rowRoleChips(row, state)}</span>`
      : `<span class="badge badge-sm badge-primary badge-soft shrink-0">${KIND_LABELS[row.kind]}</span>`;
  const inner = `
    <span class="badge badge-xs ${STATE_BADGE[state]} mt-1.5 shrink-0" title="${STATE_LABELS[state]}"></span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm">${escapeHtml(row.name || row.feedId)}</span>
      <span class="block truncate text-xs opacity-60">${escapeHtml(CATALOG_LABELS[row.catalog] ?? row.catalog)} <code>${escapeHtml(row.feedId)}</code></span>
    </span>
    ${kind}`;
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
  const place = feedPlaceLine(feed);
  const roles = ROLES.filter((role) => feed.urls[role]?.length);
  const members = ctx.index.membersOf(feed);
  const sources = ctx.index.hasDetail
    ? `${members.length} catalog ${members.length === 1 ? 'source' : 'sources'}`
    : 'Catalog sources';
  const content = feed.content;
  const contentBad = content !== undefined && content.state !== 'ok';

  const buttons = [
    edit
      ? `<a class="btn btn-sm btn-primary" href="${escapeHtml(edit)}" target="_blank" rel="noopener noreferrer">Open in editor</a>`
      : '',
    view
      ? `<a class="btn btn-sm btn-secondary" href="${escapeHtml(view)}" target="_blank" rel="noopener noreferrer">Open in visualizer</a>`
      : '',
  ].join('');

  return `
    ${feed.subtitle ? `<p class="text-sm opacity-70">${escapeHtml(feed.subtitle)}</p>` : ''}
    <div class="flex flex-wrap items-center gap-2">
      ${feedStateBadge(feed.state, feed.since, 'md')}
      ${roleChips(feed, 'sm')}
      ${line ? `<span class="text-sm ${LINE_CLASS[feed.state]}">${escapeHtml(line)}</span>` : ''}
      ${feed.state === 'up' && feed.since ? `<span class="text-sm opacity-70">up since ${formatDate(feed.since)}</span>` : ''}
      ${contentBad ? `<span class="badge badge-warning">${escapeHtml(contentLine(content))}</span>` : ''}
    </div>
    ${buttons ? `<div class="flex flex-wrap gap-2">${buttons}</div>` : ''}
    <table class="table table-sm">
      <tbody>
        ${field('Place', place ? escapeHtml(place) : unplacedNote())}
        ${field('Also known as', escapeHtml(feed.altNames.join(', ')))}
        ${field('Schedule size', feed.staticBytes !== undefined ? formatBytes(feed.staticBytes) : '')}
        ${field('Last modified', formatDate(feed.lastModified))}
        ${content ? field('Schedule contents', `${escapeHtml(contentLine(content))}, since ${formatDate(content.since)}`) : ''}
        ${field('Service', content?.serviceStart && content.serviceEnd ? `${formatDate(content.serviceStart)} to ${formatDate(content.serviceEnd)}` : '')}
        ${field('Publisher', escapeHtml(content?.publisher ?? ''))}
        ${field('Version', escapeHtml(content?.version ?? ''))}
        ${field('Contents', content?.routes !== undefined ? `${formatCount(content.routes)} routes, ${formatCount(content.stops ?? 0)} stops, ${formatCount(content.trips ?? 0)} trips` : '')}
        ${field('Feed id', `<code>${escapeHtml(feed.feedId)}</code>`)}
      </tbody>
    </table>
    <section>
      <h3 class="text-xs uppercase tracking-wide opacity-50 mb-1">Roles</h3>
      ${roles.map((role) => renderRole(feed, role)).join('')}
    </section>
    <section>
      <h3 class="text-xs uppercase tracking-wide opacity-50 mb-1">
        ${sources} (${guideLink('merging', 'how feeds are merged')})
      </h3>
      ${
        ctx.index.hasDetail
          ? `<div class="rounded-box border border-base-300 bg-base-100">${members.map((row) => renderMember(ctx, row)).join('')}</div>`
          : detailPending(ctx)
      }
    </section>`;
}

// ─── Source ───────────────────────────────────────────────────────────────────

function catalogBadge(row: SourceRow): string {
  const label = escapeHtml(CATALOG_LABELS[row.catalog] ?? row.catalog);
  const url = catalogUrl(row);
  return url
    ? `<a class="badge badge-outline hover:badge-neutral" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
    : `<span class="badge badge-outline">${label}</span>`;
}

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
      ${catalogBadge(row)}
      ${row.kind === 'rt' ? rowRoleChips(row, state) : ''}
      ${line ? `<span class="text-sm ${state === 'down' ? 'text-error' : 'opacity-70'}">${escapeHtml(line)}</span>` : ''}
    </div>
    <table class="table table-sm">
      <tbody>
        ${field('Operator', escapeHtml(row.operator_name))}
        ${field('Place', place ? escapeHtml(place) : unplacedNote())}
        ${field('Catalog id', catalogId(row))}
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
      <h3 class="text-xs uppercase tracking-wide opacity-50 mb-1">Last check</h3>
      <table class="table table-sm">
        <tbody>
          ${field('State', stateBadge(state, 'badge-sm'), STATE_FIELD_LABEL)}
          ${field('HTTP status', entry?.code ? String(entry.code) : '')}
          ${field('Error', escapeHtml(entry?.error ?? ''))}
          ${field('Latency', entry?.latency_ms !== undefined ? `${entry.latency_ms} ms` : '')}
          ${field('Failed checks in a row', entry?.failures ? String(entry.failures) : '')}
          ${field(state === 'down' ? 'Down since' : 'In this state since', formatDate(entry?.since))}
          ${field('Access', row.auth ? 'needs an API key' : '')}
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
    if (!ctx.index.hasDetail) {
      return detailPending(ctx);
    }
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
