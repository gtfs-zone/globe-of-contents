// Rewrites a /feed/<id> path to its hash; must run before the shell mounts.
import './boot-path';
// Mounts the shell markup; must stay the first import after boot-path.
import './shell';
import { renderAutoZoomControl, syncAutoZoomControl, wireAutoZoomControl } from 'gtfs-zone-web-common/map/auto-zoom';
import { searchPlaces } from 'gtfs-zone-web-common/map/place-search';
import type { PlacePayload } from 'gtfs-zone-web-common/map/place-search';
import { BottomSheetController } from 'gtfs-zone-web-common/ui/bottom-sheet';
import { pageTitle } from 'gtfs-zone-web-common/ui/breadcrumb-trail';
import { setHelpPages, showHelpModal } from 'gtfs-zone-web-common/ui/help-modal';
import { renderDockIcons, renderNavbarActions } from 'gtfs-zone-web-common/ui/navbar-actions';
import { notify } from 'gtfs-zone-web-common/ui/notification-system';
import { PanelHost } from 'gtfs-zone-web-common/ui/panel-host';
import { PanelResizer, restorePanelWidth } from 'gtfs-zone-web-common/ui/panel-resizer';
import { feedProgressIndicator } from 'gtfs-zone-web-common/ui/progress-indicator';
import { SearchController } from 'gtfs-zone-web-common/ui/search-controller';
import { ThemeController } from 'gtfs-zone-web-common/ui/theme-controller';
import { escapeHtml } from 'gtfs-zone-web-common/util/escape-html';
import { initFieldTooltipPortal } from 'gtfs-zone-web-common/util/tooltip-position';
import { CONFIG } from './config';
import type { CoreCatalogue, DetailCatalogue, Feed, State } from './data/artifacts';
import { CatalogueIndex, loadCore, loadDetail } from './data/artifacts';
import { AppState } from './modules/app-state';
import type { Filters, Near } from './modules/filters';
import { FeedFilter, filterParams, readFilters, saveFilters, sameFilters } from './modules/filters';
import { HELP_GROUP_ORDER, HELP_PAGES, setHelpVersion } from './modules/help-pages';
import { formatBytes, formatDate } from './modules/labels';
import { GlobeMap } from './modules/map-view';
import { DOCK_ICONS, NAVBAR_ACTIONS } from './modules/navbar-action-list';
import { placeFor, renderPage, validateState } from './modules/pages';
import { SearchEntries } from './modules/search-entries';
import type { SearchPayload } from './modules/search-entries';
import type { PageState } from './types/page-state';
import { pageFromParams } from './types/page-state';

// ─── Shell ────────────────────────────────────────────────────────────────────

// The render replaces the container's contents, so every navbar listener binds
// after this call.
renderNavbarActions(document.getElementById('navbar-actions')!, NAVBAR_ACTIONS);
renderDockIcons(DOCK_ICONS);
document.getElementById('app-version')!.textContent = `v${__APP_VERSION__}`;

const appContainer = document.querySelector<HTMLElement>('.app-container')!;
restorePanelWidth(appContainer);

notify.initialize();
initFieldTooltipPortal();
const themeController = new ThemeController();
themeController.initialize();

setHelpVersion(__APP_VERSION__);
setHelpPages(HELP_PAGES, HELP_GROUP_ORDER);
document.getElementById('help-btn')!.addEventListener('click', () => void showHelpModal());

const map = new GlobeMap('map', (feedId) => appState.setFocus({ type: 'feed', feed: feedId }));
map.onEmptyClick = () => appState.clearFocus();
themeController.onThemeChange(() => map.onThemeChange());
new PanelResizer(appContainer, map);

document.getElementById('auto-zoom-mount')!.innerHTML = renderAutoZoomControl();
syncAutoZoomControl(map.getAutoZoom().isEnabled());
wireAutoZoomControl(map.getAutoZoom());

// Browse snaps the sheet open over the map; Guide opens its modal and leaves
// the sheet where it is.
const bottomSheet = new BottomSheetController(document.getElementById('right-panel')!, [
  { id: 'dock-browse' },
  { id: 'dock-guide', snap: null, onSelect: () => void showHelpModal() },
]);
// On a phone the sheet covers the bottom of the map, so the camera holds the
// focused feed above it.
bottomSheet.onSnapChange((covered) => map.setBottomPadding(covered));

