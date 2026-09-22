import { renderAutoZoomControl, syncAutoZoomControl, wireAutoZoomControl } from 'interlocking/map/auto-zoom';
import { renderNavbarActions } from 'interlocking/ui/navbar-actions';
import { notify } from 'interlocking/ui/notification-system';
import { feedProgressIndicator } from 'interlocking/ui/progress-indicator';
import { ThemeController } from 'interlocking/ui/theme-controller';
import { escapeHtml } from 'interlocking/util/escape-html';
import { CONFIG } from './config';
import type { Catalogue, SourceRow } from './data/artifacts';
import { loadCatalogue } from './data/artifacts';
import { EMPTY_FILTERS, RowFilter, readHash, writeHash } from './modules/filters';
import type { Filters, HashState } from './modules/filters';
import { CATALOG_LABELS, KIND_LABELS, STATE_LABELS, formatCount, formatDate } from './modules/labels';
import { ListView } from './modules/list-view';
import { GlobeMap } from './modules/map-view';
import { NAVBAR_ACTIONS } from './modules/navbar-action-list';
import { showSourceDetail } from './modules/source-detail';

// ─── Shell ────────────────────────────────────────────────────────────────────

// The render replaces the container's contents, so every navbar listener binds
// after this call.
renderNavbarActions(document.getElementById('navbar-actions')!, NAVBAR_ACTIONS);
document.getElementById('app-version')!.textContent = `v${__APP_VERSION__}`;

notify.initialize();
const themeController = new ThemeController();
themeController.initialize();

const map = new GlobeMap('map', (rowId) => openSource(rowId));
themeController.onThemeChange(() => map.onThemeChange());

document.getElementById('auto-zoom-mount')!.innerHTML = renderAutoZoomControl();
syncAutoZoomControl(map.getAutoZoom().isEnabled());
wireAutoZoomControl(map.getAutoZoom());

const listEl = document.getElementById('source-list')!;
const list = new ListView(listEl, document.getElementById('list-count')!, (rowId) => openSource(rowId));

const inputs = {
  q: document.getElementById('filter-q') as HTMLInputElement,
  catalog: document.getElementById('filter-catalog') as HTMLSelectElement,
  state: document.getElementById('filter-state') as HTMLSelectElement,
  kind: document.getElementById('filter-kind') as HTMLSelectElement,
  country: document.getElementById('filter-country') as HTMLSelectElement,
};

// ─── State ────────────────────────────────────────────────────────────────────

let catalogue: Catalogue | null = null;
let rowFilter: RowFilter | null = null;
let byId = new Map<string, SourceRow>();
let current: HashState = readHash();
// The row whose modal is open, so a hash write of the same row does not stack
// a second copy of it.
let openRowId: string | null = null;

function refresh(): void {
  if (!catalogue || !rowFilter) {
    return;
  }
  const rows = rowFilter.apply(current.filters);
  list.render(rows, current.source);
  map.setRows(rows, catalogue.status);
  renderUnplaced(rows);
}

function renderUnplaced(rows: SourceRow[]): void {
  const card = document.getElementById('unplaced-card')!;
  const unplaced = rows.reduce((n, row) => (row.lat === undefined ? n + 1 : n), 0);
  card.classList.toggle('hidden', rows.length === 0);
  card.innerHTML =
    `<span class="font-semibold">${formatCount(rows.length - unplaced)}</span> on the map, ` +
    `<span class="font-semibold">${formatCount(unplaced)}</span> with no coordinates ` +
    '<span class="opacity-60">(list only)</span>';
}

function setFilters(next: Partial<Filters>): void {
  current = { ...current, filters: { ...current.filters, ...next } };
  writeHash(current);
  refresh();
}

function openSource(rowId: string): void {
  if (!catalogue || openRowId === rowId) {
    return;
  }
  const row = byId.get(rowId);
  if (!row) {
    notify.warning(`No source ${rowId} in this catalogue`);
    return;
  }
  current = { ...current, source: rowId };
  writeHash(current);
  map.select(row);
  refresh();

  openRowId = rowId;
  void showSourceDetail(row, catalogue.status, byId, (next) => openSource(next)).then(() => {
    // A cross-link closes this modal and opens another; only clear the
    // selection if nothing replaced it in between.
    if (openRowId === rowId) {
      openRowId = null;
    }
    if (current.source === rowId) {
      current = { ...current, source: null };
      writeHash(current);
      map.select(null);
      refresh();
    }
  });
}

// ─── Filters ──────────────────────────────────────────────────────────────────

function options(all: string, entries: [string, string, number][]): string {
  return (
    `<option value="">${all}</option>` +
    entries
      .map(
        ([value, label, count]) =>
          `<option value="${escapeHtml(value)}">${escapeHtml(label)} (${formatCount(count)})</option>`
      )
      .join('')
  );
}

