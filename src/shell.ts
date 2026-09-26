/**
 * Mounts the shared app shell and sets up its search box. Imported first by
 * `index.ts`, so the markup exists before any other module is evaluated and
 * looks up an element id.
 */

import { mountAppShell } from 'interlocking/ui/app-shell';

const GENERATED_AT = '<span id="generated-at" class="text-xs opacity-60 hidden sm:inline"></span>';

mountAppShell({
  brandPrefix: 'list',
  brandSuffix: '.gtfs.zone',
  navbarExtra: GENERATED_AT,
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