// ─── State ────────────────────────────────────────────────────────────────────

let index: CatalogueIndex | null = null;
let feedFilter: FeedFilter | null = null;
let searchEntries: SearchEntries | null = null;
let filters: Filters = readFilters(window.location.hash.slice(1), true);
let filtered: Feed[] = [];
// A picked place Home is sorted by distance from; kept out of the hash.
let near: Near | null = null;
let detailFailed = false;
// Settles, never rejects, once the current detail fetch lands or fails.
let detailSettled: Promise<void> = Promise.resolve();

const panelContent = document.getElementById('panel-content')!;
const panel = new PanelHost<PageState>(panelContent, {
  navigate: (state) => appState.setFocus(state),
  href: (state) => appState.hrefFor(state),
  renderPage: (state) =>
    index ? renderPage({ index, filtered, filters, href: (s) => appState.hrefFor(s), detailFailed, near }, state) : '',
  action: (action, arg) => {
    if (action === 'guide') {
      void showHelpModal(arg || undefined);
    } else if (action === 'status') {
      setFilters({ status: arg ? [arg as State] : [] });
    } else if (action === 'rt') {
      setFilters({ rt: !filters.rt });
    } else if (action === 'detail-retry') {
      startDetail();
    } else if (action === 'clear-near') {
      near = null;
      map.clearPlace();
      applyFilters();
    }
  },
});
panel.initialize();

// Not read from document.title: on a /feed/ path nginx serves the feed's title.
const DEFAULT_TITLE = 'list.gtfs.zone - Every public GTFS feed';

const appState = new AppState({
  onStateChange: () => {},
  onFocusChange: (state) => {
    if (!index) {
      return;
    }
    document.title = state.type === 'home' ? DEFAULT_TITLE : pageTitle(appState.breadcrumbs, 'list.gtfs.zone');
    panel.show(state, appState.breadcrumbs);
    if (state.type !== 'home') {
      bottomSheet.open('half');
    }
    // After the sheet moves, so the camera knows how much of the map is covered.
    map.select(placeFor(index, state));
  },
});
appState.pages.setFeedParams(filterParams(filters), false);

// ─── Filters ──────────────────────────────────────────────────────────────────

const searchInput = document.getElementById('map-search') as HTMLInputElement;

function syncControls(): void {
  if (searchInput.value !== filters.q) {
    searchInput.value = filters.q;
  }
}

/** Re-run the filters over the catalogue and repaint everything they drive. */
function applyFilters(): void {
  if (!feedFilter) {
    return;
  }
  filtered = feedFilter.apply(filters, near);
  map.setFeeds(filtered);
  const focus = appState.focus;
  if (focus.type === 'home') {
    panel.show(focus, appState.breadcrumbs);
  }
}

function setFilters(next: Partial<Filters>): void {
  filters = { ...filters, ...next };
  saveFilters(filters);
  appState.setFilterParams(filterParams(filters));
  syncControls();
  applyFilters();
}

let filterTimer: ReturnType<typeof setTimeout> | null = null;
searchInput.addEventListener('input', () => {
  if (filterTimer !== null) {
    clearTimeout(filterTimer);
  }
  filterTimer = setTimeout(() => {
    filterTimer = null;
    setFilters({ q: searchInput.value });
  }, CONFIG.FILTER_DEBOUNCE_MS);
});

// Back/forward, or a pasted hash. The page half is the manager's; this picks
// up the filter half, which only a Home hash carries.
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  if (pageFromParams(new URLSearchParams(hash)).type !== 'home') {
    return;
  }
  const next = readFilters(hash);
  if (sameFilters(next, filters)) {
    return;
  }
  filters = next;
  appState.pages.setFeedParams(filterParams(filters), false);
  syncControls();
  applyFilters();
});

syncControls();

/** Ring the place, and list Home's feeds nearest it first. */
function pickPlace(place: PlacePayload): void {
  map.focusPlace(place);
  near = { name: place.name, lon: place.lon, lat: place.lat };
  applyFilters();
  if (appState.focus.type !== 'home') {
    appState.setFocus({ type: 'home' });
  }
}

