/**
 * The sidebar's three pages and their breadcrumb trail.
 *
 * Home is the filtered feed list, a Feed page is one logical feed with its
 * roles and member rows, and a Source page is one catalog row with its last
 * check. Links carry their page state in `data-nav`, and the few writes (the
 * status and realtime shortcuts, the guide links) in `data-action`; `PanelHost`
 * delegates both.
 */

import {
  feedStateBadge,
  roleChip,
  roleChips,
} from 'gtfs-zone-web-common/gtfs/feed-badges';
import type { BreadcrumbItem } from 'gtfs-zone-web-common/ui/breadcrumb-trail';
import {
  TOOLTIP_TRIGGER_CLASS,
  renderTooltipTrigger,
  tooltipContentAttr,
} from 'gtfs-zone-web-common/ui/field-label';
import { escapeHtml } from 'gtfs-zone-web-common/util/escape-html';
import { CONFIG } from '../config';
import type {
  CatalogueIndex,
  Feed,
  Role,
  RoleState,
  SourceRow,
  State,
} from '../data/artifacts';
import { ROLES, STATES, stateOf } from '../data/artifacts';
import { t } from '../i18n/messages';
import type { PageState } from '../types/page-state';
import { editorUrl, viewerUrl } from './app-links';
import type { Filters, Near } from './filters';
import {
  CATALOG_LABELS,
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
  formatMs,
  placeLine,
  statusLine,
  type FieldName,
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
  return {
    typeLabel: t('crumb.feed'),
    label: feed.name || feed.feedId,
    pageState: { type: 'feed', feed: feed.feedId },
  };
}

const HOME_CRUMB: BreadcrumbItem<PageState> = {
  typeLabel: 'list.gtfs.zone',
  label: t('crumb.allFeeds'),
  pageState: HOME,
};

export function buildBreadcrumbs(
  index: CatalogueIndex,
  state: PageState
): BreadcrumbItem<PageState>[] {
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
        typeLabel: t('crumb.source', {
          catalog: CATALOG_LABELS[row.catalog] ?? row.catalog,
        }),
        label: row.name || row.feedId,
        pageState: state,
      },
    ];
  }
  return [];
}

export function validateState(
  index: CatalogueIndex,
  state: PageState
): boolean {
  if (state.type === 'feed') {
    return index.feed(state.feed) !== undefined;
  }
  if (state.type === 'source') {
    return index.row(state.source) !== undefined;
  }
  return true;
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

function navLink(
  ctx: PageContext,
  state: PageState,
  inner: string,
  cls: string
): string {
  return `<a href="${escapeHtml(ctx.href(state))}" data-nav="${escapeHtml(JSON.stringify(state))}" class="${cls}">${inner}</a>`;
}

function stateBadge(state: State | RoleState, size = ''): string {
  return `<span class="badge ${size} ${STATE_BADGE[state]}">${STATE_LABELS[state]}</span>`;
}

const HINTED_LABEL =
  'underline decoration-dotted underline-offset-2 cursor-help';

/** A field's label, with its hover text. */
function fieldLabel(name: FieldName): string {
  return renderTooltipTrigger(
    t(`hint.${name}`),
    `<span class="${HINTED_LABEL}">${t(`field.${name}`)}</span>`
  );
}

function field(
  name: FieldName,
  value: string,
  labelHtml = fieldLabel(name)
): string {
  return labeledRow(labelHtml, value);
}

function labeledRow(labelHtml: string, value: string): string {
  return value
    ? `<tr><th class="font-normal opacity-60 align-top whitespace-nowrap pr-4">${labelHtml}</th><td class="break-all">${value}</td></tr>`
    : '';
}

// The State label explains itself on hover and opens the guide on click.
const STATE_FIELD_LABEL = `<button type="button" class="${TOOLTIP_TRIGGER_CLASS} ${HINTED_LABEL}" data-action="guide" data-arg="states" ${tooltipContentAttr(t('hint.state'))}>${t('field.state')}</button>`;

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
  return url
    ? `<a class="link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${id}</a>`
    : id;
}

function guideLink(page: string, text: string): string {
  return `<button type="button" class="link" data-action="guide" data-arg="${page}">${text}</button>`;
}

/** Stands in for what the rows and their checks draw until they are in. */
function detailPending(ctx: PageContext): string {
  return ctx.detailFailed
    ? `<p class="text-xs text-error py-2">${t('detail.failed')} <button type="button" class="link" data-action="detail-retry">${t('boot.retry')}</button></p>`
    : `<p class="text-xs opacity-60 py-2">${t('detail.loading')}</p>`;
}