function tally(rows: SourceRow[], key: (row: SourceRow) => string | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = key(row);
    if (value) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

function fillFilterOptions(data: Catalogue): void {
  const { summary, sources } = data;
  const fromSummary = (counts: Record<string, number>, labels: Record<string, string>) =>
    Object.entries(counts).map(([value, count]): [string, string, number] => [value, labels[value] ?? value, count]);

  inputs.catalog.innerHTML = options('All catalogs', fromSummary(summary.by_catalog, CATALOG_LABELS));
  inputs.state.innerHTML = options('Any status', fromSummary(summary.by_state, STATE_LABELS));
  inputs.kind.innerHTML = options('Schedule and realtime', fromSummary(summary.by_kind, KIND_LABELS));

  const names = new Map<string, string>();
  for (const row of sources) {
    if (row.country_code && row.country && !names.has(row.country_code)) {
      names.set(row.country_code, row.country);
    }
  }
  const countries = [...tally(sources, (row) => row.country_code)]
    .map(([code, count]): [string, string, number] => [code, names.get(code) ?? code, count])
    .sort((a, b) => a[1].localeCompare(b[1]));
  inputs.country.innerHTML = options('All countries', countries);
}

function syncInputs(filters: Filters): void {
  for (const key of Object.keys(EMPTY_FILTERS) as (keyof Filters)[]) {
    if (inputs[key].value !== filters[key]) {
      inputs[key].value = filters[key];
    }
  }
}

let filterTimer: ReturnType<typeof setTimeout> | null = null;
inputs.q.addEventListener('input', () => {
  if (filterTimer !== null) {
    clearTimeout(filterTimer);
  }
  filterTimer = setTimeout(() => {
    filterTimer = null;
    setFilters({ q: inputs.q.value });
  }, CONFIG.FILTER_DEBOUNCE_MS);
});
for (const key of ['catalog', 'state', 'kind', 'country'] as const) {
  inputs[key].addEventListener('change', () => setFilters({ [key]: inputs[key].value }));
}

// A hand-edited or pasted hash.
window.addEventListener('hashchange', () => {
  current = readHash();
  syncInputs(current.filters);
  refresh();
  if (current.source) {
    openSource(current.source);
  }
});

// ─── Summary ──────────────────────────────────────────────────────────────────

function renderSummary(data: Catalogue): void {
  const { summary } = data;
  const stat = (label: string, value: number, cls: string, state: string) => `
    <button type="button" class="stat py-2 px-3 place-items-center" data-state="${state}">
      <div class="stat-title text-xs">${label}</div>
      <div class="stat-value text-lg ${cls}">${formatCount(value)}</div>
    </button>`;
  const el = document.getElementById('summary')!;
  el.innerHTML =
    stat('Sources', summary.total, '', '') +
    stat('Up', summary.by_state.up ?? 0, 'text-success', 'up') +
    stat('Down', summary.by_state.down ?? 0, 'text-error', 'down') +
    stat('Not checked', summary.by_state.unknown ?? 0, 'opacity-60', 'unknown');
  el.querySelectorAll<HTMLElement>('[data-state]').forEach((button) => {
    button.addEventListener('click', () => {
      const state = button.dataset.state ?? '';
      inputs.state.value = state;
      setFilters({ state });
    });
  });

  document.getElementById('generated-at')!.textContent = `Checked ${formatDate(data.generatedAt)}`;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

function start(data: Catalogue): void {
  const sources = [...data.sources].sort((a, b) => (a.name || a.feedId).localeCompare(b.name || b.feedId));
  catalogue = { ...data, sources };
  byId = new Map(sources.map((row) => [row.rowId, row]));
  rowFilter = new RowFilter(sources, data.status);
  list.setStatus(data.status);

  fillFilterOptions(catalogue);
  renderSummary(catalogue);
  syncInputs(current.filters);
  refresh();

  if (current.source) {
    openSource(current.source);
  }
}

function boot(): void {
  feedProgressIndicator.startLoading('catalogue', 'Loading the catalogue');
  loadCatalogue()
    .then(start)
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      notify.error(`Could not load the catalogue: ${message}`);
      listEl.innerHTML = `
        <div class="text-center py-8 flex flex-col items-center gap-3">
          <p class="text-sm text-error">The catalogue did not load.</p>
          <p class="text-xs opacity-60 max-w-xs">${escapeHtml(message)}</p>
          <button id="retry-load" class="btn btn-sm">Retry</button>
        </div>`;
      document.getElementById('retry-load')!.addEventListener('click', boot);
    })
    .finally(() => feedProgressIndicator.finishLoading('catalogue'));
}

boot();