// Picking a feed is the same event as clicking it on the map.
const searchController = new SearchController<SearchPayload>({
  getEntries: () => searchEntries?.build(filters) ?? [],
  getRemoteEntries: (query, signal) => searchPlaces(query, map.getCenter(), signal),
  onSelect: (payload) =>
    payload.kind === 'feed' ? appState.setFocus({ type: 'feed', feed: payload.feedId }) : pickPlace(payload),
  limit: CONFIG.SEARCH_LIMIT,
});
searchController.initialize();

// ─── Boot ─────────────────────────────────────────────────────────────────────

const pending = appState.pages.pendingStateFromURL();

/** Re-render a Feed or Source page in place, keeping its scroll. */
function refreshPanel(): void {
  if (appState.focus.type !== 'home') {
    panel.setBreadcrumbs(appState.breadcrumbs);
  }
}

function start(data: CoreCatalogue): void {
  index = new CatalogueIndex(data);
  feedFilter = new FeedFilter(index.feeds);
  searchEntries = new SearchEntries(index.feeds);
  appState.setIndex(index, () => detailSettled);

  document.getElementById('generated-at')!.textContent = `Checked ${formatDate(data.generatedAt)}`;

  filtered = feedFilter.apply(filters, near);
  map.setFeeds(filtered);

  // A Source link is adopted as-is; `onDetail` checks it once the rows are in.
  if (pending.type === 'feed' && !validateState(index, pending)) {
    notify.warning(`Nothing in this catalogue matches the linked ${pending.type}`);
    appState.adopt({ type: 'home' });
  } else {
    appState.adopt(pending);
  }
  appState.replaceHash();

  startDetail();
}

function onDetail(data: DetailCatalogue): void {
  index!.attachDetail(data);

  const focus = appState.focus;
  if (focus.type === 'home') {
    // Member counts on each row.
    panel.show(focus, appState.breadcrumbs);
    return;
  }
  if (focus.type === 'source') {
    if (!index!.row(focus.source)) {
      notify.warning('Nothing in this catalogue matches the linked source');
      appState.adopt({ type: 'home' });
      appState.replaceHash();
      return;
    }
    // Repaint the whole focus: the row's place and breadcrumbs were unknown.
    appState.repaint();
    return;
  }
  refreshPanel();
  // The feed's bounding box came with its full entry.
  map.select(placeFor(index!, focus));
}

/** Fetch the rows and their checks behind the painted map. */
function startDetail(): void {
  detailFailed = false;
  refreshPanel();
  detailSettled = loadDetail().then(onDetail, (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    detailFailed = true;
    notify.warning(`Could not load the catalog sources: ${message}`);
    refreshPanel();
  });
}

const LOAD_OP = 'catalogue';

/**
 * Drive the top bar from streamed bytes. With no comparable total, the bar
 * goes indeterminate and the status line counts bytes alone.
 */
function reportProgress(received: number, total: number | null): void {
  if (total) {
    feedProgressIndicator.updateProgress(
      LOAD_OP,
      Math.min(100, (received / total) * 100),
      `Loading the catalogue (${formatBytes(received)} of ${formatBytes(total)})`
    );
    return;
  }
  feedProgressIndicator.updateProgress(LOAD_OP, 0, `Loading the catalogue (${formatBytes(received)})`);
  document.querySelector('#global-loading-indicator .loading-progress')?.removeAttribute('value');
}

function boot(): void {
  feedProgressIndicator.startLoading(LOAD_OP, 'Loading the catalogue');
  loadCore(reportProgress)
    .then(start)
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      notify.error(`Could not load the catalogue: ${message}`);
      panelContent.innerHTML = `
        <div class="text-center py-8 flex flex-col items-center gap-3">
          <p class="text-sm text-error">The catalogue did not load.</p>
          <p class="text-xs opacity-60 max-w-xs">${escapeHtml(message)}</p>
          <button id="retry-load" class="btn btn-sm">Retry</button>
        </div>`;
      document.getElementById('retry-load')!.addEventListener('click', boot);
    })
    .finally(() => feedProgressIndicator.finishLoading(LOAD_OP));
}

boot();