function unplacedNote(): string {
  const why = guideLink('unplaced', t('unplaced.why'));
  return `<span class="opacity-60">${t('unplaced.note', { why })}</span>`;
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
  const stat = (
    label: string,
    value: number,
    cls: string,
    state: State | ''
  ) => {
    const active =
      state === '' ? ctx.filters.status.length === 0 : only === state;
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
      ${stat(t('home.feeds'), feeds.total, '', '')}
      ${STATES.map((state) =>
        stat(
          STATE_LABELS[state],
          feeds.by_state[state] ?? 0,
          STATE_TEXT[state],
          state
        )
      ).join('')}
    </div>
    <label class="flex items-center gap-2 text-xs cursor-pointer">
      <input type="checkbox" class="toggle toggle-xs" data-action="rt" ${rt ? 'checked' : ''} />
      ${t('home.onlyRealtime')}
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
        ${feed.lat === undefined ? `<span class="badge badge-outline badge-xs shrink-0" title="${t('unplaced.title')}">${t('unplaced.badge')}</span>` : ''}
      </span>
      ${place ? `<span class="block truncate text-xs opacity-70">${escapeHtml(place)}</span>` : ''}
      ${line ? `<span class="block truncate text-xs ${LINE_CLASS[feed.state]}">${escapeHtml(line)}</span>` : ''}
    </span>
    <span class="flex flex-col items-end gap-1 shrink-0">
      <span class="flex gap-1">${roleChips(feed)}</span>
      ${ctx.index.hasDetail ? `<span class="text-[10px] uppercase opacity-60">${t('home.sources', { count })}</span>` : ''}
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
  const unplaced = feeds.reduce(
    (n, feed) => (feed.lat === undefined ? n + 1 : n),
    0
  );

  const count =
    t('home.matching', {
      count: feeds.length,
      n: `<span class="font-semibold">${formatCount(feeds.length)}</span>`,
    }) +
    (hidden > 0 ? t('home.firstShown', { count: shown.length }) : '') +
    (feeds.length > 1 && !ctx.near && !ctx.filters.q.trim()
      ? t('home.newestFirst')
      : '') +
    (feeds.length > 1 && ctx.near ? t('home.nearestFirst') : '') +
    (unplaced > 0
      ? ` <span class="opacity-60">${t('home.unplaced', { count: unplaced })}</span>`
      : '');

  const list =
    feeds.length === 0
      ? `<p class="text-base-content/50 text-sm text-center py-8">${t('home.noMatch')}</p>`
      : `<div class="rounded-box border border-base-300 bg-base-100">${shown.map((feed) => renderFeedRow(ctx, feed)).join('')}</div>` +
        (hidden > 0
          ? `<p class="text-xs text-center opacity-60 py-2">${t('home.more', { count: hidden })}</p>`
          : '');

  const near = ctx.near
    ? `<div><button type="button" class="badge badge-outline gap-1" data-action="clear-near" title="${t('home.clearNear')}">
         <span aria-hidden="true">x</span> ${t('home.near', { name: escapeHtml(ctx.near.name) })}
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
        ${auth ? `<span class="badge badge-sm badge-outline">${t('status.needsKey')}</span>` : ''}
      </div>
      ${first ? `<div class="text-xs break-all">${externalLink(first)}</div>` : ''}
      ${
        rest.length > 0
          ? `<details class="text-xs" data-detail="${role}-alt"><summary class="cursor-pointer opacity-60">${t('feed.moreUrls', { count: rest.length })}</summary>
               <ul class="mt-1 flex flex-col gap-1 break-all">${rest.map((url) => `<li>${externalLink(url)}</li>`).join('')}</ul>
             </details>`
          : ''
      }
    </div>`;
}

/** A realtime row's roles, one chip per URL it lists, in its row's state. */
function rowRoleChips(row: SourceRow, state: RoleState): string {
  return ROW_URL_FIELDS.filter(
    ([key, role]) => role !== 'scheduled' && row[key]
  )
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
    ? t('feed.catalogSources', { count: members.length })
    : t('feed.catalogSourcesPending');
  const content = feed.content;
  const contentBad = content !== undefined && content.state !== 'ok';

  const buttons = [
    edit
      ? `<a class="btn btn-sm btn-primary" href="${escapeHtml(edit)}" target="_blank" rel="noopener noreferrer">${t('feed.openEditor')}</a>`
      : '',
    view
      ? `<a class="btn btn-sm btn-secondary" href="${escapeHtml(view)}" target="_blank" rel="noopener noreferrer">${t('feed.openViewer')}</a>`
      : '',
  ].join('');

  return `
    ${feed.subtitle ? `<p class="text-sm opacity-70">${escapeHtml(feed.subtitle)}</p>` : ''}
    <div class="flex flex-wrap items-center gap-2">
      ${feedStateBadge(feed.state, feed.since, 'md')}
      ${roleChips(feed, 'sm')}
      ${line ? `<span class="text-sm ${LINE_CLASS[feed.state]}">${escapeHtml(line)}</span>` : ''}
      ${feed.state === 'up' && feed.since ? `<span class="text-sm opacity-70">${t('status.upSince', { date: formatDate(feed.since) })}</span>` : ''}
      ${contentBad ? `<span class="badge badge-warning">${escapeHtml(contentLine(content))}</span>` : ''}
    </div>
    ${buttons ? `<div class="flex flex-wrap gap-2">${buttons}</div>` : ''}
    <table class="table table-sm">
      <tbody>
        ${field('place', place ? escapeHtml(place) : unplacedNote())}
        ${field('altNames', escapeHtml(feed.altNames.join(', ')))}
        ${field('scheduleSize', feed.staticBytes !== undefined ? formatBytes(feed.staticBytes) : '')}
        ${field('lastModified', formatDate(feed.lastModified))}
        ${content ? field('scheduleContents', t('feed.contentSince', { content: escapeHtml(contentLine(content)), date: formatDate(content.since) })) : ''}
        ${field('service', content?.serviceStart && content.serviceEnd ? t('feed.serviceRange', { start: formatDate(content.serviceStart), end: formatDate(content.serviceEnd) }) : '')}
        ${field('publisher', escapeHtml(content?.publisher ?? ''))}
        ${field('version', escapeHtml(content?.version ?? ''))}
        ${field('contents', content?.routes !== undefined ? t('feed.contents', { routes: content.routes, stops: content.stops ?? 0, trips: content.trips ?? 0 }) : '')}
        ${field('feedId', `<code>${escapeHtml(feed.feedId)}</code>`)}
      </tbody>
    </table>
    <section>
      <h3 class="text-xs uppercase tracking-wide opacity-50 mb-1">${t('feed.roles')}</h3>
      ${roles.map((role) => renderRole(feed, role)).join('')}
    </section>
    <section>
      <h3 class="text-xs uppercase tracking-wide opacity-50 mb-1">
        ${sources} (${guideLink('merging', t('feed.howMerged'))})
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
    return typeof url === 'string'
      ? labeledRow(ROLE_LABELS[role], externalLink(url))
      : '';
  }).join('');

  // gtfs-zone-feed-catalog only sets final_url when it differs from the URL checked.
  const redirect = entry?.final_url
    ? field(
        'redirectsTo',
        `${externalLink(entry.final_url)}<div class="text-xs opacity-60">${t('source.redirect')}</div>`
      )
    : '';

  const same = (row.same_endpoint_as ?? [])
    .map((id) => {
      const other = ctx.index.row(id);
      if (!other) {
        return `<code>${escapeHtml(id)}</code>`;
      }
      const label = `${other.name || other.feedId} (${CATALOG_LABELS[other.catalog] ?? other.catalog})`;
      return navLink(
        ctx,
        { type: 'source', source: id },
        escapeHtml(label),
        'link'
      );
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
        ${field('operator', escapeHtml(row.operator_name))}
        ${field('place', place ? escapeHtml(place) : unplacedNote())}
        ${field('catalogId', catalogId(row))}
        ${field('from', escapeHtml(row.source))}
        ${field('catalogStatus', escapeHtml(row.feed_status ?? ''))}
        ${field('license', row.license_url ? externalLink(row.license_url) : '')}
        ${field('sameEndpoint', same)}
      </tbody>
    </table>
    <section>
      <h3 class="text-xs uppercase tracking-wide opacity-50 mb-1">${t('source.urls')}</h3>
      <table class="table table-sm"><tbody>${urls}${redirect}</tbody></table>
    </section>
    <section>
      <h3 class="text-xs uppercase tracking-wide opacity-50 mb-1">${t('source.lastCheck')}</h3>
      <table class="table table-sm">
        <tbody>
          ${field('state', stateBadge(state, 'badge-sm'), STATE_FIELD_LABEL)}
          ${field('httpStatus', entry?.code ? String(entry.code) : '')}
          ${field('error', escapeHtml(entry?.error ?? ''))}
          ${field('latency', entry?.latency_ms !== undefined ? formatMs(entry.latency_ms) : '')}
          ${field('failures', entry?.failures ? formatCount(entry.failures) : '')}
          ${field(state === 'down' ? 'downSince' : 'stateSince', formatDate(entry?.since))}
          ${field('access', row.auth ? t('status.needsKey') : '')}
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
export function placeFor(
  index: CatalogueIndex,
  state: PageState
): Feed | SourceRow | null {
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
