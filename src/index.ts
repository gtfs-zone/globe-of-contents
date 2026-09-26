// Mounts the shell markup; must stay the first import.
import './shell';
import { renderAutoZoomControl, syncAutoZoomControl, wireAutoZoomControl } from 'interlocking/map/auto-zoom';
import { BottomSheetController } from 'interlocking/ui/bottom-sheet';
import { pageTitle } from 'interlocking/ui/breadcrumb-trail';
import { setHelpPages, showHelpModal } from 'interlocking/ui/help-modal';
import { renderDockIcons, renderNavbarActions } from 'interlocking/ui/navbar-actions';
import { notify } from 'interlocking/ui/notification-system';
import { PanelHost } from 'interlocking/ui/panel-host';
import { PanelResizer, restorePanelWidth } from 'interlocking/ui/panel-resizer';
import { feedProgressIndicator } from 'interlocking/ui/progress-indicator';
import { SearchController } from 'interlocking/ui/search-controller';
import { ThemeController } from 'interlocking/ui/theme-controller';
import { escapeHtml } from 'interlocking/util/escape-html';
import { CONFIG } from './config';
import type { Catalogue, Feed, State } from './data/artifacts';
import { CatalogueIndex, loadCatalogue } from './data/artifacts';
import { AppState } from './modules/app-state';
import type { Filters } from './modules/filters';
import { FeedFilter, buildHaystack, filterParams, readFilters, saveFilters, sameFilters } from './modules/filters';
import { HELP_GROUP_ORDER, HELP_PAGES, setHelpVersion } from './modules/help-pages';
import { formatBytes, formatDate } from './modules/labels';
import { GlobeMap } from './modules/map-view';
import { DOCK_ICONS, NAVBAR_ACTIONS } from './modules/navbar-action-list';
import { placeFor, renderPage, validateState } from './modules/pages';
import { SearchEntries } from './modules/search-entries';
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

const panelContent = document.getElementById('panel-content')!;
const panel = new PanelHost<PageState>(panelContent, {
  navigate: (state) => appState.setFocus(state),
  href: (state) => appState.hrefFor(state),
  renderPage: (state) =>
    index ? renderPage({ index, filtered, filters, href: (s) => appState.hrefFor(s) }, state) : '',
  action: (action, arg) => {
    if (action === 'guide') {
      void showHelpModal(arg || undefined);
    } else if (action === 'status') {
      setFilters({ status: arg ? [arg as State] : [] });
    } else if (action === 'rt') {
      setFilters({ rt: !filters.rt });
    }
  },
});
panel.initialize();

const DEFAULT_TITLE = document.title;

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
  filtered = feedFilter.apply(filters);
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

// Picking a result is the same event as clicking the feed on the map.
const searchController = new SearchController<string>({
  getEntries: () => searchEntries?.build(filters) ?? [],
  onSelect: (feedId) => appState.setFocus({ type: 'feed', feed: feedId }),
  limit: CONFIG.SEARCH_LIMIT,
});
searchController.initialize();

// ─── Boot ─────────────────────────────────────────────────────────────────────

const pending = appState.pages.pendingStateFromURL();

function start(data: Catalogue): void {
  index = new CatalogueIndex(data);
  const haystack = buildHaystack(index);
  feedFilter = new FeedFilter(index, haystack);
  searchEntries = new SearchEntries(index, haystack);
  appState.setIndex(index);

  document.getElementById('generated-at')!.textContent = `Checked ${formatDate(data.generatedAt)}`;

  filtered = feedFilter.apply(filters);
  map.setFeeds(filtered);

  if (pending.type !== 'home' && !validateState(index, pending)) {
    notify.warning(`Nothing in this catalogue matches the linked ${pending.type}`);
    appState.adopt({ type: 'home' });
  } else {
    appState.adopt(pending);
  }
  appState.replaceHash();
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
  loadCatalogue(reportProgress)
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
