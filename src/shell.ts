/**
 * Mounts the shared app shell, then adds this app's pieces to it: the filter
 * chips inside the search card and the unplaced count beside it. Imported
 * first by `index.ts`, so the markup exists before any other module is
 * evaluated and looks up an element id.
 */

import { mountAppShell } from 'interlocking/ui/app-shell';
import { STATES } from './data/artifacts';
import { STATE_LABELS } from './modules/labels';

// Always visible: much of the catalogue has no coordinates, and the map must
// not read as the whole of it. The slot wraps under the search card on a
// phone (see main.css) rather than squeezing it.
const UNPLACED_CARD = `
  <div id="unplaced-slot" class="ml-auto flex justify-end">
    <div id="unplaced-card" class="card card-bordered bg-base-100 shadow-lg px-3 py-2 text-xs pointer-events-auto hidden"></div>
  </div>`;

const GENERATED_AT = '<span id="generated-at" class="text-xs opacity-60 hidden sm:inline"></span>';

mountAppShell({
  brandPrefix: 'list',
  brandSuffix: '.gtfs.zone',
  navbarExtra: GENERATED_AT,
  mapControlsExtra: UNPLACED_CARD,
  panelPlaceholder: 'Loading the catalogue',
  dock: [
    { id: 'dock-browse', label: 'Browse', active: true },
    { id: 'dock-guide', label: 'Guide' },
  ],
});

const search = document.getElementById('map-search') as HTMLInputElement;
search.type = 'search';
search.placeholder = 'Search feeds, operators, places';
search.autocomplete = 'off';

// Status chips toggle independently; none pressed shows every state.
document.getElementById('map-search-card')!.insertAdjacentHTML(
  'beforeend',
  `<div id="filter-chips" class="flex flex-wrap items-center gap-1 mt-2">
    ${STATES.map(
      (state) =>
        `<button type="button" class="btn btn-xs" data-state="${state}" aria-pressed="false">${STATE_LABELS[state]}</button>`
    ).join('')}
    <label class="ml-auto flex items-center gap-1 text-xs cursor-pointer">
      <input type="checkbox" id="filter-rt" class="toggle toggle-xs" />
      Has realtime
    </label>
  </div>`
);
