/**
 * Mounts the shared app shell and sets up its search box. Imported first by
 * `index.ts`, so the markup exists before any other module is evaluated and
 * looks up an element id.
 */

import { mountAppShell } from 'gtfs-zone-web-common/ui/app-shell';
import { t } from './i18n/messages';

const GENERATED_AT =
  '<span id="generated-at" class="text-xs opacity-60 hidden sm:inline"></span>';

mountAppShell({
  brandPrefix: 'list',
  brandSuffix: '.gtfs.zone',
  navbarExtra: GENERATED_AT,
  panelPlaceholder: t('shell.loading'),
  dock: [
    { id: 'dock-browse', label: t('shell.browse'), active: true },
    { id: 'dock-guide', label: t('shell.guide') },
  ],
});

const search = document.getElementById('map-search') as HTMLInputElement;
search.type = 'search';
search.placeholder = t('shell.search');
search.autocomplete = 'off';
